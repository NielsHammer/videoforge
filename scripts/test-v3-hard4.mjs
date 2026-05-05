/**
 * Hard batch #4 — blue whale remake + 4 new hard challenges from Niels.
 *
 * Pool is 18W+31L going into this run. Two latest winners (SR-71 MISSILES STARVED,
 * Tonga PUNCHED THROUGH) plus the latest blue-whale loser ("aerial shot was boring,
 * use close-up of recognizable feature") all live in the planner's reference pool.
 *
 * The 4 new topics are deliberately hard:
 *   - Blindfolded walking — abstract human behavior, no obvious visual subject
 *   - $30B typo war — obscure history, must feel dramatic not academic
 *   - Inside a black hole — subject is literally invisible
 *   - Dying language — how do you visualize a language with one speaker?
 *
 * These will hit the concreteness classifier and likely all run the metaphor brainstorm.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "The Blue Whale's Heart Is Bigger Than a Car",                          niche: "science",     tone: "wondrous",     slug: "blue-whale",  expect: "concrete" },
  { title: "Why Humans Can't Walk in a Straight Line Blindfolded",                 niche: "science",     tone: "curious",      slug: "blindfolded", expect: "abstract" },
  { title: "The $30 Billion Typo That Started a War",                              niche: "history",     tone: "thriller",     slug: "typo-war",    expect: "abstract" },
  { title: "What Happens Inside a Black Hole After You Cross the Event Horizon",   niche: "science",     tone: "mind-bending", slug: "black-hole",  expect: "abstract" },
  { title: "The Language That Only 1 Person Still Speaks",                         niche: "linguistics", tone: "melancholy",   slug: "last-speaker",expect: "abstract" },
];

const BASE = '/opt/videoforge/output/v3-hard4';
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

console.log(`\n${'═'.repeat(70)}\n  HARD BATCH #4 SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-hard4";
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
