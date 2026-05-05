/**
 * Test: generate 5 thumbnails from real order data using the live v3 pipeline.
 * Each thumbnail goes into output/order-{id}/ (overwrites existing thumbnail.png).
 * This exercises the exact same generateThumbnailV3 path the worker uses.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { generateThumbnailV3 } from '../src/thumbnail-v3.js';

const ORDERS = [
  {
    id: 'a9e00c5b-a10f-4f46-abf5-841f4488a69a',
    topic: 'Why You Feel Slower Getting Up From a Chair — And What Your Body Is Telling You',
    niche: 'Educational health content for adults 60+ focused on aging, mobility, and real-life biological changes',
    tone: 'Professional',
    script: '/opt/videoforge/scripts/why-you-feel-slower-getting-up-from-a-chair-and-what-your-bo.txt',
  },
  {
    id: '073f97eb-406c-4a5b-9b30-9a31d284ca74',
    topic: 'The TRAP Of The Car Payment That Nobody Is Talking About',
    niche: 'personal finance',
    tone: 'Professional',
    script: '/opt/videoforge/scripts/the-trap-of-the-car-payment-that-nobody-is-talking-about.txt',
  },
  {
    id: '0d02311c-f849-4cc5-ac22-fa127140de8a',
    topic: 'Are You Walking WRONG? The Surprising Truth About How We Walk',
    niche: 'Health & Wellness 40+ Knee, Hip, Back Pain relief',
    tone: 'Motivational',
    script: '/opt/videoforge/scripts/are-you-walking-wrong-the-surprising-truth-about-how-we-walk.txt',
  },
  {
    id: '3c5db082-311e-4a30-bc54-f34813fbfdb0',
    topic: 'The BASIC Financial Concepts You Should Understand',
    niche: 'personal finance',
    tone: 'Professional',
    script: '/opt/videoforge/scripts/the-basic-financial-concepts-you-should-understand.txt',
  },
  {
    id: 'c9c3a6d5-82d5-4c2b-afee-2175980c0c7a',
    topic: 'Stop Wasting Time! The Secret to Big Arms That Actually Work',
    niche: 'Fitness niche for beginners',
    tone: 'Casual',
    script: '/opt/videoforge/scripts/stop-wasting-time-the-secret-to-big-arms-that-actually-work.txt',
  },
];

const BASE_URL = 'https://files.tubeautomate.com/output';

async function run() {
  console.log(`\n=== Live Pipeline Thumbnail Test — ${ORDERS.length} orders ===\n`);

  for (const order of ORDERS) {
    const outputDir = `/opt/videoforge/output/order-${order.id}`;
    fs.mkdirSync(outputDir, { recursive: true });

    // Delete existing thumbnail so we generate fresh
    const thumbPath = path.join(outputDir, 'thumbnail.png');
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    const htmlPath = path.join(outputDir, 'thumbnail.html');
    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);

    // Read script
    let scriptText = '';
    try { scriptText = fs.readFileSync(order.script, 'utf8'); } catch {}

    console.log(`\n[${ ORDERS.indexOf(order) + 1}/5] "${order.topic}"`);
    console.log(`     niche: ${order.niche} | tone: ${order.tone}`);
    console.log(`     script: ${scriptText.length} chars`);

    const start = Date.now();
    try {
      await generateThumbnailV3({
        outputDir,
        title: order.topic,
        scriptText,
        niche: order.niche,
        tone: order.tone,
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const exists = fs.existsSync(thumbPath);
      const url = `${BASE_URL}/order-${order.id}/thumbnail.png?t=${Date.now()}`;
      console.log(`     ✅ Done in ${elapsed}s | file exists: ${exists}`);
      console.log(`     🔗 ${url}`);
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`     ❌ FAILED after ${elapsed}s: ${err.message}`);
    }
  }

  console.log('\n=== Test complete ===\n');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
