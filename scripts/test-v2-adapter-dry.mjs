#!/usr/bin/env node
/**
 * Dry-run the storyboard adapter on the last brain-only run, with synthetic
 * word timestamps, to verify the clip schema is well-formed before burning
 * 10+ minutes on a real render.
 */
import fs from 'fs';
import path from 'path';
import { makeStoryboardAdapter } from '../src/v2/storyboard-adapter.js';

const RUNS = '/opt/videoforge/runs';
const lastRun = fs.readdirSync(RUNS)
  .filter(d => d.includes('how-japan'))
  .sort()
  .pop();

if (!lastRun) {
  console.error('no brain run found');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(RUNS, lastRun, 'storyboard.json'), 'utf8'));
console.log(`using run: ${lastRun}`);
console.log(`script words: ${pkg.script.split(/\s+/).length}`);
console.log(`scenes: ${pkg.storyboard.length}\n`);

// Build synthetic word timestamps at ~170 wpm (~0.35s per word)
const words = pkg.script.split(/\s+/).filter(Boolean);
const WPS = 170 / 60;
const wordTimestamps = words.map((w, i) => ({
  word: w,
  start: i / WPS,
  end: (i + 1) / WPS,
}));
const totalDuration = words.length / WPS;
console.log(`synthetic: ${words.length} words, ${totalDuration.toFixed(1)}s total duration`);

const adapter = makeStoryboardAdapter({
  v2Storyboard: pkg.storyboard,
  v2Bible: pkg.bible,
  runLogger: null,
  startStep: 99,
});

const result = await adapter({
  scriptText: pkg.script,
  wordTimestamps,
  totalDuration,
  topic: pkg.title,
  orderBrief: { niche: 'history' },
});

console.log(`\nclips produced: ${result.clips.length}`);
console.log(`videoBible keys: ${Object.keys(result.videoBible).join(', ')}\n`);

// Verify every clip has the required fields
const required = ['start_time', 'end_time', 'visual_type', 'text', 'subtitle_words'];
let allValid = true;
for (let i = 0; i < result.clips.length; i++) {
  const c = result.clips[i];
  const missing = required.filter(f => c[f] === undefined);
  if (missing.length > 0) {
    console.log(`  ❌ clip ${i}: missing ${missing.join(', ')}`);
    allValid = false;
  }
  if (c.end_time <= c.start_time) {
    console.log(`  ❌ clip ${i}: end<=start (${c.start_time}, ${c.end_time})`);
    allValid = false;
  }
  if (i > 0 && result.clips[i - 1].end_time > c.start_time) {
    console.log(`  ❌ clip ${i}: overlaps previous (prev end ${result.clips[i - 1].end_time}, this start ${c.start_time})`);
    allValid = false;
  }
}

// Clip summary
console.log('\nclip summary:');
for (const c of result.clips) {
  console.log(`  [${String(c.scene_index_v2).padStart(2)}] ${c.start_time.toFixed(1)}s-${c.end_time.toFixed(1)}s (${(c.end_time - c.start_time).toFixed(1)}s) ${c.visual_type.padEnd(18)} ${(c.ai_prompt || c.search_query || JSON.stringify({...c, start_time:0,end_time:0,text:'',subtitle_words:0,reasoning_v2:'',scene_index_v2:0,visual_type:'',display_style:''})).slice(0, 80)}`);
}

console.log('\nvideoBible:');
console.log(`  setting: ${result.videoBible.setting}`);
console.log(`  era: ${result.videoBible.era} (${result.videoBible.era_specific})`);
console.log(`  visual_tone: ${result.videoBible.visual_tone}`);
console.log(`  image_search_prefix: ${result.videoBible.image_search_prefix}`);
console.log(`  banned_visuals: ${result.videoBible.banned_visuals.length} items`);
console.log(`  key_visual_moments: ${result.videoBible.key_visual_moments.length} items`);

console.log(`\n${allValid ? '✅ ALL CLIPS VALID — safe to render' : '❌ INVALID CLIPS — fix adapter before rendering'}`);
