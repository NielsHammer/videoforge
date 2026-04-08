/**
 * End-to-end thumbnail batch test.
 *
 * For each topic: generate a real script via generateScript(), read it back,
 * then feed the FULL SCRIPT TEXT into generateThumbnailV2. This is how live
 * orders actually work — the previous test was passing scriptText="" which
 * starved the planner of facts and produced generic dramatic words.
 *
 * Niels feedback after the isolated batch: "those 2 are pretty bad both of
 * them, none of them have human designer input and they dont make sense, to
 * really test thumbnails remember to generate a proper title, some of the
 * script etc."
 *
 * This script does that. Output goes to /opt/videoforge/output/batch-e2e.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "Why Yellowstone Could Erupt Sooner Than Anyone Admits", niche: "science", tone: "dramatic" },
  { title: "The Day Bernie Madoff's Ponzi Scheme Finally Collapsed", niche: "finance", tone: "documentary" },
  { title: "What's Actually Inside The Marianas Trench", niche: "science", tone: "mysterious" },
  { title: "The Hidden Cost Of Eating One Avocado Every Day", niche: "health", tone: "investigative" },
  { title: "How North Korea Stole 1.5 Billion Dollars Without Touching A Bank", niche: "tech", tone: "thriller" },
];

const BASE = '/opt/videoforge/output/batch-e2e';
if (fs.existsSync(BASE)) fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

// AI image generation is the PRIMARY path per Niels: "we usually dont need
// pexels, we prefer ai generated because we can hit it spot on." Stock photos
// are only for "real things, real people, real places" (e.g. Barcelona for
// a travel video). Force-real-photo is only enabled if the env var is set
// explicitly — by default we use AI (Recraft → Flux → Pexels fallback).
// fal.ai is back up as of this session.

const results = [];

for (let i = 0; i < TOPICS.length; i++) {
  const t = TOPICS[i];
  const slug = `topic-${i + 1}`;
  const outDir = path.join(BASE, slug);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n${'═'.repeat(70)}\n  TOPIC ${i + 1}/${TOPICS.length}: ${t.title}\n${'═'.repeat(70)}`);

  let script = "";
  let scriptWords = 0;
  const start = Date.now();

  // Step 1: Generate a real script (5 min duration to keep test fast)
  try {
    console.log("\n--- Generating script ---");
    const scriptResult = await generateScript(t.title, {
      duration: "5",
      tone: t.tone,
      niche: t.niche,
      output: outDir,
    });
    script = fs.readFileSync(scriptResult.scriptPath, "utf-8");
    scriptWords = scriptResult.wordCount;
    console.log(`  Script: ${scriptWords} words at ${scriptResult.scriptPath}`);
  } catch (e) {
    console.error(`  ✗ Script gen failed: ${e.message}`);
    results.push({ slug, title: t.title, error: "script: " + e.message });
    continue;
  }

  // Step 2: Generate the thumbnail with the real script as context
  try {
    const png = await generateThumbnailV2(outDir, t.title, t.title, script, t.niche, t.tone);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    let review = null;
    try { review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v2-review.json'), 'utf-8')); } catch (e) {}
    let plan = null;
    try { plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v2-plan.json'), 'utf-8')); } catch (e) {}
    const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
    results.push({
      slug, title: t.title, niche: t.niche, png, elapsed, scriptWords,
      attempts,
      archetype: plan?.archetype || 'unknown',
      primary_subject: plan?.primary_subject || 'unknown',
      hook: (plan?.elements || []).filter(e => e.type === 'text').map(e => e.content).join(' / '),
      critic: review?.rating ?? null,
      structural_hint: review?.structural_score ?? null,
      designer_verdict: review?.designer_verdict || null,
      problems: review?.problems || [],
    });
  } catch (e) {
    console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
    results.push({ slug, title: t.title, error: "thumbnail: " + e.message });
  }
}

console.log(`\n${'═'.repeat(70)}\n  END-TO-END BATCH SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/batch-e2e";
for (const r of results) {
  if (r.error) {
    console.log(`  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    archetype:  ${r.archetype}`);
  console.log(`    subject:    ${r.primary_subject}`);
  console.log(`    hook:       ${r.hook}`);
  console.log(`    script:     ${r.scriptWords} words`);
  console.log(`    attempts:   ${r.attempts}`);
  console.log(`    critic:     ${r.critic}/10`);
  console.log(`    structural: ${r.structural_hint}/10 (hint only)`);
  if (r.designer_verdict) console.log(`    verdict:    "${r.designer_verdict}"`);
  console.log(`    elapsed:    ${r.elapsed}s`);
  console.log(`    URL:        ${baseUrl}/${r.slug}/thumbnail-v2.png`);
}

const successful = results.filter(r => !r.error);
const avgCritic = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
const passing = successful.filter(r => (r.critic || 0) >= 8).length;
console.log(`\n  ── Averages across ${successful.length} successful generations ──`);
console.log(`    avg critic:     ${avgCritic.toFixed(1)}/10`);
console.log(`    passing (>=8):  ${passing}/${successful.length}`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ topics: TOPICS, results, averages: { critic: avgCritic, passing } }, null, 2));
console.log(`\n  Summary saved: ${path.join(BASE, 'batch-summary.json')}`);
process.exit(0);
