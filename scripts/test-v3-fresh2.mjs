/**
 * Fresh batch #2 — same 5 topics as v3-fresh, post second wave of fixes.
 *
 * Same topics so we get a direct A/B comparison against v3-fresh. The 5 new
 * losers from v3-fresh are now in the pool with specific lessons, and the
 * planner has stricter rules:
 *
 *   - Default = NO banner (banner from v3-fresh: '45 MINUTES', 'AND LIVED' both noise)
 *   - Hook is ONE color, contrasting against the image
 *   - Hook is plain English words, never equations/symbols
 *   - One hero image (no overlapping photo stacks)
 *   - No decorative overlays (no crosshairs, vignettes, particles)
 *   - Background never competes with hero subject
 *   - Hook text safe-zone positioning (40px from any edge)
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "The Tonga Eruption Reached Space",                       niche: "science", tone: "awe",          slug: "tonga",      expect: "concrete" },
  { title: "Why the SR-71 Could Never Be Shot Down",                 niche: "history", tone: "thriller",     slug: "sr71",       expect: "concrete" },
  { title: "The Blue Whale's Heart Is Bigger Than a Car",            niche: "science", tone: "wondrous",     slug: "blue-whale", expect: "concrete" },
  { title: "Hilbert's Hotel Has Infinite Rooms And They're All Full",niche: "science", tone: "mind-bending", slug: "hilbert",    expect: "abstract" },
  { title: "How A 45-Minute Bug Lost Knight Capital $440 Million",   niche: "finance", tone: "thriller",     slug: "knight",     expect: "abstract" },
];

const BASE = '/opt/videoforge/output/v3-fresh2';
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
      let review = null, plan = null, hook = null, metaphor = null, topicClass = null;
      try { review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-review.json'), 'utf-8')); } catch (e) {}
      try { plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-plan.json'), 'utf-8')); } catch (e) {}
      try { hook = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-hook.json'), 'utf-8')); } catch (e) {}
      try { metaphor = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-metaphor.json'), 'utf-8')); } catch (e) {}
      try { topicClass = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-topicclass.json'), 'utf-8')); } catch (e) {}
      const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
      results.push({
        slug: t.slug, title: t.title, niche: t.niche, expect: t.expect, scriptWords, attempts,
        elapsed: ((Date.now() - start) / 1000).toFixed(0),
        primary_subject: plan?.primary_subject || 'unknown',
        hook: hook?.winner || plan?.hook_text || 'unknown',
        is_abstract: topicClass?.is_abstract ?? null,
        metaphor_ran: !!metaphor,
        metaphor: metaphor?.winner?.metaphor || null,
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

console.log(`\n${'═'.repeat(70)}\n  FRESH BATCH #2 SUMMARY (post second wave of fixes)\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-fresh2";
for (const r of results) {
  if (r.error) {
    console.log(`\n  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    is_abstract: ${r.is_abstract}`);
  console.log(`    metaphor:    ${r.metaphor_ran ? 'ran' : 'skipped'}`);
  console.log(`    subject:     ${r.primary_subject}`);
  console.log(`    hook:        ${r.hook}`);
  if (r.metaphor) console.log(`    metaphor:    ${r.metaphor.substring(0, 120)}`);
  console.log(`    attempts:    ${r.attempts}`);
  console.log(`    critic:      ${r.critic}/10`);
  if (r.designer_verdict) console.log(`    verdict:     "${r.designer_verdict}"`);
  console.log(`    elapsed:     ${r.elapsed}s`);
  console.log(`    URL:         ${baseUrl}/${r.slug}/thumbnail-v3.png`);
}

const successful = results.filter(r => !r.error);
const avg = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
const passing = successful.filter(r => (r.critic || 0) >= 7).length;
console.log(`\n  Avg critic:    ${avg.toFixed(1)}/10`);
console.log(`  Passing (>=7): ${passing}/${successful.length}`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ results, average: avg, passing }, null, 2));
process.exit(0);
