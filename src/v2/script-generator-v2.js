/**
 * Script generator v2 — learns from 169 top-performing reference scripts.
 *
 * Two Claude calls:
 *   (1) ARC — design the narrative structure (hook type, reveal timing, callback
 *       location, density target, voice style, emotional beats, devices).
 *   (2) WRITE — write the actual script to match the arc, hitting a measured
 *       word count from fingerprint data.
 *
 * No rules. The prompts describe principles + show the reference set's patterns,
 * and Claude reasons from there.
 */
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import {
  getDistributions,
  getTopDevices,
  getVoiceMarkerPool,
  sampleTasteInsights,
  sampleHooks,
  sampleCallbacks,
  getSummaryForPrompt,
} from './fingerprint-reader.js';

dotenv.config({ path: '/opt/videoforge/.env' });

const MODEL = 'claude-sonnet-4-6';
// Default WPM — can be overridden per call via the wordsPerMinute parameter
// so different tones (documentary vs upbeat vs energetic) hit their own density.
const DEFAULT_WORDS_PER_MINUTE = 145;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const b = text.match(/\{[\s\S]*\}/);
  if (b) return JSON.parse(b[0]);
  throw new Error('No JSON found in response');
}

async function callClaude({ prompt, maxTokens = 4000 }) {
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
 * Step A — Narrative arc. Decides HOW the script will be structured before a
 * single sentence is written. Pulls targets directly from the fingerprint data.
 */
async function planArc({ title, topic, niche, targetSeconds, wordsPerMinute, toneVibe, run, stepIndex }) {
  const wpm = wordsPerMinute || DEFAULT_WORDS_PER_MINUTE;
  const targetWords = Math.round((targetSeconds / 60) * wpm);
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.05); // tighter upper bound to prevent overshoots

  // v2 iter 11: bump sample counts so the arc planner sees more of the
  // reference set's voice. More examples = more specific voice imprint.
  const taste = sampleTasteInsights(18);
  const hooks = sampleHooks(15);
  const callbacks = sampleCallbacks(10);
  const topDevices = getTopDevices(15);
  const voiceMarkers = getVoiceMarkerPool(30);
  const summary = getSummaryForPrompt();

  const prompt = `You are planning the structure of a new YouTube video script BEFORE writing a single sentence. You have full access to structural data extracted from 169 top-performing videos. Use it.

Video details:
- Title: "${title}"
- Topic: ${topic}
- Niche: ${niche || 'unspecified'}
- Target duration: ${targetSeconds} seconds (~${targetWords} words at ${wpm} wpm)
- Word count target: ${minWords}-${maxWords} words (hard constraint — going over means the video will exceed target duration)
${toneVibe ? `- Target tone/vibe: ${toneVibe}` : ''}

Reference set facts (measured, not vibes):
${summary}

Top devices actually used by top performers:
${topDevices.map(d => `- ${d.device} (${d.count}/169)`).join('\n')}

Most common voice markers in top performers:
${voiceMarkers.map(v => `"${v.marker}"`).join(', ')}

${hooks.length} hook examples from the reference set — STUDY THE VOICE not just the structure:
${hooks.map((h, i) => `${i + 1}. [${h.style}, ${h.gambit}] "${h.hook}"\n   works because: ${h.works_because}`).join('\n\n')}

Before you write the arc, identify 2-3 of these hook examples whose VOICE feels closest to "${title}" — the topic tone, the energy level, the kind of person who would naturally say this. Then write the arc as if it were a script in that SAME voice. This is a "voice lock" — once you pick the reference voices, stay in their register.

Notice: the ones that land hardest sound like a real person talking from experience. First-person "I" is common. Conversational contractions everywhere. Zero narrator voice. Match this voice whenever the topic allows it.

6 callback examples from the reference set:
${callbacks.map((c, i) => `${i + 1}. ${c.title}: ${c.description}`).join('\n\n')}

10 taste insights from the reference set (what actually makes a script feel worth watching):
${taste.map((t, i) => `${i + 1}. [${t.style}, ${t.density}] ${t.insight}`).join('\n\n')}

Based on ALL of the above, design a narrative arc for "${title}". Return a JSON object inside a \`\`\`json code block:

{
  "primary_style": "one of: personal_brand, educational, documentary, entertainment, tutorial — pick the best fit for this topic. Tilt toward personal_brand / tutorial when the topic involves experience, advice, money, creator economy, trading, self-improvement — anything where a real person would have first-hand knowledge.",
  "voice_stance": "one of: first_person_experience, mixed_you_and_i, second_person_instructive, third_person_storytelling. Default to first_person_experience or mixed_you_and_i for any topic involving personal expertise. Only use third_person_storytelling for historical / documented events.",
  "opening_gambit": "one of: promise_stack, in_medias_res, cold_claim, direct_challenge, scene_setter — NEVER rhetorical_question or shocking_statistic (those are the bottom of the reference set)",
  "hook_strategy": "2-3 sentences — what the hook will promise and how it will pull the viewer in. This IS the thing that gets called back later.",
  "reveal_timing": "drip_feed (default — top performers use this 85% of the time) or escalating (stakes keep rising)",
  "density_tier": "dense (default) or very_dense — never medium or sparse",
  "density_reasoning": "one sentence — what specifically makes this dense",
  "audience_address": "direct_second_person or mixed — never pure storytelling_third_person",
  "voice_markers_to_use": ["pick 5-7 markers from the reference set that fit this topic's tone"],
  "callback_plan": {
    "hook_promise": "the exact line in the hook that gets called back",
    "callback_location_pct": 0.85,
    "callback_description": "what specifically gets called back and how it resolves"
  },
  "emotional_beat_map": [
    { "pct": 0, "beat": "curiosity", "note": "what triggers it" },
    { "pct": 0.25, "beat": "tension", "note": "..." },
    { "pct": 0.50, "beat": "reveal", "note": "..." },
    { "pct": 0.85, "beat": "callback_resolution", "note": "..." },
    { "pct": 1.0, "beat": "outro", "note": "..." }
  ],
  "devices_to_use": ["pick 4-6 devices from the top list that fit this topic"],
  "structural_notes": "one paragraph — the specific flow of this script, section by section, so the writer knows exactly what each part accomplishes",
  "what_must_not_happen": "one or two sentences — the failure modes this script must avoid (generic filler, rhetorical questions, stock-footage-friendly abstractions, etc)",
  "target_word_count": ${targetWords},
  "min_word_count": ${minWords},
  "max_word_count": ${maxWords}
}

Be specific to "${topic}". An arc that could apply to any topic is a weak arc.`;

  const { text, usage, elapsedMs } = await callClaude({ prompt, maxTokens: 3000 });
  const arc = parseJson(text);

  run.logStep({
    index: stepIndex,
    name: 'script-arc',
    input: { title, topic, niche, targetSeconds, targetWords },
    prompt,
    response: text,
    output: arc,
    model: MODEL,
    usage,
    elapsedMs,
  });

  return arc;
}

