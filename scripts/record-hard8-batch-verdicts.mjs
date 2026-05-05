// Niels's verdicts on the v3-hard8 batch.
// 1 winner (atacama), 4 losers. Tacoma + mirrors RETIRED (too many attempts).
// Pool moves from 21W+47L to 22W+51L.
import { rejectFromCli, approveFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  {
    outputDir: '/opt/videoforge/output/v3-hard8/atacama',
    reason: "WINNER. 'NEVER SEEN RAIN' over desert town with cracked earth instantly communicates a place where rain doesn't exist. Simple hook, makes you curious. The image IS the topic."
  }
];

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-hard8/tacoma-bridge',
    reason: "RETIRED TOPIC. '42 MPH' is a fact not a feeling — nobody cares about wind speed numbers. B&W color grading makes it look old and boring. The hook should make people FEEL the drama (massive bridge destroyed itself in normal wind) not cite a measurement."
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard8/self-surgery',
    reason: "VERY CLOSE but missing Antarctica context. The surgeon with intense eyes and blood on scrubs is powerful. 'HIS OWN ORGANS' is visceral and clear. But nothing in the image says Antarctica — no snow, no ice, no remote station. That context is what makes the story extraordinary. Needs Antarctic setting visible."
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard8/mirrors',
    reason: "RETIRED TOPIC. 'INSIDE OUT' makes zero sense for a mirror video — sounds like the Pixar movie. The mirror concept is inherently unvisualizable for thumbnails. 3+ attempts, system can't crack it."
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard8/underground-city',
    reason: "'200,000 BURIED' sounds like a mass grave, not a city built on top of another city. The hook is misleading and creates the wrong expectation. The cross-section image was interesting but the hook killed it."
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
