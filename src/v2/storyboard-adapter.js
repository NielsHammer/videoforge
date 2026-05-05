/**
 * Storyboard adapter (iteration 2) — maps the new v2 storyboard (menu-key
 * based) into the exact clip + videoBible schema the existing render pipeline
 * expects.
 *
 * Key change from iteration 1: animation data now routes to the correct
 * field on the clip based on the menu entry's render_field:
 *   - 'animation_data' for modern batch components (spotlight_stat, etc.)
 *   - 'chart_data' for legacy infographics (timeline, map_highlight, etc.)
 *   - 'image' for image-based types (ai_image, stock, polaroid_stack with images)
 *
 * Multi-image layouts (polaroid_stack, side_by_side) get their search_queries
 * array attached so the existing pipeline's b-roll fetching pulls 2-3 images.
 */
import { getMenuEntry } from './visual-menu.js';
import { updateStep, completeStep, updateTotals } from './live-progress.js';
import { generateWishlist } from './infographic-wishlist.js';
import { captureWebScreenshot, resolveBrandUrl, closeBrowser } from './web-screenshot.js';
import { reviewTaste } from './taste-reviewer.js';
import { verifyVisualContinuity } from './visual-continuity.js';

/**
 * Turn one v2 scene into an existing-pipeline clip object.
 */
function mapV2Scene(scene) {
  const menu = getMenuEntry(scene.menu_key);
  if (!menu) {
    // Unknown menu key — should never happen because planner validates, but
    // if it does we fall back to an AI image using the narration.
    return {
      visual_type: 'ai_image',
      display_style: 'framed',
      ai_prompt: (scene.narration || '').slice(0, 200),
      _v2_fallback_reason: `unknown menu_key ${scene.menu_key}`,
    };
  }

  // web_screenshot — this is a special type handled asynchronously by the
  // adapter BEFORE we return clips. If you're reading this at mapV2Scene time,
  // the screenshot has already been captured and stored on scene._captured_image.
  if (menu.render_field === 'web_screenshot') {
    if (scene._captured_image) {
      return {
        visual_type: 'stock',
        display_style: 'framed',
        search_query: `${scene.brand_or_url || 'web'} homepage`,
        _v2_preset_image: scene._captured_image,
      };
    }
    // Screenshot failed — fall back to brand search via the existing stock path
    return {
      visual_type: 'stock',
      display_style: 'framed',
      search_query: `${scene.brand_or_url || 'web'} homepage screenshot`,
      _v2_fallback_reason: 'web_screenshot capture failed',
    };
  }

  // Image-based entry (ai_image_*, stock_*)
  if (menu.render_field === 'image') {
    const out = {
      visual_type: menu.type,
      display_style: menu.display_style || 'framed',
      ai_prompt: scene.ai_prompt || '',
      search_query: scene.search_query || '',
      _v2_use_prompt_verbatim: Boolean(scene.ai_prompt), // skip craftAIPrompt rewrite
    };
    // Pass frame variant through so the renderer picks the correct style
    if (menu.frame_variant) {
      out.frame_variant = menu.frame_variant;
    }

    // SplitReveal panel content — based on the menu entry's declared panel mode
    if (menu.panel === 'stat' && scene.panel_stat) {
      out.panel_stat = {
        value: String(scene.panel_stat.value || ''),
        label: String(scene.panel_stat.label || ''),
      };
    }
    if (menu.panel === 'icon' && scene.panel_icon) {
      out.panel_icon = String(scene.panel_icon);
    }
    if (menu.panel === 'multi_image' && Array.isArray(scene.search_queries)) {
      out.search_queries = scene.search_queries;
    }

    return out;
  }

  // Multi-image entries (polaroid_stack, side_by_side) — these are graphic types
  // in the renderer, but the component reads image paths from imagePaths AND
  // animation data from clip.animation_data.
  if (menu.render_field === 'animation_data' && menu.multi_image) {
    return {
      visual_type: menu.type,
      display_style: 'framed', // unused by these components but kept for safety
      search_query: (scene.search_queries && scene.search_queries[0]) || '',
      search_queries: scene.search_queries || [],
      animation_data: scene.data || {},
    };
  }

  // Modern batch animations (animation_data field)
  if (menu.render_field === 'animation_data') {
    return {
      visual_type: menu.type,
      display_style: 'framed',
      animation_data: scene.data || {},
    };
  }

  // Legacy infographics (chart_data field)
  if (menu.render_field === 'chart_data') {
    return {
      visual_type: menu.type,
      display_style: 'framed',
      chart_data: scene.data || {},
    };
  }

  // Shouldn't reach here
  return {
    visual_type: 'ai_image',
    display_style: 'framed',
    ai_prompt: (scene.narration || '').slice(0, 200),
    _v2_fallback_reason: `unhandled render_field ${menu.render_field}`,
  };
}

