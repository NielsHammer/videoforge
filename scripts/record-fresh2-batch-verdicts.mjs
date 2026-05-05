// Niels's verdicts on the v3-fresh2 batch.
// 2 WINNERS (Knight, Hilbert), 3 NOs (SR-71, Tonga, Blue whale).
// Pool moves from 14W+27L to 16W+30L.
import { approveFromCli, rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  {
    outputDir: '/opt/videoforge/output/v3-fresh2/knight',
    reason: "WINNER. Shopping cart crashing through a stock exchange with fire and flying money is a brilliant visual metaphor for runaway algorithmic buying. 'IT KEPT BUYING' is clean, simple, tells the story without context. NO unnecessary banner. This is the quality bar for abstract finance topics: a single concrete metaphor that physicalizes the abstract failure, plus a hook that's a complete sentence in 3 words.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh2/hilbert',
    reason: "WINNER. Infinite hotel corridor vanishing into fog with 'STILL FULL' is eerie and immediately communicates the paradox without any math notation. The infinity symbol on the door is subtle enough to work as flavor without being jargon. Clean, atmospheric, no forced banners. This is the quality bar for abstract math topics: plain-English hook over an atmospheric architectural image, ZERO equations.",
  },
];

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-fresh2/sr71',
    reason: "Image is gorgeous — full-bleed SR-71 in flight with afterburners, exactly right. But '4,000 MISSED' doesn't land emotionally. Missed WHAT? 4,000 of WHAT? The number triggers nothing because there's no context for what was missed. The earlier 'STILL UNBEATEN' hook was actually stronger because it made you FEEL something instantly without requiring math or context. Lesson: a number-based hook only works if the noun the number attaches to is OBVIOUS from the image. '4,000 MISSED' over a plane = ambiguous noun. Default to feeling-hooks ('STILL UNBEATEN', 'NEVER CAUGHT', 'OUTRAN MISSILES') over orphaned-number hooks for combat/aviation topics where the relevant count isn't visible in the image.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh2/tonga',
    reason: "Image is close to winner quality — the eruption column photo is incredible. But 'PUNCHED INTO SPACE' is awkward — volcanoes don't punch. And the '57 KM UP' banner is irrelevant context-without-meaning that nobody processes at a glance. Without the banner and with a more visceral natural hook ('REACHED SPACE', 'BROKE THE SKY', 'TOUCHED ORBIT'), this image could carry a winner. Lesson: hook verbs must match what the subject actually DOES — volcanoes erupt/explode/blast, they don't 'punch'. AND the banner '57 KM UP' is the same context-without-meaning failure as '45 MINUTES' from last batch.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh2/blue-whale',
    reason: "Three problems: (1) the red line drawn across the middle of the image looks like a rendering glitch, not a design element; (2) the '20 SECONDS' banner is the SAME generic red rectangle that keeps appearing on every thumbnail — it is STILL being forced and STILL looks identical every time, even though the previous-session rule was supposed to fix this; (3) 'STOPS BEATING' as red text on a blue/teal underwater scene clashes instead of contrasting (red and teal are complementary but the saturation is wrong — it fights the image instead of popping out of it). Lesson: banner default must be HARD ZERO. Not 'rare', not 'justified' — ZERO. AND if a banner ever appears, it must look unique to THIS thumbnail — never the generic red rectangle that has appeared on three batches in a row.",
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
