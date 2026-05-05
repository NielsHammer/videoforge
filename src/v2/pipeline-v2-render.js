/**
 * Pipeline v2 with render (iteration 2).
 *
 * Flow:
 *   1. v2 brain (fast, no timestamps needed) — title, script (with retry), bible
 *   2. write script to disk
 *   3. call existing generateVideo with a storyboardAdapter callback
 *      — inside that callback, once voiceover is ready and we have real word
 *      timestamps, we run the v2 planner and critic, then map to clips
 *   4. return public URL
 */
import fs from 'fs';
import path from 'path';
import { createRun } from './run-logger.js';
import { generateTitle } from './title-generator-v2.js';
import { generateScript } from './script-generator-v2.js';
import { buildVideoBible } from './video-bible-v2.js';
import { planStoryboard } from './storyboard-planner-v2.js';
import { critiqueStoryboard } from './storyboard-critic-v2.js';
import { makeV2StoryboardCallback } from './storyboard-adapter.js';
import { generateWishlist } from './infographic-wishlist.js';
import { generateVideo } from '../pipeline.js';
import {
  initLiveRun,
  updateStep,
  completeStep,
  updateTotals,
  finishLiveRun,
  LIVE_DASHBOARD_URL,
} from './live-progress.js';

// Tone → (pacing, script density, voice) mapping.
// Each tone shapes the whole pipeline: voice speed/stability AND how dense the
// writer should pack the script AND which words/phrases the arc prefers.
const TONE_PRESETS = {
  documentary: {
    pacing: { speed: 1.02, stability: 0.55, style: 0.30, label: 'v2 documentary' },
    words_per_minute: 145,
    vibe: 'measured, authoritative, weight and specificity, pauses between facts feel earned',
  },
  upbeat: {
    pacing: { speed: 1.08, stability: 0.50, style: 0.45, label: 'v2 upbeat' },
    words_per_minute: 160,
    vibe: 'high energy, conversational, forward momentum, snappy transitions, direct-to-camera confidence',
  },
  energetic: {
    pacing: { speed: 1.12, stability: 0.45, style: 0.55, label: 'v2 energetic' },
    words_per_minute: 175,
    vibe: 'rapid fire, punchy, personality-driven, short sentences, minimal breathing room',
  },
};

const OUTPUT_ROOT = '/opt/videoforge/output';
const SCRIPT_TMP_DIR = '/opt/videoforge/output/v2-scripts';
const WATCH_URL_BASE = 'https://files.tubeautomate.com/watch';

