/**
 * Craft-verification batch — 5 topics deliberately chosen to span very
 * different content types so we can see if the system produces structurally
 * DIFFERENT compositions for each. The risk after marking the Sugar
 * before/after as a top-tier winner is the system copies the before/after
 * layout to other topics. The reframed prompt should prevent this.
 *
 * Each of these 5 topics needs a different visual approach:
 *   - Mongol Empire: historical / dramatic / one massive figure or map
 *   - SR-71 Blackbird: aviation / single hero photo of the plane
 *   - Octopus camouflage: nature / dramatic close-up of the animal
 *   - Cancer cells: science / microscope visual / scientific imagery
 *   - Iceland volcano live: news / live action / lava and chaos
 *
 * If any of these come out as a before/after split, the prompt failed.
 * If each one looks structurally distinct, the prompt worked.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "How Genghis Khan Built The Largest Empire In History", niche: "history", tone: "epic", slug: "genghis" },
  { title: "Why The SR-71 Blackbird Is Still The Fastest Plane Ever Built", niche: "tech", tone: "dramatic", slug: "sr71" },
  { title: "How Octopuses Become Invisible In Seconds", niche: "nature", tone: "wondrous", slug: "octopus-camo" },
  { title: "What Cancer Cells Actually Look Like Under A Microscope", niche: "science", tone: "investigative", slug: "cancer" },
  { title: "Iceland's Volcano Has Been Erupting For 18 Months Straight", niche: "nature", tone: "documentary", slug: "iceland" },
];

const BASE = '/opt/videoforge/output/v3-craft';
if (fs.existsSync(BASE)) fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

const results = [];

try {
  for (const t of TOPICS) {
    const outDir = path.join(BASE, t.slug);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`\n${'═'.repeat(70)}\n  ${t.slug}: ${t.title}\n${'═'.repeat(70)}`);
    const start = Date.now();
    let script = '', scriptWords = 0;

    try {
      console.log('\n--- Generating script ---');
      const r = await generateScript(t.title, { duration: '5', tone: t.tone, niche: t.niche, output: outDir });
      script = fs.readFileSync(r.scriptPath, 'utf-8');
      scriptWords = r.wordCount;
      console.log(`  Script: ${scriptWords} words`);
    } catch (e) {
      results.push({ slug: t.slug, title: t.title, error: 'script: ' + e.message });
      continue;
    }

    try {
      await generateThumbnailV3({ outputDir: outDir, title: t.title, scriptText: script, niche: t.niche, tone: t.tone });
      let review = null, plan = null;
      try { review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-review.json'), 'utf-8')); } catch (e) {}
      try { plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-plan.json'), 'utf-8')); } catch (e) {}
      const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
      results.push({
        slug: t.slug, title: t.title, niche: t.niche, scriptWords, attempts,
        elapsed: ((Date.now() - start) / 1000).toFixed(0),
        primary_subject: plan?.primary_subject || 'unknown',
        hook: plan?.hook_text || 'unknown',
        critic: review?.rating ?? null,
        designer_verdict: review?.designer_verdict || null,
      });
    } catch (e) {
      console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
      results.push({ slug: t.slug, title: t.title, error: 'thumbnail: ' + e.message });
    }
  }
} finally {
  await closeBrowser();
}

console.log(`\n${'═'.repeat(70)}\n  CRAFT VERIFICATION BATCH SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-craft";
for (const r of results) {
  if (r.error) {
    console.log(`\n  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    subject:  ${r.primary_subject}`);
  console.log(`    hook:     ${r.hook}`);
  console.log(`    attempts: ${r.attempts}`);
  console.log(`    critic:   ${r.critic}/10`);
  if (r.designer_verdict) console.log(`    verdict:  "${r.designer_verdict}"`);
  console.log(`    elapsed:  ${r.elapsed}s`);
  console.log(`    URL:      ${baseUrl}/${r.slug}/thumbnail-v3.png`);
}

const successful = results.filter(r => !r.error);
const avg = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
const passing = successful.filter(r => (r.critic || 0) >= 7).length;
console.log(`\n  Avg critic: ${avg.toFixed(1)}/10`);
console.log(`  Passing (>=7): ${passing}/${successful.length}`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ results, average: avg, passing }, null, 2));
process.exit(0);
