/**
 * v3 batch with the STRIPPED prompt + pool vision attachments + spell check
 * + recalibrated critic. 5 fresh topics the system has never seen.
 *
 * Goal: prove the system stops converging on the left-text-right-image template
 * and produces compositions designed for THIS specific content (per Niels's
 * direction: full-bleed hero + minimal text is what wins).
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "The Ant Colony That Built A Skyscraper Underground", niche: "nature", tone: "wondrous", slug: "ants" },
  { title: "Why Concorde Was Banned After Its Last Flight", niche: "history", tone: "documentary", slug: "concorde" },
  { title: "How One Man Saved The Internet With A Floppy Disk", niche: "tech", tone: "thriller", slug: "floppy" },
  { title: "What Happens If You Stop Eating Sugar For 30 Days", niche: "health", tone: "investigative", slug: "sugar" },
  { title: "The City That Disappeared Overnight In 1908", niche: "history", tone: "mysterious", slug: "tunguska" },
];

const BASE = '/opt/videoforge/output/v3-stripped';
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
        legibility: review?._legibility_violations || [],
        pool_winners_used: plan?._pool_winners_used || 0,
        pool_losers_used: plan?._pool_losers_used || 0,
      });
    } catch (e) {
      console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
      results.push({ slug: t.slug, title: t.title, error: 'thumbnail: ' + e.message });
    }
  }
} finally {
  await closeBrowser();
}

console.log(`\n${'═'.repeat(70)}\n  STRIPPED V3 BATCH SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-stripped";
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
  console.log(`    pool:     ${r.pool_winners_used} winners + ${r.pool_losers_used} losers in context`);
  if (r.legibility?.length) {
    console.log(`    legibility violations: ${r.legibility.length}`);
    for (const v of r.legibility) console.log(`      ✗ ${v}`);
  }
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
