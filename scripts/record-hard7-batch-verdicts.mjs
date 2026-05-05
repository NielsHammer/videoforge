// Niels's verdicts on the v3-hard7 batch.
// ALL 5 are losers. Hook brainstormer rewrite improved hooks but broke images.
// The brainstormer correctly identified what's interesting and what image should appear,
// but the PLANNER ignored it and produced generic/atmospheric images instead.
// Pool moves from 21W+42L to 21W+47L.
import { rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-hard7/tacoma-bridge',
    reason: "Black and white static bridge photo with '42 MPH'. Doesn't show the bridge COLLAPSING or TWISTING. The famous Tacoma Narrows footage shows the bridge violently warping and breaking apart — that's the image that would stop someone scrolling. The brainstormer correctly said 'iconic footage of the bridge twisting violently' but the planner produced a static bridge photo. The image must show the DRAMATIC MOMENT, not a generic postcard of the subject.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard7/atacama',
    reason: "Empty desert landscape with text. WHERE ARE THE KIDS? WHERE IS THE RAIN? The brainstormer correctly identified 'children freeze in terror encountering rain for the first time' as the interesting thing, but the planner showed an empty desert with nobody in it. The hook says 'KIDS FEAR RAIN' but there are no kids and no rain. Show the actual interesting thing — the human reaction, the specific surprising moment from the script.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard7/self-surgery',
    reason: "Man with stitches and a random circle overlay pointing at nothing. Looks like a medical stock photo. WHERE IS ANTARCTICA? WHERE IS THE MIRROR? WHERE IS THE SURGERY HAPPENING? The brainstormer said 'man performing surgery on his own abdomen' but the image shows someone AFTER surgery, not DURING. Also the circle overlay is BACK — we already established these are noise that looks like rendering glitches. The dramatic moment is a man cutting into his own body with a mirror — show THAT.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard7/mirrors',
    reason: "Girl holding a 'MIRROR' sign in a bathroom. Looks like a school project, not a compelling thumbnail. The concept of mirrors not actually flipping is mind-bending but this image captures none of it. The brainstormer said 'person looking at their reflection, possibly with hands raised to show the reversal' — even that would have been better than a sign.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard7/underground-city',
    reason: "Nice aerial city photo at sunset. Nothing tells you there's an ancient city underneath. No sense of layers, no ruins visible, no sinking. The brainstormer said 'aerial or composite showing Mexico City with Aztec ruins visible beneath' — the planner just showed a normal city. The interesting thing is the LAYERS — old city under new city — and the image must show that somehow.",
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
