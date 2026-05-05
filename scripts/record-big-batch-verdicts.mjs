// Niels's verdicts on v3-big-batch: 19 WINNERS, 1 FAILED (human-eli5 didn't pass critic).
// Pool moves from 29W+54L to 48W+55L.
import { approveFromCli, rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  'pompeii-bread', 'mariana-sound', 'haber-paradox', 'door-to-hell',
  'stanford-prison', 'lake-nyos', 'voyager-pale-blue-dot', 'bridge-of-death',
  'tree-of-tenere', 'dancing-plague', 'zone-of-silence', 'rat-king',
  'silent-twins', 'centralia-fire', 'bloop', 'nazi-gold-train',
  'cotard-delusion', 'seed-vault', 'tarrare'
].map(slug => ({
  outputDir: `/opt/videoforge/output/v3-big-batch/${slug}`,
  reason: `WINNER (big batch). Niels: "loved them all."`
}));

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-big-batch/human-eli5',
    reason: "Failed critic (2/10, 3 attempts). Fully abstract philosophical topic with no physical subject — same class as mirrors/Riemann. System can't thumbnail pure concepts."
  }
];

const before = { w: (await loadWinners()).length, l: (await loadLosers()).length };
console.log(`Pool BEFORE: winners=${before.w} losers=${before.l}`);
for (const w of winners) {
  await approveFromCli({ outputDir: w.outputDir, reason: w.reason });
}
for (const l of losers) {
  await rejectFromCli({ outputDir: l.outputDir, reason: l.reason });
}
const after = { w: (await loadWinners()).length, l: (await loadLosers()).length };
console.log(`Pool AFTER: winners=${after.w} losers=${after.l}`);
console.log(`Added ${after.w - before.w} winners, ${after.l - before.l} losers`);
