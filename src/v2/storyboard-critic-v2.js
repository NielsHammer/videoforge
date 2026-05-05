/**
 * Storyboard critic v2 — reviews the whole storyboard BEFORE any render.
 *
 * One Claude call reads the bible + full storyboard and gates on 4 axes:
 *   1. TOPIC IDENTITY    — could a viewer tell this is about the topic from any slice?
 *   2. NARRATIVE COHERENCE — does the emotional arc actually land? Does the hook pay off?
 *   3. VISUAL VARIETY    — repetition, same-pattern runs, generic fallbacks?
 *   4. PACING            — dead zones, over-crammed moments, tension/release?
 *
 * Returns a verdict + specific change requests (scene indices + what's wrong).
 * The pipeline can use the change requests to selectively re-plan affected scenes.
 */
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '/opt/videoforge/.env' });

const MODEL = 'claude-sonnet-4-6';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const b = text.match(/\{[\s\S]*\}/);
  if (b) return JSON.parse(b[0]);
  throw new Error('No JSON found in response');
}

function compactStoryboard(storyboard) {
  return storyboard.map(s => {
    // v2 iteration 2: scenes now carry a menu_key and either ai_prompt,
    // search_query(/search_queries), or data depending on the component.
    let visualSummary;
    if (s.ai_prompt) {
      visualSummary = `[${s.menu_key}] ${String(s.ai_prompt).slice(0, 140)}`;
    } else if (s.search_queries && s.search_queries.length) {
      visualSummary = `[${s.menu_key}] queries=${JSON.stringify(s.search_queries).slice(0, 140)}`;
    } else if (s.search_query) {
      visualSummary = `[${s.menu_key}] "${s.search_query}"`;
    } else if (s.data) {
      visualSummary = `[${s.menu_key}] ${JSON.stringify(s.data).slice(0, 140)}`;
    } else {
      visualSummary = `[${s.menu_key}]`;
    }
    return {
      scene: s.index,
      duration: s.duration_seconds?.toFixed(1),
      role: s.role,
      importance: s.importance,
      narration: s.narration?.slice(0, 160),
      visual: visualSummary,
      reasoning: s.reasoning?.slice(0, 140),
    };
  });
}

export async function critiqueStoryboard({ title, bible, storyboard, run, startStep = 10 }) {
  if (!bible || !storyboard || !run) throw new Error('bible, storyboard, run required');

  const compact = compactStoryboard(storyboard);

  const prompt = `You are a senior video director performing the FINAL REVIEW of a full storyboard before rendering begins. Every 40-minute render costs real money. Your job is to catch anything that would make this video feel generic, off-topic, repetitive, or flat BEFORE the render starts.

VIDEO BIBLE:
${JSON.stringify(bible, null, 2)}

FULL STORYBOARD (${storyboard.length} scenes):
${compact.map(s => `Scene ${s.scene}: "${s.narration}"\n  Visual: ${s.visual}\n  Reason: ${s.reasoning}`).join('\n\n')}

Gate this storyboard on 4 hard axes. Score each 1-10 and explain.

GATE 1 — TOPIC IDENTITY
Could a viewer who sees any random 10-second slice still tell this video is about "${bible.video_identity}"? Test every scene: does it pass the subject identity test "${bible.subject_identity_test}"? Flag any scene where the visual could slide onto a different video without anyone noticing.

GATE 2 — NARRATIVE COHERENCE
Does the emotional arc from the bible actually land in the storyboard? Does the hook promise "${bible.hook_promise}" get visually paid off around ${Math.round((bible.callback_location_pct || 0.85) * 100)}%? Does any scene break the narrative momentum?

GATE 3 — VISUAL VARIETY
Are there runs of 3+ ai_images in a row where stock or animation would have served better? Any near-duplicate prompts? Any generic fallbacks (stock soldiers, stock scientists, stock explosions)? Any banned_imagery items snuck in?

GATE 4 — PACING
Are there dead zones where nothing visually changes for too long? Over-crammed moments where too many different visuals clash? Does tension/release work across the full video?

Return a single JSON object inside a \`\`\`json code block:

{
  "verdict": "pass" | "fail",
  "gate_scores": {
    "topic_identity":     { "score": 1-10, "notes": "..." },
    "narrative_coherence": { "score": 1-10, "notes": "..." },
    "visual_variety":     { "score": 1-10, "notes": "..." },
    "pacing":             { "score": 1-10, "notes": "..." }
  },
  "critical_issues": [
    {
      "scene_indices": [<int>, ...],
      "gate": "topic_identity" | "narrative_coherence" | "visual_variety" | "pacing",
      "problem": "one sentence — what is wrong",
      "fix_suggestion": "one sentence — what to change"
    }
  ],
  "minor_issues": [
    { "scene_indices": [...], "note": "..." }
  ],
  "biggest_win": "one sentence — the single strongest creative choice in this storyboard",
  "biggest_risk": "one sentence — the single thing most likely to make this video feel off if not fixed",
  "overall_review": "one paragraph — honest assessment of whether this storyboard is ready to render"
}

Verdict rules:
- "fail" if ANY gate scores below 6, OR if there are 3+ critical issues, OR if the biggest_risk would visibly hurt the viewer experience.
- "pass" means the storyboard is genuinely ready to render, not that it is perfect.
- Minor issues never cause a fail. Only critical issues fail a gate.
- Be harsh. If something is mediocre, say so. Flattery costs money on bad renders.`;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - t0;
  const text = response.content[0].text;
  const verdict = parseJson(text);

  run.logStep({
    index: startStep,
    name: 'storyboard-critic',
    input: {
      title,
      storyboard_scene_count: storyboard.length,
    },
    prompt,
    response: text,
    output: verdict,
    model: MODEL,
    usage: response.usage,
    elapsedMs,
  });

  return {
    verdict,
    next_step_index: startStep + 1,
  };
}
