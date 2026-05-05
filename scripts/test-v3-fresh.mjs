/**
 * Fresh batch — post 3-global-fixes (banner, spacing, metaphor gating).
 *
 * Tests THREE things at once:
 *
 * (1) BANNER REWORK — banners are no longer forced. The planner should now
 *     ship most thumbnails with ZERO banners and only add one when it's a
 *     real "wait, really?" fact.
 *
 * (2) TEXT SPACING — hook text must declare letter-spacing + word-spacing.
 *     Negative letter-spacing is now a HARD legibility violation. Big hook
 *     text without any word-spacing declaration is a SOFT violation.
 *
 * (3) METAPHOR GATING — concrete topics (volcano, plane, cathedral, animal)
 *     skip the metaphor brainstorm entirely. Abstract topics (math, finance,
 *     perception) still get the brainstorm.
 *
 * Topic mix:
 *   - 3 CONCRETE (must skip metaphor brainstorm): Tonga eruption, SR-71, blue whale
 *   - 2 ABSTRACT (must run metaphor brainstorm): infinity hotel, $440M trading bug
 *
 * NOT in this batch: Riemann (abandoned), Cantor/Color/Country/Internet-bug
 * (already in losers pool with specific lessons).
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  // CONCRETE — should skip metaphor brainstorm
  { title: "The Tonga Eruption Reached Space",          niche: "science", tone: "awe",       slug: "tonga",       expect: "concrete" },
  { title: "Why the SR-71 Could Never Be Shot Down",    niche: "history", tone: "thriller",  slug: "sr71",        expect: "concrete" },
  { title: "The Blue Whale's Heart Is Bigger Than a Car", niche: "science", tone: "wondrous", slug: "blue-whale",  expect: "concrete" },
  // ABSTRACT — should run metaphor brainstorm
  { title: "Hilbert's Hotel Has Infinite Rooms And They're All Full",  niche: "science", tone: "mind-bending", slug: "hilbert",  expect: "abstract" },
  { title: "How A 45-Minute Bug Lost Knight Capital $440 Million",     niche: "finance", tone: "thriller",     slug: "knight",   expect: "abstract" },
];

const BASE = '/opt/videoforge/output/v3-fresh';
if (fs.existsSync(BASE)) fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

const results = [];

try {
  for (const t of TOPICS) {
    const outDir = path.join(BASE, t.slug);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`\n${'═'.repeat(70)}\n  ${t.slug}: ${t.title}  [expected: ${t.expect}]\n${'═'.repeat(70)}`);
    const start = Date.now();
    let script = '', scriptWords = 0;

    try {
      console.log('\n--- Generating script ---');
      const r = await generateScript(t.title, { duration: '5', tone: t.tone, niche: t.niche, output: outDir });
      script = fs.readFileSync(r.scriptPath, 'utf-8');
      scriptWords = r.wordCount;
      console.log(`  Script: ${scriptWords} words`);
    } catch (e) {
      results.push({ slug: t.slug, title: t.title, expect: t.expect, error: 'script: ' + e.message });
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
        gating_correct: (t.expect === 'concrete' && topicClass?.is_abstract === false)
                     || (t.expect === 'abstract' && topicClass?.is_abstract === true),
        metaphor_ran: !!metaphor,
        metaphor: metaphor?.winner?.metaphor || null,
        critic: review?.rating ?? null,
        designer_verdict: review?.designer_verdict || null,
      });
    } catch (e) {
      console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
      results.push({ slug: t.slug, title: t.title, expect: t.expect, error: 'thumbnail: ' + e.message });
    }
  }
} finally {
  await closeBrowser();
}

console.log(`\n${'═'.repeat(70)}\n  FRESH BATCH SUMMARY (post-fixes)\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-fresh";
for (const r of results) {
  if (r.error) {
    console.log(`\n  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    expected:    ${r.expect}`);
  console.log(`    is_abstract: ${r.is_abstract}  (gating ${r.gating_correct ? 'OK ✓' : 'WRONG ✗'})`);
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
const gatingOK = successful.filter(r => r.gating_correct).length;
console.log(`\n  Avg critic:    ${avg.toFixed(1)}/10`);
console.log(`  Passing (>=7): ${passing}/${successful.length}`);
console.log(`  Gating correct: ${gatingOK}/${successful.length}`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ results, average: avg, passing, gatingOK }, null, 2));
process.exit(0);
