/**
 * Multi-topic batch test for the new thumbnail-v2 stack.
 * Five fresh topics structurally different from anything we've been stuck on
 * (no Lehman, no iceberg, no skin, no rogue planet, no Roman Empire — those
 * are all already represented in the loop logs).
 *
 * Each topic exercises a different archetype hint so we see how the planner
 * handles variety. Results are written to /opt/videoforge/output/batch-fresh/
 * and a summary is printed at the end with the fileserver URLs.
 */
import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPICS = [
  { title: "Why Yellowstone Could Erupt Sooner Than Anyone Admits", niche: "science", tone: "dramatic" },
  { title: "The Day Bernie Madoff's Ponzi Scheme Finally Collapsed", niche: "finance", tone: "documentary" },
  { title: "What's Actually Inside The Marianas Trench (Scientists Just Found Out)", niche: "science", tone: "mysterious" },
  { title: "The Hidden Cost Of Eating One Avocado Every Day", niche: "health", tone: "investigative" },
  { title: "How North Korea Stole 1.5 Billion Dollars Without Touching A Bank", niche: "tech", tone: "thriller" },
];

const BASE = '/opt/videoforge/output/batch-fresh';
if (fs.existsSync(BASE)) fs.rmSync(BASE, { recursive: true, force: true });
fs.mkdirSync(BASE, { recursive: true });

const results = [];

for (let i = 0; i < TOPICS.length; i++) {
  const t = TOPICS[i];
  const slug = `topic-${i + 1}`;
  const outDir = path.join(BASE, slug);
  console.log(`\n${'═'.repeat(70)}\n  TOPIC ${i + 1}/${TOPICS.length}: ${t.title}\n${'═'.repeat(70)}`);
  const start = Date.now();
  try {
    const png = await generateThumbnailV2(outDir, t.title, t.title, "", t.niche, t.tone);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    let review = null;
    try {
      review = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v2-review.json'), 'utf-8'));
    } catch (e) {}
    let plan = null;
    try {
      plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v2-plan.json'), 'utf-8'));
    } catch (e) {}
    const attempts = fs.readdirSync(outDir).filter(d => d.startsWith('attempt-')).length + 1;
    results.push({
      slug, title: t.title, niche: t.niche, png, elapsed,
      attempts,
      archetype: plan?.archetype || 'unknown',
      primary_subject: plan?.primary_subject || 'unknown',
      critic: review?.rating ?? null,
      structural: review?.structural_score ?? null,
      combined: review?.combined_rating ?? null,
    });
  } catch (e) {
    console.error(`  ✗ FAILED: ${e.message}`);
    results.push({ slug, title: t.title, error: e.message });
  }
}

console.log(`\n${'═'.repeat(70)}\n  BATCH SUMMARY\n${'═'.repeat(70)}`);
const baseUrl = "http://178.156.209.219:3001/output/batch-fresh";
for (const r of results) {
  if (r.error) {
    console.log(`  ✗ ${r.slug}: ${r.error}`);
    continue;
  }
  console.log(`\n  ${r.slug} — "${r.title}"`);
  console.log(`    archetype:  ${r.archetype}`);
  console.log(`    subject:    ${r.primary_subject}`);
  console.log(`    attempts:   ${r.attempts}`);
  console.log(`    critic:     ${r.critic}/10`);
  console.log(`    structural: ${r.structural}/10`);
  console.log(`    combined:   ${r.combined}/10`);
  console.log(`    elapsed:    ${r.elapsed}s`);
  console.log(`    URL:        ${baseUrl}/${r.slug}/thumbnail-v2.png`);
}

const successful = results.filter(r => !r.error);
const avgCritic = successful.reduce((a, b) => a + (b.critic || 0), 0) / (successful.length || 1);
const avgStruct = successful.reduce((a, b) => a + (b.structural || 0), 0) / (successful.length || 1);
const avgCombo = successful.reduce((a, b) => a + (b.combined || 0), 0) / (successful.length || 1);
console.log(`\n  ── Averages across ${successful.length} successful generations ──`);
console.log(`    avg critic:     ${avgCritic.toFixed(1)}/10`);
console.log(`    avg structural: ${avgStruct.toFixed(1)}/10`);
console.log(`    avg combined:   ${avgCombo.toFixed(1)}/10`);

fs.writeFileSync(path.join(BASE, 'batch-summary.json'), JSON.stringify({ topics: TOPICS, results, averages: { critic: avgCritic, structural: avgStruct, combined: avgCombo } }, null, 2));
console.log(`\n  Summary saved: ${path.join(BASE, 'batch-summary.json')}`);
process.exit(0);
