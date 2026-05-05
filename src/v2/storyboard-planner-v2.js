/**
 * Storyboard planner v2 (iteration 2).
 *
 * Replaces the sentence-boundary scene splitter with a planner-driven approach.
 * The planner sees the full script, full bible, word timestamps, and the entire
 * visual menu — and decides:
 *   - where each scene starts and ends (by word index)
 *   - which visual treatment to use (from the 28-key menu, no defaults)
 *   - the exact data the Remotion component needs
 *   - why this choice for this moment
 *
 * Scene duration is bounded 3-5 seconds: ~3s for transitional beats, up to 5s
 * for hero moments. No scene ever exceeds 5s.
 *
 * Flow:
 *   1. SCENE BOUNDARIES CALL — planner decides how to slice the script into
 *      scenes by word index, with a target duration per scene.
 *   2. VISUAL BATCHES — in chunks of ~12 scenes, planner picks visuals with
 *      the full bible + ledger of already-used treatments attached.
 */
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { menuForPrompt, getMenuKeys, getMenuEntry } from './visual-menu.js';

dotenv.config({ path: '/opt/videoforge/.env' });

const MODEL = 'claude-sonnet-4-6';
const SCENE_DURATION_MIN = 3.0;
const SCENE_DURATION_MAX = 5.0;
const BATCH_SIZE = 12;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

import fs from 'fs';

function parseJson(text, debugLabel = 'planner') {
  // Extract JSON from a code block, or take the first full object/array.
  // Greedy on code block to capture the entire JSON body even if the model
  // embedded smaller fenced blocks inside string values.
  let candidate = null;
  const fencedGreedy = text.match(/```json\s*([\s\S]*?)```/);
  if (fencedGreedy) {
    candidate = fencedGreedy[1];
  } else {
    const arr = text.match(/\[[\s\S]*\]/);
    const obj = text.match(/\{[\s\S]*\}/);
    // Prefer whichever match is longer — an array containing objects will
    // always be longer than the greedy object match that starts mid-array.
    if (arr && obj) {
      candidate = arr[0].length >= obj[0].length ? arr[0] : obj[0];
    } else {
      candidate = arr ? arr[0] : (obj ? obj[0] : null);
    }
  }
  if (!candidate) {
    const dump = `/tmp/v2-parse-fail-${debugLabel}-${Date.now()}.txt`;
    try { fs.writeFileSync(dump, text); } catch {}
    throw new Error(`No JSON found in response. Raw dumped to ${dump}`);
  }

  // First attempt: strict parse
  try {
    return JSON.parse(candidate);
  } catch (_err) {
    // Lenient recovery: strip trailing commas before } or ]
    const sanitized = candidate
      .replace(/,(\s*[}\]])/g, '$1')
      // Common issue: model emits a stray line-break inside a string literal
      // that isn't followed by an escape — collapse bare CRLF inside strings
      // (heuristic, safe for our use case since data strings are short).
      .replace(/\n/g, ' ');
    try {
      return JSON.parse(sanitized);
    } catch (_err2) {
      // Truncation recovery: if the response was cut off mid-array, salvage
      // complete objects by wrapping in [] and trimming the incomplete tail
      const truncated = sanitized.replace(/,\s*\{[^}]*$/, '');
      const wrapped = truncated.startsWith('[') ? truncated + ']' : '[' + truncated + ']';
      try {
        const result = JSON.parse(wrapped);
        if (Array.isArray(result) && result.length > 0) return result;
      } catch {}

      const dump = `/tmp/v2-parse-fail-${debugLabel}-${Date.now()}.txt`;
      try {
        fs.writeFileSync(dump, `=== RAW TEXT ===\n${text}\n\n=== EXTRACTED CANDIDATE ===\n${candidate}\n\n=== SANITIZED ===\n${sanitized}\n\n=== ERROR ===\n${_err2.message}`);
      } catch {}
      throw new Error(`JSON parse failed (${debugLabel}): ${_err2.message}. Raw+debug dumped to ${dump}`);
    }
  }
}