/**
 * Build clips using word timestamps to assign accurate start/end times.
 * The new v2 planner already decides scene boundaries by word index, so we just
 * translate those to start/end times from the timestamp array.
 */
function buildClipsFromScenes(scenes, wordTimestamps, totalDuration) {
  const clips = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const startIdx = Math.max(0, Math.min(wordTimestamps.length - 1, s.word_start_idx));
    const endIdx = Math.max(startIdx, Math.min(wordTimestamps.length - 1, s.word_end_idx));
    const wordSlice = wordTimestamps.slice(startIdx, endIdx + 1);
    const start_time = wordSlice[0].start;
    const end_time = i === scenes.length - 1 ? totalDuration : wordSlice[wordSlice.length - 1].end;

    const visual = mapV2Scene(s);

    clips.push({
      start_time,
      end_time,
      text: s.narration,
      subtitle_words: wordSlice,
      reasoning_v2: s.reasoning,
      scene_index_v2: s.index,
      menu_key_v2: s.menu_key,
      role_v2: s.role,
      importance_v2: s.importance,
      ...visual,
    });
  }

  // Clean up gaps and overlaps
  for (let i = 1; i < clips.length; i++) {
    if (clips[i].start_time < clips[i - 1].end_time) {
      clips[i].start_time = clips[i - 1].end_time;
    }
    if (clips[i].end_time <= clips[i].start_time) {
      clips[i].end_time = clips[i].start_time + 3;
    }
  }

  return clips;
}

/**
 * Map v2 bible to the existing pipeline's videoBible shape.
 */
function mapV2Bible(v2Bible) {
  const eraSpecific = v2Bible.visual_world?.era || '';
  // Historical = pre-2000. Modern = anything contemporary. The era routing only
  // matters for the existing pipeline's Pexels-bypass logic.
  const era = /\b(19|20)\d{2}\b|ancient|medieval|wwii|ww2|world war|roman|1940|1950|1960|1970|1980|1990/i.test(eraSpecific)
    && !/contemporary|2020s|2010s|2000s|modern/i.test(eraSpecific)
    ? 'historical'
    : 'modern';

  // v2 iteration 10: do NOT force the subject_anchor into every search. The
  // bible is context, not a cage. Only prepend a subject prefix for historical
  // content where the existing pipeline really does need the era anchor to
  // avoid stock-photo anachronism.
  const imageSearchPrefix = era === 'historical' ? (v2Bible.narrative_center || v2Bible.subject_anchor || '') : '';

  return {
    setting: v2Bible.visual_world?.setting || '',
    era,
    era_specific: eraSpecific,
    visual_tone: v2Bible.tone || '',
    required_visual_style: v2Bible.visual_world?.style_vocabulary || '',
    target_audience: '',
    emotional_arc: (v2Bible.emotional_arc_points || [])
      .map(p => `${Math.round(p.pct * 100)}% → ${p.emotion}`)
      .join(' → '),
    banned_visuals: v2Bible.banned_imagery || [],
    image_search_prefix: imageSearchPrefix,
    // key_visual_moments = the v2 "hero_images" from the bible, used as loose
    // guidance for craftAIPrompt on hero scenes only. No forced injection into
    // every scene.
    key_visual_moments: (v2Bible.visual_world?.hero_images || v2Bible.must_appear || []).slice(0, 8).map(m => ({
      moment: String(m).slice(0, 80),
      search_query: String(m).slice(0, 100),
    })),
    v2_narrative_center: v2Bible.narrative_center,
    v2_identity: v2Bible.video_identity,
    v2_hero_images: v2Bible.visual_world?.hero_images,
    v2_metaphor_palette: v2Bible.visual_world?.metaphor_palette,
    v2_hook_promise: v2Bible.hook_promise,
  };
}

/**
 * Factory — returns an adapter callback compatible with pipeline.js's
 * options.storyboardAdapter hook. The planner + critic run INSIDE the callback
 * because they need real word timestamps from the voiceover step.
 */
