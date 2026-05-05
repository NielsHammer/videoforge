import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';
import path from 'path';

const tests = [
  {
    id: "stocks-beginner",
    title: "How To Start Trading Stocks As A Complete Beginner",
    topic: "stock trading basics for beginners",
    niche: "finance",
    tone: "educational",
    desc: "The ultimate guide for beginners on how to trade stocks. Learn about brokerages, chart reading, risk management, and placing your first trade."
  },
  {
    id: "morning-routine",
    title: "The Perfect Morning Routine (Backed by Science)",
    topic: "morning routine habits for productivity",
    niche: "education",
    tone: "motivational",
    desc: "Discover the perfect morning routine backed by science that boosts productivity, builds discipline, and improves your mindset. These simple but powerful habits will help you increase your energy."
  },
  {
    id: "civil-war",
    title: "The American Civil War Explained in 24 Minutes",
    topic: "American Civil War history",
    niche: "history",
    tone: "documentary",
    desc: "From the bloodiest day in American history, to the emotional surrender of a Confederate General, to the President saving America from the brink of collapse and then getting assassinated 5 days later."
  },
  {
    id: "egypt-city",
    title: "Why Egypt Is Building a $58 Billion Rival to Dubai",
    topic: "Egypt new capital city megaproject",
    niche: "travel",
    tone: "investigative",
    desc: "Egypt has partnered with The United Arab Emirates to develop a $58 Billion dollar city in the middle of the desert. However, many view this partnership as a way of Egypt selling its land to the UAE."
  },
  {
    id: "california-water",
    title: "Why California is Running Out of Water",
    topic: "California water crisis drought",
    niche: "education",
    tone: "serious",
    desc: "California is running out of water. With a population of over 30 million people, this is a huge problem. Explaining why California is experiencing such a water crisis and how agriculture uses 80% of the state's water supply."
  },
];

const outDir = '/opt/videoforge/test-thumbnails-round6';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const test of tests) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`GENERATING: ${test.id} — "${test.title}"`);
  console.log("=".repeat(70));

  try {
    const dir = path.join(outDir, test.id);
    await generateThumbnailV2(dir, test.title, test.topic, test.desc, test.niche, test.tone);
    console.log(`\n✓ ${test.id} done → ${dir}/thumbnail.png`);
  } catch (err) {
    console.error(`\n✗ ${test.id} FAILED:`, err.message);
  }
}

console.log(`\n${"=".repeat(70)}`);
console.log(`All done! Thumbnails in: ${outDir}`);
console.log("=".repeat(70));
