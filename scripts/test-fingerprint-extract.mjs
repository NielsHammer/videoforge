#!/usr/bin/env node
// Dry-run: extract fingerprint for 2 sample scripts to validate the pipeline.
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '/opt/videoforge/.env' });

const CLEAN_DIR = '/opt/videoforge/reference-scripts-clean';
const MODEL = 'claude-sonnet-4-6';
const MAX_BODY_WORDS = 8000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function truncateBody(body) {
  const words = body.split(/\s+/);
  if (words.length <= MAX_BODY_WORDS) return body;
  const headWords = Math.floor(MAX_BODY_WORDS * 0.7);
  const tailWords = MAX_BODY_WORDS - headWords;
  return words.slice(0, headWords).join(' ') +
    `\n\n[... ${words.length - MAX_BODY_WORDS} words omitted from middle ...]\n\n` +
    words.slice(-tailWords).join(' ');
}

function buildPrompt(title, body) {
  const trimmed = truncateBody(body);
  return `You are analyzing a top-performing YouTube video script to extract its STRUCTURAL DNA — not what it's about, but HOW it's built. This extraction becomes training data for an AI that writes new scripts, so be precise and honest. Don't flatter; if something is average, say so.

Script title: ${title}

Script body:
"""
${trimmed}
"""

Extract a single JSON object inside a \`\`\`json code block with exactly these fields:

{
  "style_tag": "personal_brand | educational | documentary | entertainment | tutorial",
  "opening_gambit_type": "cold_claim | rhetorical_question | scene_setter | shocking_statistic | in_medias_res | direct_challenge | promise_stack",
  "hook_transcript": "verbatim first 2-3 sentences",
  "hook_works_because": "one sentence — why this hook pulls you in, or 'weak — reason' if it doesn't",
  "audience_address": "direct_second_person | storytelling_third_person | mixed",
  "voice_markers": ["you", "imagine", "here's the thing"],
  "cadence_description": "one sentence on sentence-length rhythm",
  "density_tier": "sparse | medium | dense | very_dense",
  "density_reasoning": "one sentence on why you chose this tier",
  "reveal_timing": "front_loaded | drip_feed | back_loaded | escalating",
  "emotional_beat_map": ["curiosity", "tension", "relief"],
  "devices_used": ["cold_open", "rule_of_three", "callback_to_hook", "concrete_anchor", "rhetorical_question_chain", "list_plus_twist", "stakes_raising", "analogy", "direct_challenge_to_viewer"],
  "callback_present": true,
  "callback_description": "what gets called back and where, or null if no callback",
  "pacing_notes": "one sentence on how the script manages viewer attention over time",
  "biggest_strength": "one sentence — the single thing this script does best",
  "biggest_weakness": "one sentence — the single thing this script does worst",
  "what_makes_this_work": "one sentence — the ONE craft decision that makes this script feel worth watching. This is the taste insight future scripts should learn from."
}

Rules:
- Be honest. Personal brand videos are valid references — just tag them accurately.
- devices_used: list only devices actually present, not every possible device.
- emotional_beat_map: in order of appearance, not alphabetical.
- voice_markers: actual phrases the writer repeats, max 10.
- Return ONLY the JSON code block, no preamble.`;
}

function parseJson(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/);
  if (m) return JSON.parse(m[1]);
  const b = text.match(/\{[\s\S]*\}/);
  if (b) return JSON.parse(b[0]);
  throw new Error('No JSON found');
}

async function extract(file) {
  const raw = fs.readFileSync(path.join(CLEAN_DIR, file), 'utf8');
  const lines = raw.split('\n');
  const title = lines[0].trim();
  const body = lines.slice(1).join('\n').trim();

  console.log(`\n=== ${file} ===`);
  console.log(`Title: ${title}`);
  console.log(`Word count: ${body.split(/\s+/).length}`);

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: buildPrompt(title, body) }],
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const text = response.content[0].text;
  const fp = parseJson(text);
  console.log(`Elapsed: ${elapsed}s  tokens: in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);
  console.log(JSON.stringify(fp, null, 2));
}

// Pick two contrasting samples: a personal-brand (TED method) and an educational-documentary (Cold War)
await extract('100.txt'); // How to become a f*cking expert — personal brand
await extract('171.txt'); // Cold War Explained — educational documentary
