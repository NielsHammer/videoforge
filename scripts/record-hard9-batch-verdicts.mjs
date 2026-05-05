// Niels's verdicts on v3-hard9.
// 2 winners (golden-record, elephants-foot), 3 losers. Underground-city RETIRED.
// Pool moves from 22W+51L to 24W+54L.
import { approveFromCli, rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  {
    outputDir: '/opt/videoforge/output/v3-hard9/golden-record',
    reason: "WINNER. 'OUTLASTS EARTH' over the golden record in space — existential scale, instant understanding, makes you need to know what's on it."
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard9/elephants-foot',
    reason: "WINNER. 'STILL KILLING' over the terrifying corium mass — 'Elephant's Foot' is the real name, the image is visceral, the hook communicates ongoing present-tense danger."
  }
];

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-hard9/molasses-flood',
    reason: "VERY CLOSE. Image is incredible — massive brown wave flooding Boston streets. But 'ENCASED IN SYRUP' confuses — 'syrup' triggers breakfast association, not disaster. One hook change away from winning. The word must evoke the horror, not the pantry."
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard9/underground-city',
    reason: "RETIRED TOPIC. 'KEEPS SURFACING' doesn't land — too vague, could be about anything. Drop this topic."
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard9/self-surgery',
    reason: "VERY CLOSE. Antarctica finally visible. But 'NO OTHER DOCTOR' is a STATEMENT not an EMOTION — it tells you a fact. 'HAD TO BE HIS OWN' would make you FEEL the desperation. One hook change away from winning."
  }
];

const before = { w: (await loadWinners()).length, l: (await loadLosers()).length };
console.log(`Pool BEFORE: winners=${before.w} losers=${before.l}`);

for (const w of winners) {
  await approveFromCli({ outputDir: w.outputDir, reason: w.reason });
  console.log(`+ ${w.outputDir.split('/').pop()} → winners`);
}
for (const l of losers) {
  await rejectFromCli({ outputDir: l.outputDir, reason: l.reason });
  console.log(`+ ${l.outputDir.split('/').pop()} → losers`);
}

const after = { w: (await loadWinners()).length, l: (await loadLosers()).length };
console.log(`Pool AFTER: winners=${after.w} losers=${after.l}`);