// ─── STAGE 1: Scene boundaries ─────────────────────────────────────

async function planSceneBoundaries({ script, wordTimestamps, bible, run, stepIndex }) {
  // Build a compact per-word reference the planner can cite by index
  // We show word index, start time, and word for the full script
  const wordLines = wordTimestamps
    .map((w, i) => `${i}: ${w.start.toFixed(2)}s "${w.word}"`)
    .join('\n');

  const totalDuration = wordTimestamps[wordTimestamps.length - 1]?.end || 0;
  const targetSceneCount = Math.ceil(totalDuration / 4); // ~4s average target

  const prompt = `You are a senior video editor deciding where to cut the scenes in a YouTube video BEFORE any visuals are chosen. Your only job in this step is to decide scene boundaries.

VIDEO BIBLE (for tone and pacing context):
${JSON.stringify({
  video_identity: bible.video_identity,
  narrative_center: bible.narrative_center || bible.subject_anchor,
  tone: bible.tone,
  pacing_plan: bible.pacing_plan,
  emotional_arc_points: bible.emotional_arc_points,
}, null, 2)}

FULL SCRIPT (narrator delivered this):
"""
${script}
"""

TOTAL DURATION: ${totalDuration.toFixed(1)} seconds
TOTAL WORDS: ${wordTimestamps.length}

WORD TIMESTAMPS (one per line — <index>: <start_time> "<word>"):
${wordLines}

PRINCIPLES (these are how top-performing videos cut, not rules):
1. **Hard duration cap: ${SCENE_DURATION_MAX}s per scene. No exceptions.**
2. Minimum: ${SCENE_DURATION_MIN}s per scene.
3. **HOOK DELIVERY (first ~5 seconds of the video): use the shortest, snappiest cuts. The first 2-3 scenes should be ~${SCENE_DURATION_MIN}s each — rapid fire to grab attention in the first 5 seconds. This is non-negotiable — top performers front-load visual variety.**
4. Transitional / connective narration → cut short (~${SCENE_DURATION_MIN}s). The viewer should not linger.
5. Hero moments (reveals, callbacks, gut-punches) → can breathe up to ${SCENE_DURATION_MAX}s.
6. Density-heavy sentences (stats, lists) → cut on each sub-idea, don't let one sentence monopolize 10 seconds of screen time.
7. Expect roughly ${targetSceneCount} scenes total.

Return a JSON array inside a \`\`\`json code block. Each element is a scene:

\`\`\`json
[
  {
    "scene_index": 0,
    "word_start_idx": 0,
    "word_end_idx": 11,
    "duration_seconds": 3.2,
    "role": "hook | reveal | transition | stat_beat | reflection | callback | outro",
    "importance": "hero | medium | connective"
  }
]
\`\`\`

Rules on your output:
- Scenes must be sequential and non-overlapping — word_end_idx of scene N = word_start_idx of scene N+1 - 1.
- word_end_idx is INCLUSIVE.
- duration_seconds must be between ${SCENE_DURATION_MIN} and ${SCENE_DURATION_MAX}.
- The last scene's word_end_idx must equal ${wordTimestamps.length - 1}.
- Do not skip any words.

This is your only job in this step — do not plan visuals yet. Return only the array.`;

  // Scale max_tokens to script length — each scene is ~150 tokens, plus overhead
  const estimatedTokens = Math.ceil(targetSceneCount * 160) + 1000;
  const maxTokens = Math.max(8000, Math.min(estimatedTokens, 16000));

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - t0;
  const text = response.content[0].text;
  const scenes = parseJson(text, 'scene-boundaries');

  // Compute actual start/end times from word timestamps
  const boundedScenes = scenes.map((s, i) => {
    const startIdx = Math.max(0, Math.min(wordTimestamps.length - 1, s.word_start_idx));
    const endIdx = Math.max(startIdx, Math.min(wordTimestamps.length - 1, s.word_end_idx));
    const words = wordTimestamps.slice(startIdx, endIdx + 1);
    const start_time = words[0].start;
    const end_time = i === scenes.length - 1 ? totalDuration : words[words.length - 1].end;
    const narration = words.map(w => w.word).join(' ');
    return {
      index: i,
      word_start_idx: startIdx,
      word_end_idx: endIdx,
      narration,
      start_time,
      end_time,
      duration_seconds: end_time - start_time,
      role: s.role,
      importance: s.importance,
      word_count: words.length,
    };
  });

  run.logStep({
    index: stepIndex,
    name: 'scene-boundaries',
    input: {
      total_words: wordTimestamps.length,
      total_duration: totalDuration,
      scene_target: targetSceneCount,
    },
    prompt,
    response: text,
    output: { scenes: boundedScenes, count: boundedScenes.length },
    model: MODEL,
    usage: response.usage,
    elapsedMs,
  });

  return boundedScenes;
}

