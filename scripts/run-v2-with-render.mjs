#!/usr/bin/env node
/**
 * Full v2 pipeline including actual video render.
 * Hands the storyboard off to the existing render layer and returns the watch URL.
 */
import { runPipelineV2WithRender } from '../src/v2/pipeline-v2-render.js';

const TOPIC = 'Why no one is allowed to go to Antarctica and what they are hiding';
const NICHE = 'mystery';
const TARGET_SECONDS = 120;
const TONE = 'upbeat';

const result = await runPipelineV2WithRender({
  topic: TOPIC,
  niche: NICHE,
  targetSeconds: TARGET_SECONDS,
  tone: TONE,
});

console.log('\n\n═══════════════════════════════════════');
console.log('  🎬 WATCH THE VIDEO');
console.log('═══════════════════════════════════════');
console.log(`  ${result.watch_url}`);
console.log('═══════════════════════════════════════\n');

process.exit(0);
