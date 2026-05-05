// Niels's verdicts on the v3-hard5 batch.
// 2 WINNERS (blindfolded, typo-war), 2 NOs (blue-whale, last-speaker).
// Pool moves from 19W+35L to 21W+37L.
import { approveFromCli, rejectFromCli, loadWinners, loadLosers } from '../src/thumbnail-learning-pool.js';

const winners = [
  {
    outputDir: '/opt/videoforge/output/v3-hard5/blindfolded',
    reason: "WINNER. Blindfolded person with spiral walking path visible — the KEY VISUAL ELEMENT from the title is in the image. 'YOUR LEGS LIE' captures the surreal betrayal-by-your-own-body feeling. Topic is instantly identifiable: you see a blindfold, you see a spiral path, you read 'YOUR LEGS LIE' and you know this is about blindfolded walking going wrong. This is the gold standard for rule 13 (topic identity) — every element points to the same video.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard5/typo-war',
    reason: "WINNER. After 3 attempts this topic finally landed. '$14 TRILLION GONE' signals financial catastrophe instantly. The metaphor brainstorm produced 'single red zero on screen as lit fuse' which grounded the abstract topic visually. This proves that abstract history topics CAN work when the metaphor brainstorm finds the right physical anchor — the key is connecting the visual to CONSEQUENCES (money gone) rather than PROCESS (person typing).",
  },
];

const losers = [
  {
    outputDir: '/opt/videoforge/output/v3-hard5/blue-whale',
    reason: "Fourth attempt at blue whale, still not landing. 'IT STOPS' is ambiguous — what stops? The whale? The heart? The video? The hook doesn't connect to the video's actual premise which is SIZE — a heart bigger than a car, a heart you could climb inside. The whale image is atmospheric but the hook keeps drifting away from the scale/wonder angle that makes this video interesting. Every attempt has chosen a different emotional frame (crawl inside, organs shut down, organs go dark, it stops) but none have captured 'impossibly huge heart.'",
  },
  {
    outputDir: '/opt/videoforge/output/v3-hard5/last-speaker',
    reason: "Third attempt, still failing. '5,000 YEARS DIE' — the critic caught it: 'tells you WHEN, not WHAT or WHY.' The elder portrait is emotionally powerful but nothing signals LANGUAGE. The system keeps producing generic elderly-person-alone compositions when it needs a visual that specifically communicates speech/language/words disappearing. The last-speaker topic requires a visual element that screams 'language' — mouth speaking, text/writing dissolving, words fading — not just a sad portrait.",
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