// ─── VALIDATION ────────────────────────────────────────────────────

// (Previous: ~50 lines of regex rules for banned words, text grounding,
// before_after markers, and multi-subject detection.) Removed in iteration 7
// per direction: the planner prompt teaches principles with examples; we trust
// Claude to follow them. Technical validation only from here on.

// Technical validation only — required fields per menu entry. Content quality
// is governed by the planner prompt's principles and examples.
function validateDecisions(decisions) {
  const issues = [];
  for (const d of decisions) {
    const entry = getMenuEntry(d.menu_key);
    if (!entry) {
      issues.push({ scene_index: d.scene_index, reason: `unknown menu_key ${d.menu_key}` });
      continue;
    }
    if (entry.render_field === 'image') {
      if (entry.type === 'ai_image' && !d.ai_prompt) {
        issues.push({ scene_index: d.scene_index, reason: `missing ai_prompt for ${d.menu_key}` });
      }
      if (entry.type === 'stock' && !d.search_query) {
        issues.push({ scene_index: d.scene_index, reason: `missing search_query for ${d.menu_key}` });
      }
      if (entry.panel === 'stat' && !d.panel_stat) {
        issues.push({ scene_index: d.scene_index, reason: `missing panel_stat for ${d.menu_key}` });
      }
      if (entry.panel === 'icon' && !d.panel_icon) {
        issues.push({ scene_index: d.scene_index, reason: `missing panel_icon for ${d.menu_key}` });
      }
      if (entry.panel === 'multi_image' && (!Array.isArray(d.search_queries) || d.search_queries.length < 2)) {
        issues.push({ scene_index: d.scene_index, reason: `missing search_queries[2+] for ${d.menu_key}` });
      }
    }
    if (entry.render_field === 'animation_data' && entry.multi_image) {
      if (!Array.isArray(d.search_queries) || d.search_queries.length < 2) {
        issues.push({ scene_index: d.scene_index, reason: `missing search_queries[2+] for ${d.menu_key}` });
      }
    }
    if ((entry.render_field === 'animation_data' || entry.render_field === 'chart_data') && !entry.multi_image && !d.data) {
      issues.push({ scene_index: d.scene_index, reason: `missing data object for ${d.menu_key}` });
    }
  }
  return issues;
}

// ─── REPAIR: re-prompt Claude with specific errors ────────────────

