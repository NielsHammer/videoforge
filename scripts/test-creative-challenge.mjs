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
    desc: `REFERENCE STYLE: Data visualization thumbnail — a dramatic timeline/chart showing a rise-and-crash curve.

MANDATORY COMPOSITION: data_callout style. The AI image MUST be a stylized financial chart/timeline visualization — NOT a photo of a building or city. Show a dramatic stock price curve that rises then crashes catastrophically. Blue-to-red gradient fill under the curve (blue = stable, red = crisis). Dark background (#0a0a14).

TEXT APPROACH: "72 HOURS" as the primary hook positioned near the peak of the crash curve, like a data callout label. "LEHMAN" in a small banner at the origin/start point. Use arrows pointing to key moments on the timeline.

This should look like an INFOGRAPHIC or DATA VISUALIZATION, not a movie poster. Think Bloomberg terminal meets doomsday chart. The specific number (72 hours) creates credibility. Colors transition from calm blue to crisis red.`
  },
  {
    id: "2",
    title: "7 Layers of the Dark Web Explained",
    topic: "dark web layers iceberg explained",
    niche: "tech",
    tone: "educational",
    desc: `REFERENCE STYLE: Clean white-background infographic with a tiered/layered structure (pyramid or iceberg).

MANDATORY COMPOSITION: WHITE BACKGROUND (#F0EEEB). The AI image MUST be an iceberg diagram or inverted pyramid showing layers/tiers on a clean white background. Each layer should represent a deeper level of the dark web. The iceberg format — surface web visible above water, deep/dark web below — is the ideal visual.

TEXT APPROACH: Use BLACK text (#1a1a1a) — NOT white. This is an educational infographic, not a dark thriller. Small clean labels on the tiers. Primary text can be "7 LAYERS" in medium black text, centered above the iceberg. NO banners, NO red accents — this should look like a textbook diagram.

The white background is the KEY differentiator — it creates a massive pattern break in YouTube feeds full of dark thumbnails. Clean, minimal, trustworthy educational feel. Think Wikipedia illustration, not horror movie poster.`
  },
  {
    id: "3",
    title: "What 90 Days of No Sugar Does to Your Skin",
    topic: "no sugar challenge skin transformation",
    niche: "health",
    tone: "transformation",
    desc: `REFERENCE STYLE: Before/after transformation split with ZERO TEXT on the thumbnail.

MANDATORY COMPOSITION: before_after split. Request TWO images — main image showing unhealthy, dull, blemished skin close-up, supplementary image showing clear, glowing, healthy skin close-up. Place them side by side: main image on LEFT half (x:0, w:50), supplementary on RIGHT half (x:50, w:50). Apply DESATURATE element to the LEFT half (strength 0.8) to make the "before" look washed out. Add a vertical DIVIDER at position 50. Add a single RED ARROW from left to right at center.

TEXT: NONE. Zero text elements. NO banners. The visual transformation speaks for itself — the video title provides context. This is a deliberately bold "no text" approach. The only non-photo element is the red arrow.

Color palette: monochrome/desaturated left, warm/vibrant right, single red (#D42B2B) accent for the arrow only. White or light gray background visible between panels if possible.`
  },
  {
    id: "4",
    title: "The Rogue Planet Heading Toward Our Solar System",
    topic: "rogue planet approaching solar system",
    niche: "space",
    tone: "dramatic",
    desc: `REFERENCE STYLE: Scientific CGI object centered over Earth's curve, with a technical label placed directly ON the object.

MANDATORY COMPOSITION: center_statement but positioned ON the subject. The AI image MUST show a massive, dark, ominous rogue planet floating above the curved blue edge of Earth in deep black space. The planet should be rough, cratered, dark reddish-brown, and HUGE relative to Earth's visible curve below. Stars scattered in the black void.

TEXT APPROACH: The text "ROGUE" should be placed DIRECTLY ON or overlapping the planet itself — like a scientific label or specimen designation. Position it at the center of the frame where the planet is (around x:50, y:30-40, align:center). Use white text, massive font. NO banner, NO secondary text. The scientific labeling approach (like tagging an astronomical object) creates clinical authority.

Cold, clinical color palette — black void, dark planet, blue Earth glow. No warm colors. This should feel like a NASA visualization, not a sci-fi movie poster.`
  },
  {
    id: "5",
    title: "The Virus That Erased an Entire Country's Data",
    topic: "Shamoon virus Saudi Arabia cyberattack",
    niche: "tech",
    tone: "dark",
    desc: `REFERENCE STYLE: Pure centered iconic symbol with ZERO TEXT, near-monochrome with single red accent glow.

MANDATORY COMPOSITION: minimal_text_maximum_image — actually NO text at all. The AI image MUST be a large pixelated/blocky skull and crossbones rendered in white/gray pixel art style, centered in the frame against a near-black background (#0e0e12). The skull's eye sockets should have a deep red glow (#cc2222) that radiates outward. Faint digital code/IP addresses barely visible in the dark background. The pixel art style specifically evokes computing/digital culture.

TEXT: ABSOLUTELY NONE. Zero text elements, zero banners. The skull IS the message. The video title provides all context. This deliberate absence of text is the creative choice — in a feed full of text-heavy thumbnails, a pure symbolic image stands out.

Add only a subtle vignette. The skull should fill 60-70% of the frame. Near-monochrome palette with the red eye glow as the ONLY color accent.`
  },
];

const baseDir = '/opt/videoforge/output';

for (const ch of challenges) {
  const outDir = path.join(baseDir, `thumb-creative-challenge-${ch.id}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n${"=".repeat(70)}`);
  console.log(`CHALLENGE ${ch.id}: "${ch.title}"`);
  console.log(`Reference style: ${ch.desc.split('\n')[0].replace('REFERENCE STYLE: ', '')}`);
  console.log("=".repeat(70));

  try {
    await generateThumbnailV2(outDir, ch.title, ch.topic, ch.desc, ch.niche, ch.tone);
    console.log(`\n✓ Challenge ${ch.id} done → ${outDir}/thumbnail-v2.png`);
  } catch (err) {
    console.error(`\n✗ Challenge ${ch.id} FAILED:`, err.message);
  }
}

console.log(`\n${"=".repeat(70)}`);
console.log("All challenges complete!");
console.log("=".repeat(70));
