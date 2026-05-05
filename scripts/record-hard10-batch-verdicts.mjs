// Niels's verdicts on v3-hard10: ALL 5 WINNERS.
// Pool moves from 24W+54L to 29W+54L.
import { approveFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  { outputDir: '/opt/videoforge/output/v3-hard10/self-surgery', reason: "WINNER. 'CUT HIMSELF OPEN' is visceral and emotional — you FEEL the horror. Antarctica visible in window. Statement→emotion fix worked." },
  { outputDir: '/opt/videoforge/output/v3-hard10/molasses-flood', reason: "WINNER. 'STILL SMELLS' — present-tense eerie hook, no more breakfast association. Incredible brown wave image." },
  { outputDir: '/opt/videoforge/output/v3-hard10/dyatlov-pass', reason: "WINNER. 'WHAT MADE THEM RUN' — dread question, makes you need to know. Damaged tent in moonlit snow." },
  { outputDir: '/opt/videoforge/output/v3-hard10/aral-sea', reason: "WINNER. 'GONE IN ONE LIFE' — personal scale, ships in desert. Instant tragic understanding." },
  { outputDir: '/opt/videoforge/output/v3-hard10/wow-signal', reason: "WINNER. 'ONLY ONCE' — dread + wonder in two words. Something extraordinary, never repeated." }
];

const before = { w: (await loadWinners()).length, l: (await loadLosers()).length };
console.log(`Pool BEFORE: winners=${before.w} losers=${before.l}`);
for (const w of winners) {
  await approveFromCli({ outputDir: w.outputDir, reason: w.reason });
  console.log(`+ ${w.outputDir.split('/').pop()} → winners`);
}
const after = { w: (await loadWinners()).length, l: (await loadLosers()).length };
console.log(`Pool AFTER: winners=${after.w} losers=${after.l}`);
