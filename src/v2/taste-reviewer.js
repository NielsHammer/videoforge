/**
 * Taste reviewer — post-planner principle-based quality check.
 *
 * Runs ONE Claude call after the planner produces its decisions. Claude re-reads
 * its own output with the specific question: "is any scene forcing a component
 * onto narration it doesn't actually fit? Is any infographic's data invented or
 * shoehorned? Is any ai_prompt generic stock-photo energy?"
 *
 * Flagged scenes get specific feedback. The planner can then re-pick those
 * scenes only (surgical re-plan), keeping the rest of the storyboard intact.
 *
 * This is principle-based (Claude reviewing Claude) not rule-based (regex).
 * It catches the "loss filled as debt" kind of forced-data issue that slips
 * past the initial planner when it's optimizing for variety.
 */
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '/opt/videoforge/.env' });

const MODEL = 'claude-sonnet-4-6';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const b = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (b) return JSON.parse(b[0]);
  throw new Error('No JSON in taste reviewer response');
}

function compactScene(s) {
  const narr = (s.narration || '').slice(0, 200);
  let visual;
  if (s.ai_prompt) visual = `ai_image: "${String(s.ai_prompt).slice(0, 200)}"`;
  else if (s.search_query) visual = `stock: "${s.search_query}"`;
  else if (s.search_queries) visual = `multi: ${JSON.stringify(s.search_queries).slice(0, 180)}`;
  else if (s.data) visual = `data: ${JSON.stringify(s.data).slice(0, 240)}`;
  else visual = '(nothing specific)';
  return `scene ${s.index} [${s.menu_key}]
narration: "${narr}"
visual: ${visual}`;
}

/**
 * Review the planner's output. Returns { issues: [{scene_index, problem, suggested_fix}], verdict }.
 */
export async function reviewTaste({ storyboard, bible, run, startStep }) {
  const sceneDescriptions = storyboard.map(compactScene).join('\n\n');

  const prompt = `You are a senior creative director doing a taste review on a storyboard someone else just produced. You are looking specifically for the "this doesn't quite fit" problems that slip past a planner who is optimizing for menu variety.

VIDEO IDENTITY: ${bible.video_identity || ''}
NARRATIVE CENTER: ${bible.narrative_center || bible.subject_anchor || ''}

FULL STORYBOARD (${storyboard.length} scenes):
${sceneDescriptions}

YOUR JOB:
Read every scene. For each one, honestly ask yourself these three questions:

1. **FORCED COMPONENT** — does the picked component actually fit the narration, or did the planner shoehorn it? Example failure: picking \`ai_image_split_right_stat\` with \`panel_stat: {value: "$4,000", label: "loss filled as debt"}\` when the narration doesn't actually mention $4,000 or any "loss filled as debt" concept. The label is invented to justify the component. That's a miss.

2. **GENERIC / STOCK-PHOTO ENERGY** — does the ai_image prompt feel like a random stock photo ("hands writing with a pen", "person at desk", "cup of coffee on wood"), or does it advance the specific narrative of THIS video? Example failure: a scene about trading psychology getting an image of "hands holding a notebook" — that image has nothing to do with trading specifically. Stock-photo energy.

3. **BROKEN VISUAL STORYLINE** — does this image feel like part of the same film as the previous and next images, or does it feel like it was picked in isolation and glued in? Example failure: scene 10 shows a chess board, scene 11 shows hands typing, scene 12 shows a sunrise. Three random unrelated shots = no storyline.

FLAG ANY SCENE that fails any of these questions. Do not flag scenes that are merely "ok" — only flag scenes where a specific problem is visible.

Return a JSON object inside a \`\`\`json code block:

{
  "verdict": "pass | needs_revision",
  "issues": [
    {
      "scene_index": <int>,
      "problem_type": "forced_component | stock_energy | broken_storyline",
      "problem": "one sentence describing what's wrong with THIS specific scene",
      "suggested_fix": "one sentence — either a specific better visual OR 'change menu_key to X because...'"
    }
  ],
  "overall_note": "one sentence overall read of the storyboard's visual coherence and taste"
}

Be honest. Do not flag scenes that are fine just to pad the list. Do not flatter scenes that are off just because the rest of the storyboard works. Every flagged scene will be re-planned by the same planner who wrote it, and your suggested_fix is the instruction they'll follow.`;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - t0;
  const text = response.content[0].text;
  const result = parseJson(text);

  if (run) {
    run.logStep({
      index: startStep,
      name: 'taste-reviewer',
      input: { storyboard_size: storyboard.length },
      prompt,
      response: text,
      output: result,
      model: MODEL,
      usage: response.usage,
      elapsedMs,
    });
  }

  return {
    verdict: result.verdict,
    issues: result.issues || [],
    overall_note: result.overall_note,
    next_step_index: startStep + 1,
  };
}
