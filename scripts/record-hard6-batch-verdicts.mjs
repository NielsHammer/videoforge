// Niels's verdicts on the v3-hard6 batch.
// ALL 5 are losers. Core problem: hooks optimize for cleverness, not clarity+promise.
// Blue whale and last-speaker RETIRED from future batches (too many attempts).
// Pool moves from 21W+37L to 21W+42L.
import { rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-hard6/blue-whale',
    reason: "RETIRED TOPIC (5th attempt). 'IT STOPS' still doesn't tell you this is about a WHALE. It's just a heart — could be medical, horror, anything. The hook brainstormer locked onto this hook across two batches, proving it's a systemic scoring problem: the brainstormer rewards 'clever reactive phrases' over 'words that make you understand the topic and want to click.' A hook is a PROMISE about what you'll learn, not poetry.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard6/last-speaker',
    reason: "RETIRED TOPIC (4th attempt, worst score yet at 2/10). 'SHE FORGETS' — same problem as every other attempt. The system cannot visualize 'dying language' and keeps producing vague-emotion + elder-portrait combinations. Dropping this topic from future batches.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard6/hudson-pilot',
    reason: "Shows a river and a skyline. WHERE IS THE PLANE? The video is about landing a plane on the Hudson River — the viewer needs to SEE a plane on water. 'BOTH ENGINES DEAD' describes a mechanical failure, but doesn't make you feel the HUMAN STAKES. The hook should make you feel what the pilot and 155 passengers felt. 'MISSILES STARVED' worked because you instantly understand the SR-71 was too fast — 'BOTH ENGINES DEAD' fails because without seeing a plane, you don't know anyone was in danger. Lesson: the hook brainstormer is optimizing for 'reactive clever phrases' instead of 'words that make a viewer understand the topic and WANT to click.'",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard6/dubai-islands',
    reason: "Palm Jumeirah aerial is the right image but too dark. '$20B VANISHING' is vague — vanishing how? The video is about Dubai's islands SINKING. That's the hook — famous islands are actually sinking. The viewer should think 'wait, THOSE islands are sinking?' That's the click. The hook should name what's happening (sinking) not abstract it into financial jargon (vanishing).",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard6/empty-city',
    reason: "'ELEVATORS FOR NO ONE' — who cares about elevators? Nobody feels anything about elevators. The video is about a $500 BILLION ghost city. The hook should make people feel the ABSURDITY of that scale — the city, the money, the emptiness. Not a quirky detail about elevators.",
  },
];

console.log('Pool BEFORE: winners=' + loadWinners().length + ' losers=' + loadLosers().length);
for (const v of losers) {
  try {
    const r = rejectFromCli(v);
    console.log('  + ' + v.outputDir.split('/').pop() + ' → losers=' + r.pool_size);
  } catch (e) {
    console.log('  ! ' + v.outputDir.split('/').pop() + ' FAILED: ' + e.message);
  }
}
console.log('Pool AFTER:  winners=' + loadWinners().length + ' losers=' + loadLosers().length);