async function repairDecisions({ brokenScenes, brokenIssues, originalDecisions, bible }) {
  const scenesByIndex = Object.fromEntries(brokenScenes.map(s => [s.index, s]));
  const errors = brokenIssues.map(i => `Scene ${i.scene_index}: ${i.reason}`).join('\n');
  const priorPicks = brokenIssues.map(i => {
    const d = originalDecisions.find(x => x.scene_index === i.scene_index);
    const s = scenesByIndex[i.scene_index];
    return {
      scene_index: i.scene_index,
      narration: s?.narration?.slice(0, 200),
      prior_menu_key: d?.menu_key,
      prior_ai_prompt: d?.ai_prompt,
      prior_data: d?.data,
      error: i.reason,
    };
  });

  const prompt = `You are fixing broken decisions from the storyboard visual planner. Each listed scene failed validation for a specific reason. Return corrected decisions ONLY for these scenes.

VIDEO NARRATIVE CENTER: ${bible.narrative_center || bible.subject_anchor || ''}
VIDEO IDENTITY: ${bible.video_identity}

BROKEN SCENES AND ERRORS:
${errors}

DETAILS PER BROKEN SCENE:
${JSON.stringify(priorPicks, null, 2)}

FIX RULES:
- For ai_prompt errors: rewrite the prompt WITHOUT any banned words — no "laptop", "phone", "computer", "monitor", "screen", "display", "text", "dashboard", "interface", "documents", "papers", "charts", "graphs", "email", "newspaper", "website", "menu", "label". ONE clear subject, no multi-subject compositions. Documentary photojournalism style.
- For ai_prompt where the narration is about a tool/software/brand: do NOT try to show the tool itself. Instead pick one of: (a) a workspace mood shot (desk, coffee cup, natural light, hand visible but NO screen), (b) a physical object associated with the activity (a microphone for voiceovers, a thumbnail print for design, a stack of coins for finance), (c) a through-the-window shot of someone working, (d) change the menu_key to an appropriate mockup or web_screenshot instead.
- For missing panel_stat / panel_icon / search_queries: either provide the missing fields or change the menu_key to a variant that doesn't need them.
- For fit_proof errors: write a credible one-sentence justification that cites specific narration text.
- For text-grounding errors: make all text fields verbatim substrings of the narration, or change the component.
- If you cannot find a valid choice, use menu_key "ai_image_framed" with a prompt for "candid documentary photograph of a physical workspace detail" that has nothing to do with screens or text.

Return a JSON object inside a \`\`\`json code block with a \`decisions\` array covering ONLY the broken scenes:

\`\`\`json
{
  "decisions": [
    {
      "scene_index": <int>,
      "menu_key": "...",
      "data": { /* if applicable */ },
      "ai_prompt": "only if ai_image_*",
      "search_query": "only if stock_*",
      "search_queries": ["..."],
      "brand_or_url": "only if web_screenshot",
      "panel_stat": { "value": "...", "label": "..." },
      "panel_icon": "...",
      "fit_proof": "one sentence",
      "reasoning": "one sentence — what you changed and why",
      "ledger_summary": "one short sentence"
    }
  ]
}
\`\`\``;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].text;
  try {
    const result = parseJson(text, 'repair');
    return result.decisions || [];
  } catch (err) {
    console.log(`  ⚠️  repair parse failed: ${err.message}`);
    return [];
  }
}

// ─── STAGE 2: Visual choice for each scene ─────────────────────────

