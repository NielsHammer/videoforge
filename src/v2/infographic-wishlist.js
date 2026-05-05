/**
 * Infographic wishlist logger.
 *
 * After the storyboard is planned, a short Claude call identifies which
 * infographic component types would have served scenes better if they existed.
 * Results accumulate across runs into a single wishlist file so we can
 * prioritize which new components to build.
 *
 * This is the bridge toward the "auto-generate new components" feature —
 * for now we just catalog the gaps, so we can review them.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { getMenuKeys } from './visual-menu.js';

dotenv.config({ path: '/opt/videoforge/.env' });

const MODEL = 'claude-sonnet-4-6';
const WISHLIST_PATH = '/opt/videoforge/v2-infographic-wishlist.json';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const b = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (b) return JSON.parse(b[0]);
  throw new Error('No JSON in wishlist response');
}

function loadWishlist() {
  if (!fs.existsSync(WISHLIST_PATH)) {
    return { runs: [], aggregated_gaps: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(WISHLIST_PATH, 'utf8'));
  } catch {
    return { runs: [], aggregated_gaps: {} };
  }
}

function saveWishlist(data) {
  fs.writeFileSync(WISHLIST_PATH, JSON.stringify(data, null, 2));
}

export async function generateWishlist({ title, storyboard, bible, run, startStep }) {
  const existingMenu = getMenuKeys().join(', ');

  const compactStoryboard = storyboard.map(s => ({
    scene: s.index,
    role: s.role,
    narration: s.narration?.slice(0, 200),
    picked: s.menu_key,
    was_fallback: !!s._v2_autofix_reason,
  }));

  const prompt = `You are reviewing a generated storyboard and identifying gaps in the visual component library.

VIDEO TITLE: ${title}
NARRATIVE CENTER: ${bible.narrative_center || bible.subject_anchor || ''}

STORYBOARD (what was picked for each scene):
${compactStoryboard.map(s => `${s.scene}. [${s.picked}${s.was_fallback ? ' FALLBACK' : ''}] ${s.narration}`).join('\n')}

CURRENT COMPONENT LIBRARY (what the planner could choose from):
${existingMenu}

Your job: identify 3-6 scenes where a DIFFERENT, BETTER infographic would have served the narration more perfectly if it existed in the library. Skip scenes where the existing pick was genuinely good.

Return JSON:

\`\`\`json
{
  "recommendations": [
    {
      "scene": 5,
      "narration_excerpt": "the 14 words that matter most for this recommendation",
      "current_pick": "ai_image_framed",
      "proposed_component_name": "jet_stream_arc",
      "one_line_description": "An animated map arc from point A to point B with altitude label and transit time",
      "why_this_fits_better": "one sentence — why the proposed component would capture this narration better than anything already in the library",
      "schema_sketch": "brief idea of what data fields the component would need, e.g. { origin, destination, arc_label, duration_seconds }"
    }
  ],
  "top_priority_gap": "the single most impactful missing component name"
}
\`\`\`

Rules:
- Only suggest components that are GENUINELY missing — don't propose small variants of existing ones.
- Don't propose text-heavy components (we already have enough).
- Focus on visual/data/animation gaps.
- Be specific about the schema so we could actually build it.`;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - t0;
  const text = response.content[0].text;
  const wishlist = parseJson(text);

  run.logStep({
    index: startStep,
    name: 'infographic-wishlist',
    input: { storyboard_size: storyboard.length },
    prompt,
    response: text,
    output: wishlist,
    model: MODEL,
    usage: response.usage,
    elapsedMs,
  });

  // Persist to the global wishlist file
  const global = loadWishlist();
  global.runs.push({
    run_id: run.runId,
    title,
    recorded_at: new Date().toISOString(),
    recommendations: wishlist.recommendations,
    top_priority_gap: wishlist.top_priority_gap,
  });
  for (const rec of wishlist.recommendations || []) {
    const key = rec.proposed_component_name;
    if (!key) continue;
    if (!global.aggregated_gaps[key]) {
      global.aggregated_gaps[key] = {
        count: 0,
        description: rec.one_line_description,
        schema_sketch: rec.schema_sketch,
        examples: [],
      };
    }
    global.aggregated_gaps[key].count += 1;
    if (global.aggregated_gaps[key].examples.length < 5) {
      global.aggregated_gaps[key].examples.push({
        run_id: run.runId,
        scene: rec.scene,
        narration: rec.narration_excerpt,
        why: rec.why_this_fits_better,
      });
    }
  }
  saveWishlist(global);

  return {
    wishlist,
    next_step_index: startStep + 1,
  };
}
