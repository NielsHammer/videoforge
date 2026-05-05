#!/usr/bin/env node
/**
 * Smoke test for v2 modules 1 (run-logger) and 2 (fingerprint-reader).
 */
import { createRun } from '../src/v2/run-logger.js';
import {
  getAllFingerprints,
  getDistributions,
  getTopDevices,
  getVoiceMarkerPool,
  sampleHooks,
  sampleTasteInsights,
  getAllTitles,
  getSummaryForPrompt,
} from '../src/v2/fingerprint-reader.js';

console.log('=== fingerprint-reader smoke test ===\n');
const all = getAllFingerprints();
console.log(`Loaded: ${all.length} fingerprints`);

console.log('\n--- getDistributions() ---');
console.log(JSON.stringify(getDistributions(), null, 2));

console.log('\n--- getTopDevices(10) ---');
console.log(getTopDevices(10));

console.log('\n--- getVoiceMarkerPool(15) ---');
console.log(getVoiceMarkerPool(15));

console.log('\n--- sampleHooks(3) ---');
console.log(JSON.stringify(sampleHooks(3), null, 2));

console.log('\n--- sampleTasteInsights(3) ---');
console.log(JSON.stringify(sampleTasteInsights(3), null, 2));

console.log('\n--- getAllTitles() count ---');
console.log(`${getAllTitles().length} titles`);

console.log('\n--- getSummaryForPrompt() ---');
console.log(getSummaryForPrompt());

console.log('\n\n=== run-logger smoke test ===\n');
const run = createRun({ topic: 'smoke test', niche: 'test', targetSeconds: 120 });
console.log(`Created run: ${run.runId}`);
console.log(`Run dir: ${run.runDir}`);

run.logStep({
  index: 1,
  name: 'fake-title',
  input: { topic: 'smoke test' },
  prompt: 'This is a fake prompt.',
  response: 'This is a fake response.',
  output: { title: 'The Smoke Test That Almost Broke Everything' },
  model: 'claude-sonnet-4-6',
  usage: { input_tokens: 500, output_tokens: 100 },
  elapsedMs: 1200,
});

run.logStep({
  index: 2,
  name: 'fake-script',
  input: { title: 'The Smoke Test That Almost Broke Everything' },
  output: { script_preview: 'It was a dark and stormy night...' },
  model: 'claude-sonnet-4-6',
  usage: { input_tokens: 800, output_tokens: 1500 },
  elapsedMs: 4800,
});

run.finish('completed');

console.log(`Total cost: $${run.meta.total_cost_usd.toFixed(4)}`);
console.log(`Total tokens: ${run.meta.total_input_tokens} in / ${run.meta.total_output_tokens} out`);
console.log(`Steps completed: ${run.meta.steps_completed.join(', ')}`);

console.log('\n\nSMOKE TEST PASSED.');