async function planVisualsBatch({ bible, scenes, ledger, upcomingPreview, batchIndex, run, stepIndex }) {
  const menuText = menuForPrompt();
  const menuKeys = getMenuKeys();

  const prompt = `You are a senior visual director picking the exact Remotion treatment for each scene of a YouTube video. You have the full video bible, the ledger of visuals already used in earlier scenes, and the menu of every visual treatment available.

Your job: for each scene in this batch, pick ONE menu_key and provide the exact data that Remotion component needs. No defaults. No "framed" unless you deliberately chose it. Every choice must be the result of thinking about THIS specific scene, THIS specific moment in the arc, and the variety already on screen.

VIDEO BIBLE:
${JSON.stringify(bible, null, 2)}

LEDGER — visuals already committed to in earlier scenes (NEVER pick the same menu_key twice in a row; avoid runs of 3+ image-type scenes without breaking with a graphic):
${ledger.length === 0 ? '(nothing yet — this is the first batch)' : ledger.map((l, i) => `${i + 1}. scene ${l.scene_index}: ${l.menu_key} — ${l.summary}`).join('\n')}

${upcomingPreview.length > 0 ? `UPCOMING SCENES (do not plan these yet — context only):\n${upcomingPreview.map((u, i) => `+${i + 1}. "${u.narration.slice(0, 100)}..."`).join('\n')}\n` : ''}

VISUAL MENU — every treatment available to you, with schema and when to use it:
${menuText}

TECHNICAL — how to fill data fields:
- Animation components: \`data\` field must match the schema exactly.
- Multi-image (polaroid_stack, side_by_side_image): provide \`search_queries\` array.
- Split variants: stat panel needs \`panel_stat\`, twin image needs \`search_queries\` (2), icon panel needs \`panel_icon\`.
- ai_image_*: provide \`ai_prompt\` (40-70 words). stock_*: provide \`search_query\` (6-10 words).

THE THREE PRINCIPLES THAT MATTER:

1. THINK LIKE A DOCUMENTARY FILMMAKER, NOT A TEMPLATE PICKER.
You have 94 components. For each scene, ask: "if I were editing a real documentary and this narration was playing, what would be on screen right now?" The answer is usually an IMAGE — a photograph, a place, a person, an object. Infographics and animations are the EXCEPTION, not the default. They're for moments where data IS the point. Most scenes should be visually rich images that carry the viewer through a visual story.

The bible's \`visual_storyline\` gives you 7 key beats. Use them as your shot list. Each scene should advance the visual story.

Animations and infographics don't have to explain data. They can also be VISUALLY BEAUTIFUL moments that showcase a feeling — a gauge showing danger level, a boarding pass for the thrill of departure, a calendar date for the weight of a deadline. Use them for emotional texture, not just statistics. But don't overuse them — a stat, percentage, or comparison in every other scene makes the video feel like a PowerPoint deck. Variety means VISUAL variety: different frame styles, different image angles, different moods. Not "number, comparison, number, list, number."

2. ONLY SHOW DATA THAT'S ACTUALLY IN THE NARRATION.
Any text, number, or label on screen must come from the narration — verbatim or close paraphrase. If the narration doesn't contain a specific stat or quote, don't force an infographic. Images are the safe default.

3. FLUX CANNOT RENDER TEXT, SCREENS, OR UI.
For AI images: one clear subject, documentary photography style, no text, no devices showing content. For brands/apps/websites: use mockup components or \`web_screenshot\` or \`stock_*\`. Real photos always beat AI for real places/people/brands.

Trust your judgment. You have the full menu and the bible. Make good choices.

The test: if a viewer could mistake an ai_image for a real photograph from that specific event, the prompt is right. If readable text appears anywhere in your ai_prompt description, you're breaking the rules.

CURRENT BATCH — scenes to plan:

${scenes.map(s => `SCENE ${s.index} (${s.duration_seconds.toFixed(1)}s, role=${s.role}, importance=${s.importance})
narration: "${s.narration}"`).join('\n\n')}

Return a JSON object inside a \`\`\`json code block:

\`\`\`json
{
  "decisions": [
    {
      "scene_index": 0,
      "menu_key": "one key from the menu above — must match exactly",
      "data": { /* exact schema for this menu entry's component */ },
      "ai_prompt": "only if image-based ai_image_*",
      "search_query": "only if stock_*",
      "search_queries": ["array of queries"],
      "brand_or_url": "only if web_screenshot — brand name or URL",
      "fit_proof": "REQUIRED for any non-image/stock pick — one sentence explaining how THIS component makes THIS narration clearer than an image would. Must cite a specific element of the narration.",
      "reasoning": "one sentence — why this treatment for THIS scene at THIS moment",
      "ledger_summary": "one short sentence — what to remember, for next batch's ledger"
    }
  ]
}
\`\`\`

Valid menu_key values (exact strings): ${menuKeys.join(', ')}`;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - t0;
  const text = response.content[0].text;
  const result = parseJson(text, `visuals-batch-${batchIndex + 1}`);

  // Technical validation only — menu_key existence + required fields.
  const scenesByIndex = Object.fromEntries(scenes.map(s => [s.index, s]));
  let issues = validateDecisions(result.decisions);

  // If any decisions fail validation, re-prompt Claude with the specific
  // errors and ask for corrections. One retry, targeted to the broken scenes.
  if (issues.length > 0) {
    console.log(`  ⚠️  ${issues.length} validation issue(s) — re-prompting Claude for fixes`);
    const brokenIndices = [...new Set(issues.map(i => i.scene_index))];
    const brokenScenes = scenes.filter(s => brokenIndices.includes(s.index));
    const fixes = await repairDecisions({
      brokenScenes,
      brokenIssues: issues,
      originalDecisions: result.decisions,
      bible,
    });
    // Merge the repaired decisions back in
    for (const fix of fixes) {
      const idx = result.decisions.findIndex(d => d.scene_index === fix.scene_index);
      if (idx >= 0) {
        result.decisions[idx] = { ...result.decisions[idx], ...fix, _v2_repaired: true };
      }
    }
    // Re-validate. Anything still broken gets a safe, topic-informed fallback.
    issues = validateDecisions(result.decisions, scenesByIndex);
    for (const issue of issues) {
      const d = result.decisions.find(x => x.scene_index === issue.scene_index);
      if (!d) continue;
      const sceneMeta = scenesByIndex[issue.scene_index];
      d.menu_key = 'ai_image_framed';
      // SAFE fallback: a topic-level workspace shot, NOT the narration text.
      d.ai_prompt = `Candid over-the-shoulder documentary photograph of a hand on a desk next to a pen and coffee cup, warm natural window light, 35mm documentary style, one clear subject only, unposed amateur snapshot`;
      d.panel_stat = undefined;
      d.panel_icon = undefined;
      d.search_query = undefined;
      d.search_queries = undefined;
      d.data = undefined;
      d._v2_autofix_reason = issue.reason;
    }
  }

  run.logStep({
    index: stepIndex,
    name: `storyboard-visuals-batch-${batchIndex + 1}`,
    input: {
      batch_scene_count: scenes.length,
      scene_indices: scenes.map(s => s.index),
      ledger_size: ledger.length,
    },
    prompt,
    response: text,
    output: result,
    model: MODEL,
    usage: response.usage,
    elapsedMs,
  });

  return result.decisions;
}