/**
 * Step B — Write the script against the arc.
 */
async function writeScript({ title, topic, arc, run, stepIndex }) {
  const prompt = `You are writing a YouTube video script. A structural arc has already been designed for you based on data from 169 top-performing videos. Your job is to write the script that matches this arc exactly.

Title: "${title}"
Topic: ${topic}

The arc you must match (designed from real top-performer data):
${JSON.stringify(arc, null, 2)}

Hard rules:
1. Word count: ${arc.min_word_count}-${arc.max_word_count} words. Not shorter, not longer. Count as you go.
2. Density tier: ${arc.density_tier}. Every sentence must carry information, advance the story, or raise stakes. ZERO filler. ZERO padding.
3. Opening gambit: ${arc.opening_gambit}. Use this exact pattern. Never open with a rhetorical question or a shocking statistic.
4. Audience address: ${arc.audience_address}. Use "you" directly where natural.
5. Callback: the hook promise "${arc.callback_plan.hook_promise}" MUST be called back at approximately ${Math.round(arc.callback_plan.callback_location_pct * 100)}% of the script's length. ${arc.callback_plan.callback_description}
6. Reveal timing: ${arc.reveal_timing}. Tease, delay, pay off. Do not give everything at the start.
7. Voice markers to lean on (use naturally, do not force): ${arc.voice_markers_to_use.join(', ')}
8. Devices to use: ${arc.devices_to_use.join(', ')}
9. Forbidden: ${arc.what_must_not_happen}

VOICE — THE MOST IMPORTANT THING IN THIS ENTIRE PROMPT:

You have access to 169 real scripts that performed. You studied 15 hooks, 18 taste insights, 10 callbacks. The voice in those references is NOT a narrator voice. It's a person who knows things talking to another person. That's the voice you must write in.

THE VOICE TEST: Read your script out loud. Does it sound like something a person would actually SAY to a friend over coffee? Or does it sound like something an AI would WRITE for a "professional YouTube video"? If the latter, rewrite it.

Signs your script sounds like AI (the 169 references NEVER do these):
- Thesis-statement openings: "Today we explore...", "In this video...", "The world of X is..."
- Topic-sentence paragraph structure: statement → explanation → transition → statement
- Balanced "on one hand / on the other hand" equivocating
- Summarizing what you just said: "So as we can see...", "In summary..."
- Filler connectives: "Furthermore", "Additionally", "Moreover", "It's worth noting"
- Hedging: "It's important to understand that...", "One could argue..."
- Generic enthusiasm: "fascinating", "incredible", "remarkable", "mind-blowing"

Signs your script sounds like a REAL PERSON (this is what the references actually do):
- Starts mid-thought, like you walked into a conversation: "So here's what nobody tells you about Antarctica..."
- Has OPINIONS, not balanced takes: "This is insane. There's no other word for it."
- Uses incomplete sentences: "Gone. All of it. Overnight."
- Gets specific fast: real names, real numbers, real places in the first 10 seconds
- Talks TO the viewer: "You'd think that's the end, right? It's not even close."
- Has rhythm — short punch, long explanation, short punch: "Four billion dollars. That's what Singapore's GDP was in 1965. Smaller than most American cities. And within one generation, they turned it into this."
- Sounds like it was written by someone who cares about this specific topic, not someone filling a content slot

Write every sentence as if you're the person who spent 6 months researching this topic and can't wait to tell someone what you found. Not as a scriptwriter filling a brief.

TTS SAFETY RULES (voiceover will mispronounce otherwise — BAN these forms entirely):
- NEVER write "WWII" or "WW2" — ALWAYS write "World War Two"
- NEVER write Roman numerals like "II", "III", "IV" — write "two", "three", "four"
- NEVER write ordinals like "1st", "2nd" — write "first", "second"
- NEVER write "#1" or "#47" — write "number one", "number forty-seven"
- NEVER write currency shorthand like "$1M", "$2.5B", "$500K" — write "one million dollars", "two and a half billion dollars", "five hundred thousand dollars"
- NEVER write "&" — write "and"
- NEVER write acronyms on first use without spelling them out — "NASA" is fine (pronounceable), but "FTC", "DOJ", "IRS" should be "the FTC, the Federal Trade Commission" on first use
- NEVER write slashes in numbers like "2/3" — write "two thirds"
- NEVER write dates as "3/15/1945" — write "March fifteenth, 1945"
- Years alone are fine: "1945", "2026" — ElevenLabs handles those correctly.

Return your response as a single JSON object inside a \`\`\`json code block:

{
  "script": "the full script as a single string — one flowing paragraph with proper punctuation, no section headers, no stage directions, no speaker labels",
  "word_count": <exact count of words in the script field>,
  "callback_verified": true,
  "callback_sentence": "the exact sentence in the script where the hook promise gets called back",
  "opening_sentence": "the exact first sentence of the script — verify it matches the ${arc.opening_gambit} pattern"
}`;

  const { text, usage, elapsedMs } = await callClaude({ prompt, maxTokens: 6000 });
  const scriptResult = parseJson(text);

  // Verify word count programmatically
  const actualWordCount = scriptResult.script.trim().split(/\s+/).length;
  scriptResult.word_count_verified = actualWordCount;
  scriptResult.word_count_in_range =
    actualWordCount >= arc.min_word_count && actualWordCount <= arc.max_word_count;

  run.logStep({
    index: stepIndex,
    name: 'script-write',
    input: { title, topic, arc },
    prompt,
    response: text,
    output: scriptResult,
    model: MODEL,
    usage,
    elapsedMs,
  });

  return scriptResult;
}

