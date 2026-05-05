#!/usr/bin/env node
/**
 * End-to-end test of pipeline v2.
 * Generates: title → script (arc + write) → bible → storyboard → critic verdict.
 * Stops before render. All artifacts written to runs/<id>/.
 */
import { runPipelineV2 } from '../src/v2/pipeline-v2.js';

const TOPIC = 'How Japan almost nuked the US with balloon bombs in WWII';
const NICHE = 'history';
const TARGET_SECONDS = 120;

const pkg = await runPipelineV2({
  topic: TOPIC,
  niche: NICHE,
  targetSeconds: TARGET_SECONDS,
});

console.log('\n\n═══════════════════ FULL PACKAGE SUMMARY ═══════════════════\n');
console.log(`TITLE:\n  ${pkg.title}\n`);
console.log(`OPENING SENTENCE:\n  ${pkg.opening_sentence}\n`);
console.log(`CALLBACK SENTENCE:\n  ${pkg.callback_sentence}\n`);
console.log(`SCRIPT (${pkg.script_word_count} words, in_range=${pkg.script_word_count_in_range}):\n${pkg.script}\n`);
console.log(`SUBJECT ANCHOR: ${pkg.bible.subject_anchor}`);
console.log(`TONE: ${pkg.bible.tone}`);
console.log(`MUST APPEAR: ${JSON.stringify(pkg.bible.must_appear)}`);
console.log(`BANNED IMAGERY: ${JSON.stringify(pkg.bible.banned_imagery)}\n`);
console.log(`STORYBOARD (${pkg.storyboard.length} scenes):`);
for (const s of pkg.storyboard) {
  const v = s.visual_type === 'ai_image'
    ? `AI: ${s.ai_image?.prompt?.slice(0, 90)}`
    : s.visual_type === 'stock_search'
    ? `STOCK: ${s.stock_search?.query}`
    : `ANIM: ${s.animation?.component}`;
  console.log(`  [${String(s.index).padStart(2)}] (${s.estimated_seconds}s) ${v}`);
  console.log(`       narration: "${s.narration.slice(0, 100)}${s.narration.length > 100 ? '...' : ''}"`);
  console.log(`       why: ${s.reasoning}`);
}
console.log(`\nCRITIC VERDICT: ${pkg.critic_verdict.verdict.toUpperCase()}`);
console.log(`  topic_identity:     ${pkg.critic_verdict.gate_scores.topic_identity.score}/10 — ${pkg.critic_verdict.gate_scores.topic_identity.notes}`);
console.log(`  narrative_coherence: ${pkg.critic_verdict.gate_scores.narrative_coherence.score}/10 — ${pkg.critic_verdict.gate_scores.narrative_coherence.notes}`);
console.log(`  visual_variety:     ${pkg.critic_verdict.gate_scores.visual_variety.score}/10 — ${pkg.critic_verdict.gate_scores.visual_variety.notes}`);
console.log(`  pacing:             ${pkg.critic_verdict.gate_scores.pacing.score}/10 — ${pkg.critic_verdict.gate_scores.pacing.notes}`);
console.log(`\nBIGGEST WIN:  ${pkg.critic_verdict.biggest_win}`);
console.log(`BIGGEST RISK: ${pkg.critic_verdict.biggest_risk}`);
console.log(`\nOVERALL: ${pkg.critic_verdict.overall_review}`);
if (pkg.critic_verdict.critical_issues?.length) {
  console.log(`\nCRITICAL ISSUES:`);
  for (const i of pkg.critic_verdict.critical_issues) {
    console.log(`  scenes ${i.scene_indices.join(',')} [${i.gate}]: ${i.problem}`);
    console.log(`    fix: ${i.fix_suggestion}`);
  }
}
console.log(`\nTOTAL COST: $${pkg.totals.cost_usd.toFixed(4)}`);
console.log(`TOKENS:     ${pkg.totals.input_tokens} in / ${pkg.totals.output_tokens} out`);
