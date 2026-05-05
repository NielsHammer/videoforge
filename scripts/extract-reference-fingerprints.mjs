#!/usr/bin/env node
/**
 * Extracts structural DNA from each cleaned reference script.
 * Writes one JSON fingerprint per script to /opt/videoforge/reference-scripts-fingerprints/.
 * Resumable: skips files that already have a fingerprint.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '/opt/videoforge/.env' });

const CLEAN_DIR = '/opt/videoforge/reference-scripts-clean';
const OUT_DIR = '/opt/videoforge/reference-scripts-fingerprints';
const MODEL = 'claude-sonnet-4-6';
const CONCURRENCY = 5;
const MAX_BODY_WORDS = 8000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY missing from /opt/videoforge/.env');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function readScript(file) {
  const raw = fs.readFileSync(path.join(CLEAN_DIR, file), 'utf8');
  const lines = raw.split('\n');
  const title = lines[0].trim();
  const body = lines.slice(1).join('\n').trim();
  return { title, body };
}

function truncateBody(body) {
  const words = body.split(/\s+/);
  if (words.length <= MAX_BODY_WORDS) return body;
  const headWords = Math.floor(MAX_BODY_WORDS * 0.7);
  const tailWords = MAX_BODY_WORDS - headWords;
  const head = words.slice(0, headWords).join(' ');
  const tail = words.slice(-tailWords).join(' ');
  return `${head}\n\n[... ${words.length - MAX_BODY_WORDS} words omitted from middle ...]\n\n${tail}`;
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
  "primary_style": "one of: personal_brand, educational, documentary, entertainment, tutorial (pick the strongest single fit)",
  "secondary_style": "one of the same options if the script meaningfully blends two styles, otherwise null",
  "opening_gambit_type": "one of: cold_claim, rhetorical_question, scene_setter, shocking_statistic, in_medias_res, direct_challenge, promise_stack (pick exactly one)",
  "hook_transcript": "verbatim first 2-3 sentences",
  "hook_works_because": "one sentence — why this hook pulls you in, or 'weak — reason' if it doesn't",
  "audience_address": "one of: direct_second_person, storytelling_third_person, mixed (pick exactly one)",
  "voice_markers": ["you", "imagine", "here's the thing"],
  "cadence_description": "one sentence on sentence-length rhythm",
  "density_tier": "one of: sparse, medium, dense, very_dense (pick exactly one)",
  "density_reasoning": "one sentence on why you chose this tier",
  "reveal_timing": "one of: front_loaded, drip_feed, back_loaded, escalating (pick exactly one)",
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

function parseJsonFromResponse(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (match) return JSON.parse(match[1]);
  // Fallback: try to find a bare JSON object
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return JSON.parse(braceMatch[0]);
  throw new Error('No JSON found in response');
}

async function extractFingerprint(file) {
  const outPath = path.join(OUT_DIR, file.replace('.txt', '.json'));
  if (fs.existsSync(outPath)) {
    return { file, status: 'skipped' };
  }

  const { title, body } = readScript(file);
  if (!body || body.length < 100) {
    return { file, status: 'skipped_short', title };
  }

  const prompt = buildPrompt(title, body);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].text;
    const fingerprint = parseJsonFromResponse(text);

    // Add metadata
    fingerprint._meta = {
      source_file: file,
      title,
      script_word_count: body.split(/\s+/).length,
      extracted_at: new Date().toISOString(),
      model: MODEL,
    };

    fs.writeFileSync(outPath, JSON.stringify(fingerprint, null, 2));
    return {
      file,
      status: 'ok',
      title,
      usage: response.usage,
    };
  } catch (err) {
    return { file, status: 'error', title, error: err.message };
  }
}

async function runPool(items, concurrency, worker) {
  const results = [];
  let idx = 0;
  const runners = Array(concurrency).fill(0).map(async () => {
    while (idx < items.length) {
      const i = idx++;
      const r = await worker(items[i]);
      results[i] = r;
      const done = results.filter(Boolean).length;
      const title = r.title ? r.title.slice(0, 50) : '';
      process.stdout.write(`[${done}/${items.length}] ${r.status} — ${r.file} ${title}\n`);
    }
  });
  await Promise.all(runners);
  return results;
}

const files = fs.readdirSync(CLEAN_DIR)
  .filter(f => f.endsWith('.txt'))
  .sort();

console.log(`Input: ${files.length} cleaned scripts`);
console.log(`Output: ${OUT_DIR}`);
console.log(`Model: ${MODEL}`);
console.log(`Concurrency: ${CONCURRENCY}`);
console.log('');

const start = Date.now();
const results = await runPool(files, CONCURRENCY, extractFingerprint);
const elapsed = ((Date.now() - start) / 1000).toFixed(0);

const ok = results.filter(r => r.status === 'ok');
const skipped = results.filter(r => r.status === 'skipped' || r.status === 'skipped_short');
const errors = results.filter(r => r.status === 'error');

const totalInputTokens = ok.reduce((s, r) => s + (r.usage?.input_tokens ?? 0), 0);
const totalOutputTokens = ok.reduce((s, r) => s + (r.usage?.output_tokens ?? 0), 0);

console.log('\n=== FINGERPRINT EXTRACTION REPORT ===');
console.log(`Elapsed:         ${elapsed}s`);
console.log(`Extracted:       ${ok.length}`);
console.log(`Skipped:         ${skipped.length}`);
console.log(`Errors:          ${errors.length}`);
console.log(`Input tokens:    ${totalInputTokens.toLocaleString()}`);
console.log(`Output tokens:   ${totalOutputTokens.toLocaleString()}`);
// Sonnet 4.6 pricing (approx): $3/M input, $15/M output
const cost = (totalInputTokens / 1e6) * 3 + (totalOutputTokens / 1e6) * 15;
console.log(`Est. cost:       $${cost.toFixed(2)}`);

if (errors.length > 0) {
  console.log('\nErrors:');
  for (const e of errors) console.log(`  ${e.file}: ${e.error}`);
}
