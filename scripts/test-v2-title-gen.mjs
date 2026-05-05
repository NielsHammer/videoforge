#!/usr/bin/env node
/**
 * End-to-end test: title generator v2.
 */
import { createRun } from '../src/v2/run-logger.js';
import { generateTitle } from '../src/v2/title-generator-v2.js';

const TOPIC = 'How Japan almost nuked the US with balloon bombs in WWII';

console.log(`Topic: ${TOPIC}\n`);

const run = createRun({
  topic: TOPIC,
  niche: 'history',
  targetSeconds: 120,
});
console.log(`Run: ${run.runId}\n`);

const result = await generateTitle({
  topic: TOPIC,
  niche: 'history',
  run,
  startStep: 1,
});

console.log('=== CANDIDATES ===');
for (let i = 0; i < result.candidates.length; i++) {
  const c = result.candidates[i];
  console.log(`\n${i + 1}. ${c.title}`);
  console.log(`   pattern: ${c.pattern}`);
  console.log(`   ${c.reasoning}`);
}

console.log('\n=== SCORED ===');
for (const s of result.selection.scored_candidates) {
  const mark = s.index === result.selection.winner_index ? '⭐' : '  ';
  console.log(`${mark} [${s.total}] ${s.title}`);
  console.log(`     cur:${s.curiosity} clr:${s.topic_clarity} emo:${s.emotion} spec:${s.specificity}  — ${s.notes}`);
}

console.log(`\n=== WINNER ===\n${result.title}\n`);
console.log(`Why: ${result.selection.why_it_won}`);
console.log(`Rejected alt: ${result.selection.rejected_strongest_alternative}`);

run.finish('title-test-complete');

console.log(`\nRun dir: ${run.runDir}`);
console.log(`Total cost: $${run.meta.total_cost_usd.toFixed(4)}`);
console.log(`Total tokens: ${run.meta.total_input_tokens} in / ${run.meta.total_output_tokens} out`);
