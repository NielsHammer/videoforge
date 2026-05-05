/**
 * Video bible v2 — the master design document that every downstream scene
 * decision reads before choosing imagery, animation, or infographic.
 *
 * One Claude call. It reads the full script and arc, then produces:
 *   - video_identity: one-line "what this video is about" the critic uses to gate
 *   - narrative_center: the core idea (concept, not prop) that anchors the video
 *   - visual_world: the era, setting, style vocabulary
 *   - tone
 *   - emotional_arc_points: pct-indexed emotion map
 *   - callback_location_pct: where the callback lands (so the planner can use it)
 *   - hook_promise: the exact line in the hook that must pay off visually
 *   - banned_imagery: generic stock clichés to avoid for this specific topic
 *   - must_appear: concrete things that HAVE to show up or the video loses identity
 *
 * The bible is passed into every storyboard-planner batch call. It is the
 * "human designer's vision document" that keeps the whole video coherent.
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

export async function buildVideoBible({ title, topic, niche, arc, script, run, startStep = 5 }) {
  if (!title || !script || !run) throw new Error('title, script, run required');

  const prompt = `You are a senior video director reading a full script to produce a one-page design bible. Every downstream visual decision — every image, every animation, every infographic — will read this bible before choosing what to show. Your job is to lock in the visual vision for the ENTIRE video so nothing drifts off-topic after the first minute.

Title: "${title}"
Topic: ${topic}
Niche: ${niche || 'unspecified'}

Narrative arc (already designed):
${JSON.stringify(arc, null, 2)}

Full script (READ THE ENTIRE THING):
"""
${script}
"""

Now produce the video bible. The bible is a LOOSE CONTEXT DOCUMENT that the planner consults for tone, topic, and narrative center. It is NOT a visual template that every scene must match. A great video uses metaphor, mood, mindset shots, and conceptual angles — not 24 variations of the same literal scene. The bible gives context, the individual scenes serve their own narration.

Return a single JSON object inside a \`\`\`json code block:

{
  "video_identity": "one sentence — what this video is about, said so clearly that the hook + callback scenes can be tested against it by asking 'does this answer the core question?'",
  "narrative_center": "a short phrase capturing the core idea, NOT a literal visual. For a trading video, this is 'the behavioral gap that separates the 10% who survive' — an IDEA, not 'trader at a desk'. For a Japanese balloon bomb video, this is 'a weapons program that killed American civilians at the exact moment its makers declared it a failure' — a STORY, not 'a balloon in a tree'. Think concept, not prop.",
  "visual_storyline": {
    "approach": "one sentence describing how this video should feel visually as a WHOLE — as if you were pitching the shot list to a documentary filmmaker. e.g. 'a quiet descent from morning calm into the trader's breaking point, ending on an empty desk at dawn' or 'five decades of a program told through the objects it left behind'",
    "key_beats": [
      { "beat": 1, "pct": 0.02, "image_concept": "the OPENING SHOT — what the viewer sees in the first 3 seconds. Be visually specific. This is the hook's visual.", "narrative_role": "hook" },
      { "beat": 2, "pct": 0.18, "image_concept": "second visual beat — builds on beat 1 or contrasts it", "narrative_role": "setup" },
      { "beat": 3, "pct": 0.35, "image_concept": "third visual beat — introduces the conflict or reveal", "narrative_role": "conflict_or_reveal" },
      { "beat": 4, "pct": 0.55, "image_concept": "fourth visual beat — the midpoint turn", "narrative_role": "turn" },
      { "beat": 5, "pct": 0.72, "image_concept": "fifth visual beat — insight or implication", "narrative_role": "insight" },
      { "beat": 6, "pct": 0.88, "image_concept": "sixth visual beat — the CALLBACK payoff shot that resolves the hook", "narrative_role": "callback" },
      { "beat": 7, "pct": 1.00, "image_concept": "the CLOSING SHOT — final image the viewer sees, the bitter/hopeful/quiet note that lingers", "narrative_role": "resolution" }
    ]
  },
  "visual_world": {
    "era": "time period when the story takes place",
    "setting": "the broader world context — historical period, geography, cultural moment — but stay broad. NOT 'home trading desk'; rather '2020s retail trading era'.",
    "style_vocabulary": "the visual aesthetic the video should cohere around (e.g. 'documentary realism, cold palette, forensic detail')",
    "hero_images": ["3-5 STRONG concrete images the hook scenes or callback scene should reach for. These are options, not requirements."],
    "metaphor_palette": ["5-10 CONCEPTUAL / METAPHORICAL visuals the planner can reach for when a scene is about mood, mindset, consequence, strategy, or emotion rather than the literal subject."]
  },
  "tone": "one phrase — the emotional color of the visuals (e.g. 'quietly ominous', 'reverent and tragic', 'clinical and forensic', 'warm and nostalgic')",
  "emotional_arc_points": [
    { "pct": 0.00, "emotion": "curiosity", "visual_note": "what the image at this moment should evoke" },
    { "pct": 0.25, "emotion": "...", "visual_note": "..." },
    { "pct": 0.50, "emotion": "...", "visual_note": "..." },
    { "pct": 0.85, "emotion": "callback_payoff", "visual_note": "this is where the callback lands — what the image should reinforce" },
    { "pct": 1.00, "emotion": "reflection", "visual_note": "..." }
  ],
  "hook_promise": "the exact line or claim in the script's opening that has to be paid off by the end — this is what the callback resolves",
  "callback_location_pct": 0.85,
  "banned_imagery": [
    "list of generic stock clichés that must NOT appear — the hacky shots this niche gets lazy with"
  ],
  "topic_clarity_rule": "A LOOSE guideline — NOT a rule for every image. Just: 'the hook (first 3-5 scenes) and the callback scene should unmistakably reference the specific topic. Every other scene serves its own narration and is free to use any image that fits the moment — mood, metaphor, concept, emotion.'",
  "pacing_plan": "one paragraph — how visual rhythm should change across the video"
}

IMPORTANT principles for producing this bible:
- The bible is CONTEXT, not a CAGE. The planner uses it to understand what the video IS, not to copy-paste visuals from it.
- Every field should OPEN options, not restrict them. If you find yourself writing "MUST appear" or "every image must show", reframe as "strong options for hero moments" or "loose guidance".
- metaphor_palette is essential — it gives the planner explicit permission to reach for conceptual visuals instead of forcing every scene into the same literal frame.
- hero_images are for 3-5 moments of topic clarity (hook, reveal, callback). Everything else is free.`;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  const elapsedMs = Date.now() - t0;
  const text = response.content[0].text;
  const bible = parseJson(text);

  run.logStep({
    index: startStep,
    name: 'video-bible',
    input: { title, topic, niche, script_word_count: script.split(/\s+/).length },
    prompt,
    response: text,
    output: bible,
    model: MODEL,
    usage: response.usage,
    elapsedMs,
  });

  return {
    bible,
    next_step_index: startStep + 1,
  };
}