/**
 * Retry the script writer with explicit overshoot feedback until it lands in range.
 */
async function writeScriptWithRetry({ title, topic, arc, run, stepIndex, maxAttempts = 3 }) {
  let lastResult = await writeScript({ title, topic, arc, run, stepIndex });
  let attempt = 1;

  while (!lastResult.word_count_in_range && attempt < maxAttempts) {
    attempt += 1;
    const actual = lastResult.word_count_verified;
    const direction = actual > arc.max_word_count ? 'trim' : 'expand';
    const overshoot = actual > arc.max_word_count
      ? actual - arc.max_word_count
      : arc.min_word_count - actual;

    const retryPrompt = `Your previous script was ${actual} words. The hard target is ${arc.min_word_count}-${arc.max_word_count} words. You need to ${direction} it by approximately ${overshoot} words.

Original arc:
${JSON.stringify(arc, null, 2)}

Previous script (the one that was out of range):
"""
${lastResult.script}
"""

Rules for this retry:
- ${direction === 'trim'
    ? 'Identify the SPECIFIC filler sentences and transitional phrases that can be cut without losing information, meaning, or emotional beats. Do NOT change the hook, the callback, or any numbered facts.'
    : 'Add specific, concrete density to under-developed sections. Do NOT pad with stock phrases.'}
- Preserve the opening sentence exactly.
- Preserve the callback sentence exactly.
- Preserve all proper nouns, numbers, and dates.
- Return the same JSON schema as before: { script, word_count, callback_verified, callback_sentence, opening_sentence }`;

    const t0 = Date.now();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      messages: [{ role: 'user', content: retryPrompt }],
    });
    const elapsedMs = Date.now() - t0;
    const text = response.content[0].text;
    const retryResult = parseJson(text);
    const actualWordCount = retryResult.script.trim().split(/\s+/).length;
    retryResult.word_count_verified = actualWordCount;
    retryResult.word_count_in_range =
      actualWordCount >= arc.min_word_count && actualWordCount <= arc.max_word_count;

    run.logStep({
      index: stepIndex + attempt - 1,
      name: `script-write-retry-${attempt}`,
      input: { title, previous_word_count: actual, direction, overshoot },
      prompt: retryPrompt,
      response: text,
      output: retryResult,
      model: MODEL,
      usage: response.usage,
      elapsedMs,
    });

    lastResult = retryResult;
  }

  return { result: lastResult, attempts: attempt };
}

/**
 * Main entry point.
 * @returns { arc, script, word_count, callback_sentence, opening_sentence, next_step_index }
 */
export async function generateScript({ title, topic, niche, targetSeconds, wordsPerMinute, toneVibe, run, startStep = 3 }) {
  if (!title) throw new Error('title is required');
  if (!topic) throw new Error('topic is required');
  if (!targetSeconds) throw new Error('targetSeconds is required');
  if (!run) throw new Error('run is required');

  const arc = await planArc({
    title, topic, niche, targetSeconds, wordsPerMinute, toneVibe, run, stepIndex: startStep,
  });

  const { result: scriptResult, attempts } = await writeScriptWithRetry({
    title, topic, arc, run, stepIndex: startStep + 1, maxAttempts: 3,
  });

  return {
    arc,
    script: scriptResult.script,
    word_count: scriptResult.word_count_verified,
    word_count_in_range: scriptResult.word_count_in_range,
    script_attempts: attempts,
    callback_sentence: scriptResult.callback_sentence,
    opening_sentence: scriptResult.opening_sentence,
    next_step_index: startStep + 1 + attempts, // arc step + N write attempts
  };
}