// ─── MAIN ENTRY ────────────────────────────────────────────────────

export async function planStoryboard({ title, script, bible, wordTimestamps, totalDuration, run, startStep = 6 }) {
  if (!script || !bible || !run) throw new Error('script, bible, run required');
  if (!wordTimestamps || wordTimestamps.length === 0) {
    throw new Error('wordTimestamps required — v2 iteration 2 uses real timestamps for scene boundaries');
  }

  let stepCursor = startStep;

  // Stage 1 — scene boundaries
  const scenes = await planSceneBoundaries({
    script, wordTimestamps, bible, run, stepIndex: stepCursor++,
  });

  // Stage 2 — visual planning, batched
  const allDecisions = [];
  const ledger = [];
  const batches = [];
  for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
    batches.push(scenes.slice(i, i + BATCH_SIZE));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const upcomingPreview = batches[b + 1] ? batches[b + 1].slice(0, 5) : [];

    const decisions = await planVisualsBatch({
      bible,
      scenes: batch,
      ledger,
      upcomingPreview,
      batchIndex: b,
      run,
      stepIndex: stepCursor++,
    });

    for (const d of decisions) {
      allDecisions.push(d);
      ledger.push({
        scene_index: d.scene_index,
        menu_key: d.menu_key,
        summary: d.ledger_summary,
      });
    }
  }

  // Merge scene metadata with visual decisions
  const storyboard = scenes.map(scene => {
    const decision = allDecisions.find(d => d.scene_index === scene.index);
    return {
      ...scene,
      ...decision,
    };
  });

  return {
    storyboard,
    total_scenes: scenes.length,
    total_batches: batches.length,
    next_step_index: stepCursor,
  };
}
