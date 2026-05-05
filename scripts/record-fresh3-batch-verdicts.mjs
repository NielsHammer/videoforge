// Niels's verdicts on the v3-fresh3 batch.
// 2 WINNERS (SR-71, Tonga), 1 NO (blue whale).
// Pool moves from 16W+30L to 18W+31L.
import { approveFromCli, rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  {
    outputDir: '/opt/videoforge/output/v3-fresh3/sr71',
    reason: "WINNER. Full-bleed SR-71 in flight with afterburners glowing, massive white text at the bottom. Clean, powerful, NO banners. 'MISSILES STARVED' instantly tells you this plane was so fast nothing could catch it — the image does the storytelling, the text adds the emotional punch. This is the quality bar for combat/aviation history: ONE hero photo of the actual machine, ONE high-contrast plain-English feeling-hook, ZERO supporting text.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh3/tonga',
    reason: "WINNER. The eruption column image is breathtaking and 'PUNCHED THROUGH' (without 'INTO SPACE') is actually stronger — shorter, more violent, lets the image show you what it punched through. NO banners, no clutter. Just the eruption and two words. Lesson: when the image already shows the destination/object, the hook should NOT name it again — let the image carry the noun, the hook carries the verb. Two-word hooks beat three-word hooks when the image fills in the missing word.",
  },
];

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-fresh3/blue-whale',
    reason: "Image was the problem this time, not the hook. Aerial shot of a whale barely visible in dark water is BORING at thumbnail size — 168x94 just looks like dark green with white text floating on it, no readable subject. The viewer can't tell from the thumbnail that this is about a WHALE or what they're about to watch. The previous attempt's open-mouth close-up was much stronger — that image had a clear, instantly-recognizable subject filling the frame. Lesson for whale/animal topics: ALWAYS use a close-up of the animal's recognizable feature (mouth, eye, face), filling at least 60% of the frame. NEVER an aerial/distant shot where the subject is small. The thumbnail must show the SUBJECT, not the subject's environment.",
  },
];

console.log('Pool BEFORE: winners=' + loadWinners().length + ' losers=' + loadLosers().length);
for (const v of winners) {
  try {
    const r = approveFromCli(v);
    console.log('  ✓ ' + v.outputDir.split('/').pop() + ' → winners=' + r.pool_size);
  } catch (e) {
    console.log('  ! ' + v.outputDir.split('/').pop() + ' FAILED: ' + e.message);
  }
}
for (const v of losers) {
  try {
    const r = rejectFromCli(v);
    console.log('  + ' + v.outputDir.split('/').pop() + ' → losers=' + r.pool_size);
  } catch (e) {
    console.log('  ! ' + v.outputDir.split('/').pop() + ' FAILED: ' + e.message);
  }
}
console.log('Pool AFTER:  winners=' + loadWinners().length + ' losers=' + loadLosers().length);
