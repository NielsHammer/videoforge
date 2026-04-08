/**
 * One-topic smoke test for thumbnail-v3.
 * Verifies the full pipeline: title → script → Claude HTML → image fetch
 * → headless Chrome render → critic. Used as a foundation check before
 * running the full 5-topic batch.
 */
import { generateScript } from '../src/script-generator.js';
import { generateThumbnailV3, closeBrowser } from '../src/thumbnail-v3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const TOPIC = {
  title: "Why Yellowstone Could Erupt Sooner Than Anyone Admits",
  niche: "science",
  tone: "dramatic",
};
const OUT = '/opt/videoforge/output/v3-smoke';
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log('Smoke test:', TOPIC.title);
const start = Date.now();

// Generate script
console.log('\n=== Generating 5-min script ===');
const scriptResult = await generateScript(TOPIC.title, {
  duration: '5',
  tone: TOPIC.tone,
  niche: TOPIC.niche,
  output: OUT,
});
const script = fs.readFileSync(scriptResult.scriptPath, 'utf-8');
console.log('Script:', scriptResult.wordCount, 'words');

// Generate thumbnail
try {
  await generateThumbnailV3({
    outputDir: OUT,
    title: TOPIC.title,
    scriptText: script,
    niche: TOPIC.niche,
    tone: TOPIC.tone,
  });
} finally {
  await closeBrowser();
}

const elapsed = ((Date.now() - start) / 1000).toFixed(0);
console.log('\n========== SMOKE TEST COMPLETE ==========');
console.log('Elapsed:', elapsed + 's');
console.log('Output:', OUT);
console.log('PNG: http://178.156.209.219:3001/output/v3-smoke/thumbnail-v3.png');
console.log('HTML: file://' + path.join(OUT, 'thumbnail-v3.html'));
process.exit(0);