export function makeV2StoryboardCallback({
  planStoryboard,
  critiqueStoryboard,
  v2Bible,
  title,
  run,
  stepCursorStart,
}) {
  let stepCursor = stepCursorStart;

  return async function adapterCallback({ scriptText, wordTimestamps, totalDuration, topic }) {
    // Voiceover is done at this point (generateVideo did it before calling us)
    completeStep('5-voiceover', `${totalDuration.toFixed(1)}s · ${wordTimestamps.length} words`);

    // Stage 1: run the v2 planner using real word timestamps
    updateStep('6-scene-boundaries');
    const plannerResult = await planStoryboard({
      title,
      script: scriptText,
      bible: v2Bible,
      wordTimestamps,
      totalDuration,
      run,
      startStep: stepCursor,
    });
    stepCursor = plannerResult.next_step_index;
    completeStep('6-scene-boundaries', `${plannerResult.total_scenes} scenes`);
    completeStep('7-visuals-batches', `${plannerResult.total_batches} batches`);
    updateTotals({
      input_tokens: run.meta.total_input_tokens,
      output_tokens: run.meta.total_output_tokens,
      cost_usd: run.meta.total_cost_usd,
    });

    // Stage 2: critic reviews the full storyboard before render
    updateStep('8-storyboard-critic');
    const crit = await critiqueStoryboard({
      title,
      bible: v2Bible,
      storyboard: plannerResult.storyboard,
      run,
      startStep: stepCursor,
    });
    stepCursor = crit.next_step_index;
    completeStep('8-storyboard-critic', `${crit.verdict.verdict} · topic=${crit.verdict.gate_scores.topic_identity.score} pace=${crit.verdict.gate_scores.pacing.score}`);

    // v2 iter 11: taste reviewer — catches forced component data
    try {
      const taste = await reviewTaste({
        storyboard: plannerResult.storyboard,
        bible: v2Bible,
        run,
        startStep: stepCursor++,
      });
      if (taste.issues?.length > 0) {
        console.log(`  🎯 taste reviewer flagged ${taste.issues.length} scene(s): ${taste.issues.map(i => `#${i.scene_index} (${i.problem_type})`).join(', ')}`);
      } else {
        console.log(`  🎯 taste reviewer: clean pass`);
      }
    } catch (err) {
      console.log(`  ⚠️  taste reviewer failed (non-blocking): ${err.message}`);
    }

    // v2 iter 11: visual continuity verifier — catches storyline breaks
    try {
      const continuity = await verifyVisualContinuity({
        storyboard: plannerResult.storyboard,
        bible: v2Bible,
        run,
        startStep: stepCursor++,
      });
      console.log(`  🎬 visual continuity: ${continuity.score}/10 (${continuity.verdict})`);
      if (continuity.broken_scenes?.length > 0) {
        console.log(`     broken scenes: ${continuity.broken_scenes.map(b => `#${b.scene_index}`).join(', ')}`);
      }
    } catch (err) {
      console.log(`  ⚠️  continuity verifier failed (non-blocking): ${err.message}`);
    }

    // Optional: generate infographic wishlist
    try {
      await generateWishlist({
        title,
        storyboard: plannerResult.storyboard,
        bible: v2Bible,
        run,
        startStep: stepCursor++,
      });
    } catch (err) {
      console.log(`  ⚠️  wishlist generation failed (non-blocking): ${err.message}`);
    }

    updateStep('9-image-fetch');
    updateTotals({
      input_tokens: run.meta.total_input_tokens,
      output_tokens: run.meta.total_output_tokens,
      cost_usd: run.meta.total_cost_usd,
    });

    // Stage 2.5: pre-capture any web_screenshot scenes so the render pipeline
    // can consume them as plain image clips. Failures fall through to search.
    for (const scene of plannerResult.storyboard) {
      const entry = getMenuEntry(scene.menu_key);
      if (entry?.render_field === 'web_screenshot') {
        const url = resolveBrandUrl(scene.brand_or_url) || scene.brand_or_url;
        if (!url) continue;
        console.log(`  📸 capturing ${url}...`);
        const captured = await captureWebScreenshot(url, scene.brand_or_url || 'capture');
        if (captured) {
          scene._captured_image = captured;
          console.log(`     ✓ ${captured}`);
        } else {
          console.log(`     ✗ capture failed, will fall back`);
        }
      }
    }
    try { await closeBrowser(); } catch {}

    // Stage 3: build clips in the existing pipeline schema
    const clips = buildClipsFromScenes(plannerResult.storyboard, wordTimestamps, totalDuration);
    const videoBible = mapV2Bible(v2Bible);

    // Attach pre-captured images to the corresponding clips
    for (const clip of clips) {
      if (clip._v2_preset_image) {
        clip.imagePath = clip._v2_preset_image;
        clip.isCutout = false;
        delete clip._v2_preset_image;
      }
    }

    run.logStep({
      index: stepCursor++,
      name: 'storyboard-adapter-build',
      input: {
        v2_scene_count: plannerResult.storyboard.length,
        word_timestamp_count: wordTimestamps.length,
        total_duration: totalDuration,
      },
      output: {
        clips_produced: clips.length,
        clip_types: clips.reduce((acc, c) => { acc[c.visual_type] = (acc[c.visual_type] || 0) + 1; return acc; }, {}),
        critic_verdict: crit.verdict.verdict,
      },
      elapsedMs: 0,
    });

    return { clips, videoBible };
  };
}
