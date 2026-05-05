// Record Niels's verdicts on the v3-fresh batch.
// All 5 are NO. Three are CLOSE-to-winner (Tonga, Blue whale, Knight)
// and two are clear losers (SR-71, Hilbert). Lessons captured per-thumbnail.
import { rejectFromCli, loadLosers } from '../src/thumbnail-learning-pool.js';

const verdicts = [
  {
    outputDir: '/opt/videoforge/output/v3-fresh/tonga',
    reason: "NEAR-WINNER. Satellite view of the eruption column reaching space is an incredible image and 'PUNCHED THROUGH' is a strong visceral hook. TWO problems: (1) text color blue blends into the sky/ocean — text must be high-contrast against the dominant image color, never a hue that lives inside the image; (2) 'PUNCHED' and 'THROUGH' are different colors, splitting what should be ONE unified punch of text. Lesson: hook text is ONE color, never split. Hook color must contrast with the image, never blend.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh/sr71',
    reason: "Two images layered on top of each other (hangar photo + sky photo + ejection seat) creates a confusing mess — the viewer can't parse what's happening. The 'AND LIVED' banner top-right is the only interesting element but it's tiny. Lesson: default to ONE clean hero image. Stacking 2+ photos in a single frame without a deliberate diptych/triptych composition creates visual chaos. If the planner needs 2 images, they must occupy clear separate regions, not overlap.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh/blue-whale',
    reason: "NEAR-WINNER. Open whale mouth is genuinely arresting and 'CRAWL INSIDE' is a perfect hook. TWO problems: (1) faint crosshair/circle overlay in the middle of the mouth adds nothing and reads as a UI glitch; (2) hook text positioned at extreme bottom edge gets lost against dark water. Lesson: NO decorative overlays (crosshairs, circles, vignette gradients, particle effects) — they look like rendering bugs. Hook text needs safe-zone positioning, never flush against an edge where it can be lost in image content.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh/hilbert',
    reason: "'∞ + ∞ = ∞' as the hook looks like a math textbook, not a YouTube thumbnail. Equations are too cerebral for a 0.05s glance — viewers won't process them. 'STILL FULL' at the bottom is small and gets lost. Needed ONE massive plain-language hook ('STILL FULL', 'INFINITE ROOMS', 'NEVER EMPTY') over the hallway. Lesson: NEVER use mathematical equations or symbols as the primary hook. Hooks are plain English words. Math notation is for textbooks. The viewer must FEEL the hook in 0.05s, not parse it.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-fresh/knight',
    reason: "NEAR-WINNER. Robot hand pressing 'BUY' button is a great visual metaphor and 'KEPT BUYING' works as a hook. TWO problems: (1) '45 MINUTES' banner top-right doesn't pass the 'wait, really?' test because there's no context — 45 minutes of WHAT? Without already knowing the story it's noise; (2) dollar bills in background are slightly too busy — focus should be entirely on the robot finger and the button. Lesson: BANNER FIX FROM LAST SESSION DID NOT GO FAR ENOUGH. Default = NO banner. Only add a banner if the planner can articulate in one sentence why a viewer who knows NOTHING about the topic would read it and think 'wait, really?'. Background elements should support, not compete with, the hero subject.",
  },
];

console.log('Pool losers BEFORE: ' + loadLosers().length);
for (const v of verdicts) {
  try {
    const r = rejectFromCli(v);
    console.log('  + ' + v.outputDir.split('/').pop() + ' → losers=' + r.pool_size);
  } catch (e) {
    console.log('  ! ' + v.outputDir.split('/').pop() + ' FAILED: ' + e.message);
  }
}
console.log('Pool losers AFTER: ' + loadLosers().length);
