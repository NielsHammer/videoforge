import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';
import path from 'path';

const challenges = [
  {
    id: "1",
    title: "The 72 Hours That Killed Lehman Brothers",
    topic: "2008 financial crisis Lehman Brothers collapse",
    niche: "finance",
    tone: "documentary",
    desc: `This is a documentary about the 2008 financial crisis, specifically the 72-hour period where Lehman Brothers collapsed. The stock went from $16 to essentially zero. It was the largest bankruptcy in US history — $639 billion in assets. The crash triggered a global recession. Key moment: September 12-15, 2008.`
  },
  {
    id: "2",
    title: "7 Layers of the Dark Web Explained",
    topic: "dark web layers iceberg explained",
    niche: "tech",
    tone: "educational",
    desc: `Educational explainer about the layers of the internet. Surface web (Google, YouTube), Deep Web (databases, private networks), and the Dark Web (Tor, .onion sites). Goes through 7 increasingly hidden layers: 1) Surface Web, 2) Bergie Web, 3) Deep Web, 4) Charter Web, 5) Marianas Web, 6) Level 6 (The Fog), 7) The Primarch System. Each layer is more hidden and dangerous than the last.`
  },
  {
    id: "3",
    title: "What 90 Days of No Sugar Does to Your Skin",
    topic: "no sugar challenge skin transformation",
    niche: "health",
    tone: "transformation",
    desc: `Health transformation video about quitting sugar for 90 days. The video shows dramatic before/after results: clearer skin, reduced inflammation, fewer breakouts, more even skin tone, natural glow returns. Sugar causes glycation which damages collagen and elastin, leading to wrinkles and dull skin. After 90 days without sugar, skin regeneration is visible.`
  },
  {
    id: "4",
    title: "The Rogue Planet Heading Toward Our Solar System",
    topic: "rogue planet approaching solar system",
    niche: "space",
    tone: "dramatic",
    desc: `A rogue planet — a planet not bound to any star — has been detected heading toward our solar system. These planets drift through interstellar space at incredible speeds. If one entered our solar system it could disrupt planetary orbits. Scientists estimate there are billions of rogue planets in our galaxy alone. This one is massive, dark, and approaching.`
  },
  {
    id: "5",
    title: "The Virus That Erased an Entire Country's Data",
    topic: "Shamoon virus Saudi Arabia cyberattack",
    niche: "tech",
    tone: "dark",
    desc: `The Shamoon virus attacked Saudi Aramco in 2012, wiping 35,000 computers in a matter of hours. It replaced all data with an image of a burning American flag. It was the most destructive cyberattack in history at that time. The attack was attributed to Iran. Saudi Aramco — the world's most valuable company — was brought to its knees. Employees had to use typewriters and fax machines for months.`
  },
];

const baseDir = '/opt/videoforge/output';

for (const ch of challenges) {
  const outDir = path.join(baseDir, `thumb-creative-challenge-${ch.id}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n${"=".repeat(70)}`);
  console.log(`CHALLENGE ${ch.id}: "${ch.title}"`);
  console.log("=".repeat(70));

  try {
    await generateThumbnailV2(outDir, ch.title, ch.topic, ch.desc, ch.niche, ch.tone);
    console.log(`\n✓ Challenge ${ch.id} done → ${outDir}/thumbnail-v2.png`);
  } catch (err) {
    console.error(`\n✗ Challenge ${ch.id} FAILED:`, err.message);
    console.error(err.stack);
  }
}

console.log(`\n${"=".repeat(70)}`);
console.log("All challenges complete!");
console.log("=".repeat(70));
