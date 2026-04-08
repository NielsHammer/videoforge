/**
 * Re-run the same 5 HARD topics with the two-pass hook planner.
 * Direct comparison: same topics, same script generation, same image
 * pipeline, same critic — only difference is hook generation now happens
 * in a dedicated pass before any design or image work.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "Why You Can't Remember Being a Baby", niche: "science", tone: "curious", slug: "baby-memory" },
  { title: "The Country That Doesn't Officially Exist", niche: "history", tone: "mysterious", slug: "country" },
  { title: "How One Spreadsheet Error Cost JPMorgan $6 Billion", niche: "finance", tone: "investigative", slug: "jpmorgan" },
  { title: "The Sound That Drives People Insane", niche: "science", tone: "thriller", slug: "sound" },
  { title: "Why Nobody Can Solve the Riemann Hypothesis", niche: "science", tone: "intriguing", slug: "riemann" },
];

const BASE = '/opt/videoforge/output/v3-hard2';
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
      let review = null, plan = null, hook = null;
      try { review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-review.json'), 'utf-8')); } catch (e) {}
      try { plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-plan.json'), 'utf-8')); } catch (e) {}
      try { hook = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v3-hook.json'), 'utf-8')); } catch (e) {}
      const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
      results.push({
        slug: t.slug, title: t.title, niche: t.niche, scriptWords, attempts,
        elapsed: ((Date.now() - start) / 1000).toFixed(0),
        primary_subject: plan?.primary_subject || 'unknown',
        hook: plan?.hook_text || 'unknown',
        hook_winner: hook?.winner || null,
        hook_candidates: (hook?.candidates || []).map(c => c.hook),
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

console.log(`\n${'═'.repeat(70)}\n  HARD TOPICS — TWO-PASS PLANNER SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/v3-hard2";
for (const r of results) {
  if (r.error) {
    console.log(`\n  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    subject:  ${r.primary_subject}`);
  console.log(`    hook:     ${r.hook}`);
  if (r.hook_candidates.length) console.log(`    candidates: ${r.hook_candidates.map(c => `"${c}"`).join(', ')}`);
  console.log(`    attempts: ${r.attempts}`);
  console.log(`    critic:   ${r.critic}/10`);
  if (r.designer_verdict) console.log(`    verdict:  "${r.designer_verdict}"`);
  console.log(`    elapsed:  ${r.elapsed}s`);
  console.log(`    URL:      ${baseUrl}/${r.slug}/thumbnail-v3.png`);
}

const successful = results.filter(r => !r.error);
const avg = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
const passing = successful.filter(r => (r.critic || 0) >= 7).length;
console.log(`\n  Avg critic: ${avg.toFixed(1)}/10  (previous single-pass: 5.2/10)`);
console.log(`  Passing (>=7): ${passing}/${successful.length}  (previous: 1/5)`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ results, average: avg, passing }, null, 2));
process.exit(0);
