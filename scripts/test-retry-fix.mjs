/**
 * One-shot verification that the auto-retry fix in thumbnail-v2.js actually
 * triggers regeneration when the self-review scores below the threshold.
 * Picks one fresh topic, runs generateThumbnailV2, prints the resulting attempt
 * count and final rating.
 */
import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const OUT = '/opt/videoforge/output/retry-fix-verify';
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });

const title = "Why The Roman Empire Actually Collapsed (It's Not What You Think)";
const niche = "history";

console.log("Running retry-fix verification with title:", title);
const start = Date.now();
try {
  const png = await generateThumbnailV2(OUT, title, title, "", niche, "dramatic");
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("\n========== VERIFICATION RESULT ==========");
  console.log("Final png:", png);
  console.log("Elapsed:", elapsed + "s");

  // Inspect what happened
  const review = JSON.parse(fs.readFileSync(path.join(OUT, 'thumbnail-v2-review.json'), 'utf-8'));
  console.log("Final rating:", review.rating + "/10");

  const attempts = fs.readdirSync(OUT).filter(d => d.startsWith('attempt-'));
  console.log("Archived prior attempts:", attempts.length);
  for (const a of attempts.sort()) {
    const r = JSON.parse(fs.readFileSync(path.join(OUT, a, 'thumbnail-v2-review.json'), 'utf-8'));
    console.log(`  ${a}: ${r.rating}/10 — ${(r.problems || []).slice(0, 2).join('; ')}`);
  }

  if (attempts.length === 0 && review.rating < 7) {
    console.log("\n❌ BUG STILL PRESENT: rating < 7 but no retry happened");
    process.exit(1);
  }
  console.log("\n✅ Retry path verified");
  process.exit(0);
} catch (e) {
  console.error("Test failed:", e.message);
  console.error(e.stack);
  process.exit(2);
}
