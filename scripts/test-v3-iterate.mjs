/**
 * Iteration batch for v3:
 *   1. Re-generate topics 4 (avocado) and 5 (North Korea) from the previous
 *      v3-batch — these didn't get a verdict from Niels yet and now have
 *      the new legibility rules + the persistent learning pool active.
 *   2. Run a fresh 5-topic batch on different topics so we can see if the
 *      system generalizes (the learning pool now contains 2 winners + 1
 *      loser from Niels's actual judgments).
 *
 * Output goes to /opt/videoforge/output/v3-iterate-{topic}/ for the re-runs
 * and /opt/videoforge/output/v3-fresh/ for the new batch.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const REITERATE = [
  { title: "The Hidden Cost Of Eating One Avocado Every Day", niche: "health", tone: "investigative", slug: "topic-4-avocado" },
  { title: "How North Korea Stole 1.5 Billion Dollars Without Touching A Bank", niche: "tech", tone: "thriller", slug: "topic-5-northkorea" },
];

const FRESH = [
  { title: "Why Do Octopuses Have 9 Brains?", niche: "science", tone: "curious", slug: "fresh-1-octopus" },
  { title: "The Day Lehman Brothers Collapsed In 24 Hours", niche: "finance", tone: "documentary", slug: "fresh-2-lehman" },
  { title: "What's Really Inside Area 51 (According To Leaked Documents)", niche: "history", tone: "mysterious", slug: "fresh-3-area51" },
  { title: "How Russia Almost Started Nuclear War By Accident In 1983", niche: "history", tone: "thriller", slug: "fresh-4-petrov" },
  { title: "The Tiny Algae That Produces Half The Oxygen You Breathe", niche: "science", tone: "wondrous", slug: "fresh-5-algae" },
];

async function runOne({ title, niche, tone, slug, baseDir }) {
  const outDir = path.join(baseDir, slug);
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n${'═'.repeat(70)}\n  ${slug}: ${title}\n${'═'.repeat(70)}`);
  const start = Date.now();

  let script = '', scriptWords = 0;
  try {
    console.log('\n--- Generating 5-min script ---');
    const r = await generateScript(title, { duration: '5', tone, niche, output: outDir });
    script = fs.readFileSync(r.scriptPath, 'utf-8');
    scriptWords = r.wordCount;
    console.log(`  Script: ${scriptWords} words`);
  } catch (e) {
    return { slug, title, error: 'script: ' + e.message };
  }

  try {
    await generateThumbnailV3({ outputDir: outDir, title, scriptText: script, niche, tone });
    let review = null, plan = null;
    try { review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-review.json'), 'utf-8')); } catch (e) {}
    try { plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-plan.json'), 'utf-8')); } catch (e) {}
    const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
    return {
      slug, title, niche, scriptWords, attempts,
      elapsed: ((Date.now() - start) / 1000).toFixed(0),
      primary_subject: plan?.primary_subject || 'unknown',
      hook: plan?.hook_text || 'unknown',
      critic: review?.rating ?? null,
      designer_verdict: review?.designer_verdict || null,
      legibility_violations: review?._legibility_violations || [],
    };
  } catch (e) {
    console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
    return { slug, title, error: 'thumbnail: ' + e.message };
  }
}

const ITERATE_DIR = '/opt/videoforge/output/v3-iterate';
const FRESH_DIR = '/opt/videoforge/output/v3-fresh';
fs.mkdirSync(ITERATE_DIR, { recursive: true });
fs.mkdirSync(FRESH_DIR, { recursive: true });

const allResults = [];

try {
  console.log('\n##### PHASE 1: Re-iterate topics 4 + 5 with new rules + pool #####\n');
  for (const t of REITERATE) {
    allResults.push({ phase: 'iterate', ...(await runOne({ ...t, baseDir: ITERATE_DIR })) });
  }
  console.log('\n##### PHASE 2: Fresh batch on 5 new topics #####\n');
  for (const t of FRESH) {
    allResults.push({ phase: 'fresh', ...(await runOne({ ...t, baseDir: FRESH_DIR })) });
  }
} finally {
  await closeBrowser();
}

console.log(`\n${'═'.repeat(70)}\n  ITERATION + FRESH BATCH SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output";

for (const r of allResults) {
  if (r.error) {
    console.log(`\n  ✗ ${r.slug} (${r.phase}): ${r.error}`);
    continue;
  }
  const dir = r.phase === 'iterate' ? 'v3-iterate' : 'v3-fresh';
  console.log(`\n  [${r.phase}] ${r.slug} — "${r.title}"`);
  console.log(`    subject:  ${r.primary_subject}`);
  console.log(`    hook:     ${r.hook}`);
  console.log(`    attempts: ${r.attempts}`);
  console.log(`    critic:   ${r.critic}/10`);
  if (r.legibility_violations?.length) {
    console.log(`    legibility violations: ${r.legibility_violations.length}`);
    for (const v of r.legibility_violations) console.log(`      ✗ ${v}`);
  }
  if (r.designer_verdict) console.log(`    verdict:  "${r.designer_verdict}"`);
  console.log(`    elapsed:  ${r.elapsed}s`);
  console.log(`    URL:      ${baseUrl}/${dir}/${r.slug}/thumbnail-v3.png`);
}

const successful = allResults.filter(r => !r.error);
const avg = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
console.log(`\n  Avg critic across ${successful.length} successful: ${avg.toFixed(1)}/10`);

fs.writeFileSync('/opt/videoforge/output/v3-iterate-summary.json', JSON.stringify(allResults, null, 2));
process.exit(0);