export async function runPipelineV2WithRender({
  topic,
  niche = null,
  targetSeconds = 120,
  titleOverride = null,
  tone = 'documentary',
}) {
  if (!topic) throw new Error('topic required');
  const tonePreset = TONE_PRESETS[tone] || TONE_PRESETS.documentary;
  if (!fs.existsSync(SCRIPT_TMP_DIR)) fs.mkdirSync(SCRIPT_TMP_DIR, { recursive: true });

  const run = createRun({ topic, niche, targetSeconds });
  initLiveRun({ runId: run.runId, topic, targetSeconds });
  console.log(`\n🎬 pipeline-v2 iteration 3 — ${run.runId}`);
  console.log(`   topic : ${topic}`);
  console.log(`   length: ${targetSeconds}s`);
  console.log(`   📺 live dashboard: ${LIVE_DASHBOARD_URL}`);

  let stepCursor = 1;

  // 1. TITLE
  let title;
  if (titleOverride) {
    title = titleOverride;
    run.logStep({
      index: stepCursor++,
      name: 'title-override',
      input: { topic },
      output: { title },
      elapsedMs: 0,
    });
    console.log(`\n1️⃣  title (override): "${title}"`);
    completeStep('1-title', title);
  } else {
    console.log('\n1️⃣  generating title...');
    updateStep('1-title');
    const t = await generateTitle({ topic, niche, run, startStep: stepCursor });
    title = t.title;
    stepCursor = t.next_step_index;
    console.log(`   → "${title}"`);
    completeStep('1-title', title);
    updateTotals({
      input_tokens: run.meta.total_input_tokens,
      output_tokens: run.meta.total_output_tokens,
      cost_usd: run.meta.total_cost_usd,
    });
  }

  // 2. SCRIPT — with word count retry
  console.log(`\n2️⃣  planning arc + writing script [tone=${tone}, wpm=${tonePreset.words_per_minute}]...`);
  updateStep('2-script-arc');
  const scriptResult = await generateScript({
    title, topic, niche, targetSeconds, run, startStep: stepCursor,
    wordsPerMinute: tonePreset.words_per_minute,
    toneVibe: tonePreset.vibe,
  });
  stepCursor = scriptResult.next_step_index;
  console.log(`   → ${scriptResult.word_count} words (target ${scriptResult.arc.target_word_count}, in_range=${scriptResult.word_count_in_range}, attempts=${scriptResult.script_attempts})`);
  completeStep('2-script-arc', `${scriptResult.word_count}w (arc: ${scriptResult.arc.opening_gambit})`);
  completeStep('3-script-write', `${scriptResult.word_count}w after ${scriptResult.script_attempts} attempt(s)`);
  updateTotals({
    input_tokens: run.meta.total_input_tokens,
    output_tokens: run.meta.total_output_tokens,
    cost_usd: run.meta.total_cost_usd,
  });

  // 3. BIBLE
  console.log('\n3️⃣  building video bible...');
  updateStep('4-video-bible');
  const bibleResult = await buildVideoBible({
    title, topic, niche,
    arc: scriptResult.arc,
    script: scriptResult.script,
    run,
    startStep: stepCursor,
  });
  stepCursor = bibleResult.next_step_index;
  const bibleLabel = bibleResult.bible.narrative_center || bibleResult.bible.subject_anchor || '';
  console.log(`   → narrative center: "${bibleLabel}"`);
  completeStep('4-video-bible', bibleLabel);
  updateTotals({
    input_tokens: run.meta.total_input_tokens,
    output_tokens: run.meta.total_output_tokens,
    cost_usd: run.meta.total_cost_usd,
  });

  // 4. SAVE BRAIN ARTIFACTS SO FAR
  fs.writeFileSync(path.join(run.runDir, 'brain.json'), JSON.stringify({
    title,
    topic,
    niche,
    target_seconds: targetSeconds,
    arc: scriptResult.arc,
    script: scriptResult.script,
    script_word_count: scriptResult.word_count,
    bible: bibleResult.bible,
  }, null, 2));

  // 5. WRITE SCRIPT TO DISK FOR EXISTING RENDER LAYER
  const projectName = `v2-${run.runId}`;
  const scriptPath = path.join(SCRIPT_TMP_DIR, `${projectName}.txt`);
  fs.writeFileSync(scriptPath, scriptResult.script);
  console.log(`\n4️⃣  script written to ${scriptPath}`);

  // 6. BUILD STORYBOARD ADAPTER CALLBACK (planner + critic fire inside)
  const adapter = makeV2StoryboardCallback({
    planStoryboard,
    critiqueStoryboard,
    v2Bible: bibleResult.bible,
    title,
    run,
    stepCursorStart: stepCursor,
  });

  console.log('\n5️⃣  handing to existing render layer (voiceover → planner → critic → images → Remotion)...');
  console.log('      this takes 5-15 minutes.\n');
  updateStep('5-voiceover');

  const renderStart = Date.now();
  try {
    await generateVideo(scriptPath, {
      output: OUTPUT_ROOT,
      topic: title,
      niche: niche || '',
      theme: 'blue_grid',
      storyboardAdapter: adapter,
      skipScriptEnhance: true,
      forcePacing: tonePreset.pacing,
    });
  } catch (err) {
    run.logStep({
      index: 999,
      name: 'render-error',
      input: { scriptPath },
      output: null,
      error: err.message,
      elapsedMs: Date.now() - renderStart,
    });
    run.finish('render_failed');
    finishLiveRun({ status: 'render_failed', error: err.message });
    throw err;
  }

  // 7. LOCATE RENDERED VIDEO
  const today = new Date().toISOString().slice(0, 10);
  const expectedFolder = `${today}-${projectName}`;
  const finalVideo = path.join(OUTPUT_ROOT, expectedFolder, 'final.mp4');

  let actualVideo = finalVideo;
  if (!fs.existsSync(finalVideo)) {
    const entries = fs.readdirSync(OUTPUT_ROOT).filter(d => d.includes(projectName));
    if (entries.length > 0) {
      const candidate = path.join(OUTPUT_ROOT, entries[0], 'final.mp4');
      if (fs.existsSync(candidate)) actualVideo = candidate;
    }
  }

  if (!fs.existsSync(actualVideo)) {
    run.finish('render_missing_final');
    throw new Error(`render finished but final.mp4 not found. Looked in: ${finalVideo}`);
  }

  const finalFolder = path.basename(path.dirname(actualVideo));
  const watchUrl = `${WATCH_URL_BASE}/${finalFolder}/final.mp4`;

  run.logStep({
    index: 1000,
    name: 'render-complete',
    input: { scriptPath, projectName },
    output: {
      final_path: actualVideo,
      watch_url: watchUrl,
      folder: finalFolder,
    },
    elapsedMs: Date.now() - renderStart,
  });

  completeStep('10-remotion-render');
  completeStep('11-merge-audio');
  completeStep('12-burn-subs');
  completeStep('13-thumbnail');
  updateTotals({
    input_tokens: run.meta.total_input_tokens,
    output_tokens: run.meta.total_output_tokens,
    cost_usd: run.meta.total_cost_usd,
  });
  finishLiveRun({ status: 'completed', watchUrl: watchUrl });
  run.finish('completed');

  console.log('\n✅ PIPELINE v2 iteration 3 COMPLETE');
  console.log(`   final video: ${actualVideo}`);
  console.log(`   watch URL  : ${watchUrl}`);
  console.log(`   run dir    : ${run.runDir}`);
  console.log(`   brain cost : $${run.meta.total_cost_usd.toFixed(4)}`);

  return {
    run_id: run.runId,
    title,
    final_path: actualVideo,
    watch_url: watchUrl,
  };
}
