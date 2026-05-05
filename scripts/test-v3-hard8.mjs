/**
 * Hard batch #8 — same 5 topics as v3-hard7, direct A/B on the image fix.
 *
 * ROOT CAUSE FIX: Planner now treats brainstormer's likely_image as a REQUIRED
 * directive, not a suggestion. With explicit examples of what went wrong
 * (showed desert instead of kids, showed static bridge instead of collapse).
 * Also: dramatic moments default to AI generation, not stock photo search.
 *
 * Pool is 21W+47L.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "The Bridge That Collapsed Because of Wind",                            niche: "engineering", tone: "dramatic",     slug: "tacoma-bridge",    expect: "concrete" },
  { title: "The Town Where It Hasn't Rained in 500 Years",                         niche: "geography",   tone: "awe",          slug: "atacama",          expect: "concrete" },
  { title: "The Surgeon Who Operated on Himself in Antarctica",                    niche: "history",     tone: "thriller",     slug: "self-surgery",     expect: "concrete" },
  { title: "Why Mirrors Don't Actually Reverse Left and Right",                    niche: "science",     tone: "mind-bending", slug: "mirrors",          expect: "abstract" },
  { title: "The City That Was Built on Top of Another City",                       niche: "history",     tone: "curious",      slug: "underground-city", expect: "concrete" },
];

const BASE = '/opt/videoforge/output/v3-hard8';
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
        what_is_interesting: hook?.what_is_interesting || null,
        likely_image: hook?.likely_image || null,
        is_abstract: topicClass?.is_abstract ?? null,
        metaphor_ran: !!metaphor,
        metaphor: metaphor?.winner?.metaphor || null,
        critic: review?.rating ?? null,
        designer_verdict: review?.designer_verdict || null,
        image_prompt: plan?.image_requests?.[0]?.prompt?.substring(0, 120) || null,
        image_source: plan?.image_requests?.[0]?.source_hint || null,
      });
    } catch (e) {
      console.error(`  ✗ Thumbnail gen failed: ${e.message}`);
      results.push({ slug: t.slug, title: t.title, error: 'thumbnail: ' + e.message });
    }
  }
} finally {
  await closeBrowser();
}

console.log(`\n${'═'.repeat(70)}\n  HARD BATCH #8 SUMMARY (image directive fix)\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-hard8";
for (const r of results) {
  if (r.error) {
    console.log(`\n  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    interesting: ${r.what_is_interesting || 'n/a'}`);
  console.log(`    likely_img:  ${r.likely_image || 'n/a'}`);
  console.log(`    img_prompt:  ${r.image_prompt || 'n/a'}`);
  console.log(`    img_source:  ${r.image_source || 'n/a'}`);
  console.log(`    hook:        ${r.hook}`);
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
