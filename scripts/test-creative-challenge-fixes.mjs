import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';
import path from 'path';

const fixes = [
  {
    id: "1",
    title: "The 72 Hours That Killed Lehman Brothers",
    topic: "2008 financial crisis Lehman Brothers collapse",
    niche: "finance",
    tone: "documentary",
    desc: `COMPOSITION: data_callout infographic.

The background image MUST show a dramatic stock market crash chart — a line/candlestick chart with a massive red downward plunge. Think: a Bloomberg terminal screenshot of a stock crashing 90% in 3 days. Green candles rising on the left, then a catastrophic red waterfall on the right. Dark background with the chart in green and red colors. NOT abstract gradients — an ACTUAL chart visualization with candlesticks or a line graph.

Position "72 HOURS" as a massive callout near the crash point (center-right area, x:55 y:30). Add a red arrow pointing FROM the peak DOWN to the crash. "LEHMAN" in a small white-on-red banner at the peak of the chart (top area, x:30 y:10). Add a red circle around the crash zone.

The whole thing should look like an annotated trading chart — like someone screenshotted a terminal and drew arrows on it saying "THIS is where it all went wrong."`
  },
  {
    id: "3",
    title: "What 90 Days of No Sugar Does to Your Skin",
    topic: "no sugar challenge skin transformation",
    niche: "health",
    tone: "transformation",
    desc: `COMPOSITION: before_after split with ZERO TEXT.

Request TWO images using image_prompt and image_prompt_2:
- image_prompt (background): Close-up of rough, dry, dull human skin surface texture with visible pores and uneven patches. Macro photography style. No face, no person — JUST the skin texture itself. Cinematic, dramatic lighting, 16:9, no text, no watermarks, no people, no faces.
- image_prompt_2 (third): Close-up of smooth, dewy, glowing healthy skin surface with even tone and natural radiance. Macro photography style. No face, no person — JUST the skin texture. Cinematic, dramatic lighting, 16:9, no text, no watermarks, no people, no faces.

Layout: background image on LEFT half (x:0, y:0, w:50, h:100). Third image on RIGHT half (x:50, y:0, w:50, h:100). Apply DESATURATE on left half (x:0, y:0, w:50, h:100, strength:0.85). White divider at position 50, width 6. Single red arrow from x:38 y:50 to x2:62 y2:50.

ZERO TEXT. No text elements, no banners. The visual transformation is the entire message.`
  },
  {
    id: "4",
    title: "The Rogue Planet Heading Toward Our Solar System",
    topic: "rogue planet approaching solar system",
    niche: "space",
    tone: "dramatic",
    desc: `COMPOSITION: center_statement — text placed DIRECTLY ON the planet.

The AI image must show a massive, dark, cratered rogue planet taking up the CENTER of the frame (roughly 50-60% of canvas). Earth's blue curved edge visible at the bottom. Deep black starfield behind. The planet should be dark reddish-brown, rough, and threatening.

CRITICAL TEXT PLACEMENT: "ROGUE" must be centered DIRECTLY ON TOP of the planet body — NOT to the side. Position at approximately x:50, y:35, align:center. The text should overlap the planet surface like a scientific specimen label stamped on the object itself. White text, massive font, with stroke for readability against the dark planet surface.

Only 3 elements: image background, text "ROGUE" centered on planet, subtle vignette. Nothing else. The simplicity and the text-on-object approach is the whole design concept.`
  },
];

const baseDir = '/opt/videoforge/output';

for (const fix of fixes) {
  const outDir = path.join(baseDir, `thumb-creative-challenge-${fix.id}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n${"=".repeat(70)}`);
  console.log(`FIX ${fix.id}: "${fix.title}"`);
  console.log("=".repeat(70));

  try {
    await generateThumbnailV2(outDir, fix.title, fix.topic, fix.desc, fix.niche, fix.tone);
    console.log(`\n✓ Fix ${fix.id} done → ${outDir}/thumbnail-v2.png`);
  } catch (err) {
    console.error(`\n✗ Fix ${fix.id} FAILED:`, err.message);
  }
}

console.log("\nAll fixes complete!");
