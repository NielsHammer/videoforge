/**
 * Pipeline v2 — the orchestrator.
 *
 * End-to-end flow for generating a complete storyboard (no render yet):
 *   1. createRun                   — per-video directory + observability root
 *   2. generateTitle               — 2 Claude calls
 *   3. generateScript              — 2 Claude calls (arc + write)
 *   4. buildVideoBible             — 1 Claude call
 *   5. planStoryboard              — N batches, 1 call each, every batch sees the bible
 *   6. critiqueStoryboard          — 1 Claude call, gates 4 axes
 *   7. (optional) re-plan flagged scenes if critic fails
 *   8. finish
 *
 * Output: a full storyboard.json + full run directory with every Claude call
 * logged. The render layer is untouched — it can pick up storyboard.json later.
 */
import fs from 'fs';
import path from 'path';
import { createRun } from './run-logger.js';
import { generateTitle } from './title-generator-v2.js';
import { generateScript } from './script-generator-v2.js';
import { buildVideoBible } from './video-bible-v2.js';
import { planStoryboard } from './storyboard-planner-v2.js';
import { critiqueStoryboard } from './storyboard-critic-v2.js';

const MAX_CRITIC_RETRIES = 2;

/**
 * Full v2 pipeline run.
 *
 * @param {object} args
 * @param {string} args.topic           — the subject the video is about
 * @param {string} [args.niche]         — niche hint
 * @param {number} [args.targetSeconds=120] — target video duration
 * @param {string} [args.titleOverride] — if provided, skip title generation
 */
export async function runPipelineV2({
  topic,
  niche = null,
  targetSeconds = 120,
  titleOverride = null,
}) {
  if (!topic) throw new Error('topic is required');

  const run = createRun({ topic, niche, targetSeconds });
  console.log(`\n🎬 pipeline-v2 run: ${run.runId}`);
  console.log(`   topic:  ${topic}`);
  console.log(`   length: ${targetSeconds}s`);

  let stepCursor = 1;

  // 1. TITLE
  let title;
  if (titleOverride) {
    title = titleOverride;
    run.logStep({
      index: stepCursor++,
      name: 'title-override',
      input: { topic },
      output: { title, note: 'user-provided override, title generation skipped' },
      elapsedMs: 0,
    });
    console.log(`\n1️⃣  title (override): "${title}"`);
  } else {
    console.log('\n1️⃣  generating title...');
    const titleResult = await generateTitle({
      topic, niche, run, startStep: stepCursor,
    });
    title = titleResult.title;
    stepCursor = titleResult.next_step_index;
    console.log(`   → "${title}"`);
  }

  // 2. SCRIPT (arc + write)
  console.log('\n2️⃣  planning arc + writing script...');
  const scriptResult = await generateScript({
    title, topic, niche, targetSeconds, run, startStep: stepCursor,
  });
  stepCursor = scriptResult.next_step_index;
  console.log(`   → ${scriptResult.word_count} words (target: ${scriptResult.arc.target_word_count})`);
  console.log(`   → density: ${scriptResult.arc.density_tier}, audience: ${scriptResult.arc.audience_address}`);
  console.log(`   → opening: ${scriptResult.arc.opening_gambit}, reveal: ${scriptResult.arc.reveal_timing}`);
  console.log(`   → word count in range: ${scriptResult.word_count_in_range}`);

  // 3. VIDEO BIBLE
  console.log('\n3️⃣  building video bible...');
  const bibleResult = await buildVideoBible({
    title,
    topic,
    niche,
    arc: scriptResult.arc,
    script: scriptResult.script,
    run,
    startStep: stepCursor,
  });
  stepCursor = bibleResult.next_step_index;
  console.log(`   → narrative center: "${bibleResult.bible.narrative_center || bibleResult.bible.subject_anchor || ''}"`);
  console.log(`   → tone: ${bibleResult.bible.tone}`);
  console.log(`   → hero images: ${bibleResult.bible.visual_world?.hero_images?.length || 0} items`);

  // 4. STORYBOARD PLANNING
  console.log('\n4️⃣  planning storyboard...');
  const plannerResult = await planStoryboard({
    title,
    script: scriptResult.script,
    bible: bibleResult.bible,
    run,
    startStep: stepCursor,
  });
  stepCursor = plannerResult.next_step_index;
  console.log(`   → ${plannerResult.total_scenes} scenes across ${plannerResult.total_batches} batches`);

  // 5. CRITIC
  console.log('\n5️⃣  critiquing storyboard...');
  let finalStoryboard = plannerResult.storyboard;
  let criticResult = await critiqueStoryboard({
    title,
    bible: bibleResult.bible,
    storyboard: finalStoryboard,
    run,
    startStep: stepCursor,
  });
  stepCursor = criticResult.next_step_index;
  const v = criticResult.verdict;
  console.log(`   → verdict: ${v.verdict.toUpperCase()}`);
  console.log(`   → scores: topic=${v.gate_scores.topic_identity.score} narr=${v.gate_scores.narrative_coherence.score} var=${v.gate_scores.visual_variety.score} pace=${v.gate_scores.pacing.score}`);
  console.log(`   → critical issues: ${v.critical_issues?.length || 0}`);

  // Note: selective re-plan not implemented in this first build — if the critic
  // fails, we surface the failure and stop so the user can inspect. This keeps
  // the first test run debuggable. Re-plan loop is a clean addition for v2.1.
  if (v.verdict === 'fail' && MAX_CRITIC_RETRIES > 0) {
    console.log(`   ⚠️  critic failed — surfacing issues for inspection (retry loop not wired in first build)`);
  }

  // 6. FINAL STORYBOARD ARTIFACT
  const storyboardPath = path.join(run.runDir, 'storyboard.json');
  const finalPackage = {
    run_id: run.runId,
    title,
    topic,
    niche,
    target_seconds: targetSeconds,
    arc: scriptResult.arc,
    script: scriptResult.script,
    script_word_count: scriptResult.word_count,
    script_word_count_in_range: scriptResult.word_count_in_range,
    opening_sentence: scriptResult.opening_sentence,
    callback_sentence: scriptResult.callback_sentence,
    bible: bibleResult.bible,
    storyboard: finalStoryboard,
    critic_verdict: v,
    totals: {
      input_tokens: run.meta.total_input_tokens,
      output_tokens: run.meta.total_output_tokens,
      cost_usd: run.meta.total_cost_usd,
    },
  };
  fs.writeFileSync(storyboardPath, JSON.stringify(finalPackage, null, 2));

  run.finish(v.verdict === 'pass' ? 'completed' : 'completed_with_issues');

  console.log('\n✅ pipeline-v2 run complete');
  console.log(`   run dir: ${run.runDir}`);
  console.log(`   storyboard: ${storyboardPath}`);
  console.log(`   total cost: $${run.meta.total_cost_usd.toFixed(4)}`);
  console.log(`   tokens: ${run.meta.total_input_tokens} in / ${run.meta.total_output_tokens} out`);

  return finalPackage;
}
