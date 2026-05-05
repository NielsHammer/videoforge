/**
 * Visual continuity verifier — belt-and-suspenders for the visual_storyline
 * fix in the bible. After the planner runs, this asks Claude:
 *
 *   "Do these images tell ONE visual story, or do they feel like 24
 *    stock-photo picks glued together?"
 *
 * If the latter, it returns specific scene indices where the visual thread
 * breaks, plus suggestions for replacements that maintain continuity.
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
  throw new Error('No JSON in continuity verifier response');
}

/**
 * Run the continuity check. Returns { issues, verdict, rebuilt_storyline }.
 */
export async function verifyVisualContinuity({ storyboard, bible, run, startStep }) {
  // Render a compact visual-only summary for Claude to read as a shot list
  const shotList = storyboard.map(s => {
    const image =
      s.ai_prompt ? `AI: ${String(s.ai_prompt).slice(0, 160)}` :
      s.search_query ? `STOCK: ${s.search_query}` :
      s.search_queries ? `MULTI: ${JSON.stringify(s.search_queries).slice(0, 160)}` :
      s.data ? `GRAPHIC(${s.menu_key}): ${JSON.stringify(s.data).slice(0, 140)}` :
      `[${s.menu_key}]`;
    return `${s.index}. ${image}`;
  }).join('\n');

  const plannedStoryline = bible.visual_storyline
    ? `PLANNED VISUAL STORYLINE FROM THE BIBLE (7 beats):\n${
        (bible.visual_storyline.key_beats || []).map(b => `beat ${b.beat} @${Math.round((b.pct || 0) * 100)}% — ${b.image_concept}`).join('\n')
      }\n\nApproach: ${bible.visual_storyline.approach || ''}`
    : '(no visual storyline was planned — this check is still valid)';

  const prompt = `You are a documentary film editor reviewing a rough cut's shot list. Your ONE question: do these shots tell a single continuous visual story, or do they feel like random stock photos glued together?

VIDEO IDENTITY: ${bible.video_identity || ''}

${plannedStoryline}

ACTUAL SHOT LIST (${storyboard.length} scenes, in order):
${shotList}

THINK LIKE A DOCUMENTARY EDITOR:
- A good documentary's shot list has visual flow. Each shot relates to the one before and the one after. Even when cutting away for a metaphor, the metaphor earns its place by reinforcing the emotional beat.
- A bad documentary's shot list has visual whiplash. Shot 7 is hands writing with a pen, shot 8 is a chess board, shot 9 is a mountain sunrise. None of them connect. They're all "vaguely on-topic" but they tell NO story.
- The reference benchmark: the Japanese balloon bomb video had a shot list that read like a documentary — forest road → balloon in branches → man at car → wartime map → schoolgirls laminating washi paper → jet stream → monument. Every shot was a new page in the same story.

YOUR TASK:
1. Walk the shot list in order.
2. Identify any scene where the visual CLEARLY breaks the thread — the shot doesn't connect to what came before, doesn't connect to what comes after, or feels randomly picked.
3. For each broken shot, suggest a specific replacement image that would reconnect the thread.
4. If the overall flow is strong, say so — don't invent issues to pad a list.

Return a JSON object inside a \`\`\`json code block:

{
  "verdict": "coherent | broken_thread",
  "overall_continuity_score": 1-10,
  "broken_scenes": [
    {
      "scene_index": <int>,
      "why_it_breaks": "one sentence — specifically why this image fails to connect to its neighbors",
      "suggested_replacement": "one sentence describing a specific image that would maintain continuity"
    }
  ],
  "strongest_thread": "one sentence — the best visual throughline in this shot list",
  "editor_note": "one paragraph — honest assessment of whether this feels like a documentary or like a slideshow of stock photos"
}

Be HONEST, not charitable. A score of 6 is "passable but unmemorable". A score of 8 is "feels like a real film". A score of 10 is "every shot earns its place and advances the story".`;

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
      name: 'visual-continuity',
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
    score: result.overall_continuity_score,
    broken_scenes: result.broken_scenes || [],
    strongest_thread: result.strongest_thread,
    editor_note: result.editor_note,
    next_step_index: startStep + 1,
  };
}
