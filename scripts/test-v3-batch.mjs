/**
 * Five-topic v3 batch — full pipeline title -> script -> Claude HTML/CSS
 * -> AI image generation -> headless Chrome render -> harsh critic.
 * Uses the same 5 topics as previous batches for apples-to-apples
 * comparison against v2.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
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

const BASE = '/opt/videoforge/output/v3-batch';
if (fs.existsSync(BASE)) fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

const results = [];

try {
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i];
    const slug = `topic-${i + 1}`;
    const outDir = path.join(BASE, slug);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`\n${'═'.repeat(70)}\n  TOPIC ${i + 1}/${TOPICS.length}: ${t.title}\n${'═'.repeat(70)}`);

    let script = '';
    let scriptWords = 0;
    const start = Date.now();

    try {
      console.log('\n--- Generating 5-min script ---');
      const scriptResult = await generateScript(t.title, {
        duration: '5',
        tone: t.tone,
        niche: t.niche,
        output: outDir,
      });
      script = fs.readFileSync(scriptResult.scriptPath, 'utf-8');
      scriptWords = scriptResult.wordCount;
      console.log(`  Script: ${scriptWords} words`);
    } catch (e) {
      console.error(`  ✗ Script gen failed: ${e.message}`);
      results.push({ slug, title: t.title, error: 'script: ' + e.message });
      continue;
    }

    try {
      await generateThumbnailV3({
        outputDir: outDir,
        title: t.title,
        scriptText: script,
        niche: t.niche,
        tone: t.tone,
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      let review = null, plan = null;
      try { review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-review.json'), 'utf-8')); } catch (e) {}
      try { plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-plan.json'), 'utf-8')); } catch (e) {}
      const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
      results.push({
        slug, title: t.title, niche: t.niche, elapsed, scriptWords, attempts,
        primary_subject: plan?.primary_subject || 'unknown',
        hook: plan?.hook_text || 'unknown',
        critic: review?.rating ?? null,
        designer_verdict: review?.designer_verdict || null,
      });
    } catch (e) {
      console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
      console.error(e.stack);
      results.push({ slug, title: t.title, error: 'thumbnail: ' + e.message });
    }
  }
} finally {
  await closeBrowser();
}

console.log(`\n${'═'.repeat(70)}\n  V3 BATCH SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-batch";
for (const r of results) {
  if (r.error) {
    console.log(`  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    subject:  ${r.primary_subject}`);
  console.log(`    hook:     ${r.hook}`);
  console.log(`    script:   ${r.scriptWords} words`);
  console.log(`    attempts: ${r.attempts}`);
  console.log(`    critic:   ${r.critic}/10`);
  if (r.designer_verdict) console.log(`    verdict:  "${r.designer_verdict}"`);
  console.log(`    elapsed:  ${r.elapsed}s`);
  console.log(`    URL:      ${baseUrl}/${r.slug}/thumbnail-v3.png`);
}

const successful = results.filter(r => !r.error);
const avg = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
const passing = successful.filter(r => (r.critic || 0) >= 8).length;
console.log(`\n  Averages across ${successful.length} successful generations:`);
console.log(`    avg critic:    ${avg.toFixed(1)}/10`);
console.log(`    passing (>=8): ${passing}/${successful.length}`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ results, average: avg, passing }, null, 2));
console.log(`\n  Summary: ${path.join(BASE, 'batch-summary.json')}`);
process.exit(0);
