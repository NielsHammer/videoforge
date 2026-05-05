/**
 * Title generator v2 — learns from 169 top-performing reference titles.
 *
 * Principle-based, not rule-based. Two passes:
 *   (1) BRAINSTORM — Claude studies the reference set and writes 10 candidates
 *       for the given topic that match the patterns top performers actually use.
 *   (2) SELECT — Claude scores each candidate on 4 taste axes, picks a winner,
 *       and explains why.
 *
 * Every call is logged via the run-logger so the whole decision trail is visible.
 */
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { getAllTitles, sampleTasteInsights } from './fingerprint-reader.js';

dotenv.config({ path: '/opt/videoforge/.env' });

const MODEL = 'claude-sonnet-4-6';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const b = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (b) return JSON.parse(b[0]);
  throw new Error('No JSON found in response');
}

async function callClaude({ prompt, maxTokens = 2000 }) {
  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return {
    text: response.content[0].text,
    usage: response.usage,
    elapsedMs: Date.now() - t0,
  };
}

/**
 * Step 1 — Brainstorm. Returns { candidates: [{title, reasoning}, ...] }.
 */
async function brainstormTitles({ topic, niche, run, stepIndex }) {
  const allTitles = getAllTitles();
  const insights = sampleTasteInsights(8);

  const prompt = `You are studying the titles of 169 top-performing YouTube videos to learn what makes a title click, then generating new titles for a specific topic.

Topic: ${topic}
${niche ? `Niche: ${niche}\n` : ''}
Here are all 169 reference titles — study them to learn what patterns actually work at the top:

${allTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Here are 8 taste insights from those same videos — what makes them work:

${insights.map((i, n) => `${n + 1}. [${i.style}] "${i.title}" — ${i.insight}`).join('\n\n')}

Now generate 10 title candidates for the topic: "${topic}"

Rules:
- Match the patterns you see in the reference set. Do not invent new patterns.
- Every title must be curious, clickable, emotional, AND topic-clear all at once.
- Never open with "Did you know" or generic rhetorical questions — those are the BOTTOM of the reference set.
- Use the devices top performers actually use: promise stacks, cold claims, in-medias-res, direct challenges, concrete anchors with specific numbers/names, list-with-twist.
- Be concrete and specific to THIS topic. A title that could apply to 5 other videos is a weak title.
- Vary the structure across the 10 — do not write 10 variations of the same pattern.
- Titles should be 5-12 words. Not shorter, not longer.

Return a JSON array inside a \`\`\`json code block, each item like:
{
  "title": "exact title as it would appear on YouTube",
  "pattern": "the device/pattern this title uses (e.g. promise_stack, cold_claim, in_medias_res, direct_challenge, list_plus_twist)",
  "reasoning": "one sentence — why this should click for THIS topic"
}`;

  const { text, usage, elapsedMs } = await callClaude({ prompt, maxTokens: 2500 });
  const candidates = parseJson(text);

  run.logStep({
    index: stepIndex,
    name: 'title-brainstorm',
    input: { topic, niche, reference_title_count: allTitles.length, taste_insight_count: insights.length },
    prompt,
    response: text,
    output: { candidates },
    model: MODEL,
    usage,
    elapsedMs,
  });

  return candidates;
}

/**
 * Step 2 — Select. Scores each candidate and picks the winner.
 */
async function selectBestTitle({ topic, candidates, run, stepIndex }) {
  const prompt = `You are selecting the strongest title from 10 candidates for a YouTube video about: "${topic}"

Candidates:
${candidates.map((c, i) => `${i + 1}. ${c.title}\n   pattern: ${c.pattern}\n   reasoning: ${c.reasoning}`).join('\n\n')}

Score each candidate 1-10 on each of these 4 axes, then pick ONE winner:

1. CURIOSITY — does it open a gap the viewer has to close? Would they WANT to click?
2. TOPIC CLARITY — can a viewer tell what the video is about from the title alone in 2 seconds? (A beautiful title for the wrong video is worse than an ugly one for the right video.)
3. EMOTION — does reading it make you FEEL something, not just understand a fact?
4. SPECIFICITY — is this title tied to THIS specific topic, or could it be swapped onto 5 other videos? Generic = weak.

Be harsh. If a title is merely OK, say so — do not flatter anything.

Return a single JSON object inside a \`\`\`json code block:
{
  "scored_candidates": [
    { "index": 1, "title": "...", "curiosity": 8, "topic_clarity": 7, "emotion": 6, "specificity": 9, "total": 30, "notes": "one sentence critique" }
  ],
  "winner_index": 1,
  "winner_title": "the final chosen title",
  "why_it_won": "one paragraph — why this beats the others specifically",
  "rejected_strongest_alternative": "the second-place title and one sentence on why it lost"
}`;

  const { text, usage, elapsedMs } = await callClaude({ prompt, maxTokens: 3000 });
  const result = parseJson(text);

  run.logStep({
    index: stepIndex,
    name: 'title-select',
    input: { topic, candidate_count: candidates.length },
    prompt,
    response: text,
    output: result,
    model: MODEL,
    usage,
    elapsedMs,
  });

  return result;
}

/**
 * Main entry point. Generates a title for the given topic, writing all artifacts
 * to the provided run. Returns the winning title string and the full decision trail.
 *
 * @param {object} args
 * @param {string} args.topic     — what the video is about
 * @param {string} [args.niche]   — optional niche hint
 * @param {object} args.run       — run object from createRun()
 * @param {number} [args.startStep=1] — step index to use for the first step
 */
export async function generateTitle({ topic, niche, run, startStep = 1 }) {
  if (!topic) throw new Error('topic is required');
  if (!run) throw new Error('run is required');

  const candidates = await brainstormTitles({
    topic, niche, run, stepIndex: startStep,
  });

  const selection = await selectBestTitle({
    topic, candidates, run, stepIndex: startStep + 1,
  });

  return {
    title: selection.winner_title,
    selection,
    candidates,
    next_step_index: startStep + 2,
  };
}
