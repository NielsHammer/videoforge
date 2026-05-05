// Record Niels's verdicts on the v3-mixed batch.
// All 5 are NO (losers) but with nuance — Color and Cantor are "near-winners"
// failing on a single execution detail. Captured here so the pool learns
// the precise reason and can avoid the same trap.
import { rejectFromCli, loadLosers } from '../src/thumbnail-learning-pool.js';

const verdicts = [
  {
    outputDir: '/opt/videoforge/output/v3-mixed/color',
    reason: "NEAR-WINNER. Concept is perfect (macro eye + gold padlock in iris) and 'YOUR BRAIN BLOCKS IT' is the right hook. The ONLY failure is text spacing — 'BLOCKS' and 'IT' are mushed together and become unreadable at thumbnail size. Don't change concept/image/hook — fix kerning/word-spacing and this becomes a winner. Lesson: enforce minimum word spacing programmatically.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-mixed/cantor',
    reason: "NEAR-WINNER. Cinematic image (man kneeling at massive door, light streaming in) is genuinely stunning and 'HE BEGGED' creates immediate empathy/curiosity. The ONLY thing killing it is the aleph symbol badge in the top right — 99% of viewers don't know that symbol so it reads as a confusing yellow square. Lesson: NEVER use a badge containing a symbol that requires specialized knowledge. Remove the badge and this is a winner.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-mixed/country',
    reason: "'0 COUNTRIES' badge means nothing to the viewer. 'THE VOID' badge means nothing. The gavel image is generic. A viewer scrolling past has no idea what country, what prosecution, or why they should care. Lesson: badges with abstract/null values ('0 of X', 'THE VOID') convey nothing — they're decorative noise.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-mixed/internet-bug',
    reason: "Scared face in phone screen is too dark and chaotic. '$4.7 TRILLION GONE' doesn't tell the viewer what happened — trillion of what? Gone where? '9 HOURS' badge adds nothing without context. Lesson: a number hook needs a noun anchor in the same glance ('$4.7T DELETED' or similar) and the image must be bright/clean enough to read at 168x94.",
  },
  {
    outputDir: '/opt/videoforge/output/v3-mixed/riemann',
    reason: "Crumbling Fields Medal looks like a sports endurance video. 'FIELDS MEDALIST' badge means nothing to normal viewers. THIRD failed Riemann attempt — abandon Riemann entirely. Lesson: abstract math topics with no visual hook keep failing because every metaphor either requires math literacy (Fields Medal, aleph) or reads as a different topic (sports, war). Skip math topics that lack a concrete visual.",
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
