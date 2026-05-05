/**
 * Self-Rewriting Thumbnail Loop
 *
 * Each iteration:
 *   1. Snapshot src/thumbnail-v2.js
 *   2. Dynamic-import the module (cache-busted) so the previous iter's edits take effect
 *   3. Pick 1 random video, generate, deep-review
 *   4. Send full source + review to Claude Opus, get ONE high-impact code edit
 *   5. Apply edits as exact-string substitutions (must be unique in file)
 *   6. Validate: re-import. If it throws -> revert from snapshot
 *   7. If next iter's generation throws, attribute it to the prior edit and revert
 *
 * Run:
 *   node scripts/self-rewriting-thumbnail-loop.mjs [iterations] [start_from]
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ITERATIONS = parseInt(process.argv[2]) || 50;
const START_FROM = parseInt(process.argv[3]) || 1;

const REPO = '/opt/videoforge';
const SRC_PATH = path.join(REPO, 'src/thumbnail-v2.js');
const SRC_URL = 'file://' + SRC_PATH;
const BASE_DIR = path.join(REPO, 'output/self-rewriting-loop');
const SNAPSHOT_DIR = path.join(BASE_DIR, 'snapshots');
const EDIT_LOG = path.join(BASE_DIR, 'edit-history.jsonl');
const RUN_LOG = path.join(BASE_DIR, 'run-log.jsonl');
const SCORE_LOG = path.join(BASE_DIR, 'scores.jsonl');

if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });
if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

const videoLib = JSON.parse(fs.readFileSync(path.join(REPO, 'video-library/index.json'), 'utf-8'));
const allVideos = videoLib.videos || [];

function pickRandomVideo() {
  return allVideos[Math.floor(Math.random() * allVideos.length)];
}

function detectNiche(title) {
  const t = title.toLowerCase();
  if (/stock|invest|money|trading|million|rich|\$/.test(t)) return 'finance';
  if (/space|planet|universe|nasa|galaxy|star/.test(t)) return 'space';
  if (/hack|cyber|virus|dark web|\bai /.test(t)) return 'tech';
  if (/war|president|history|ancient|civil|medieval/.test(t)) return 'history';
  if (/routine|habit|morning|discipline|detox|workout/.test(t)) return 'health';
  if (/travel|country|city|building|island/.test(t)) return 'travel';
  return 'education';
}

function logJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}

function snapshot(iter) {
  const dest = path.join(SNAPSHOT_DIR, `iter-${String(iter).padStart(3, '0')}.thumbnail-v2.js`);
  fs.copyFileSync(SRC_PATH, dest);
  return dest;
}

function restoreFrom(snapshotPath) {
  fs.copyFileSync(snapshotPath, SRC_PATH);
}

async function importFresh() {
  // Cache-bust via query string. Each call returns a fresh module instance.
  return await import(`${SRC_URL}?cb=${Date.now()}_${Math.random()}`);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms)),
  ]);
}

// ─── DEEP REVIEW ────────────────────────────────────────────────────────────────

async function deepReview(imagePath, title) {
  const base64 = fs.readFileSync(imagePath).toString('base64');
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
        { type: 'text', text: `You are a brutal YouTube thumbnail critic. Rate this thumbnail for "${title}".

Imagine seeing it at 168x94 pixels for 0.05 seconds while scrolling. Rate 1-10.

For EVERY problem, identify:
1. SYMPTOM: what's visually wrong
2. HUMAN REACTION: what a viewer feels seeing this
3. ROOT CAUSE: which part of the code/prompt/logic produced this (be specific — name the function, the prompt section, the rendering decision, the data flow, etc.)
4. CODE FIX: a concrete change a developer could make to src/thumbnail-v2.js to prevent this

Return ONLY valid JSON:
{
  "rating": 1-10,
  "would_click": true/false,
  "first_impression": "what a person sees in 0.05s",
  "works": ["what's good and why"],
  "problems": [
    {
      "symptom": "...",
      "human_reaction": "...",
      "root_cause": "...",
      "code_fix": "..."
    }
  ]
}` }
      ]
    }]
  });

  const text = response.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { rating: 0, problems: [], works: [], _raw: text };
  try {
    return JSON.parse(match[0]);
  } catch {
    return { rating: 0, problems: [], works: [], _raw: text };
  }
}

// ─── CODE EDITOR ────────────────────────────────────────────────────────────────

async function proposeCodeEdit(currentSource, review, video, history) {
  const recentHistory = history.slice(-10).map(h =>
    `iter ${h.iter} (score ${h.score}/10) → ${h.action}: ${h.summary}`
  ).join('\n') || '(no prior edits)';

  const prompt = `You are evolving the source code of a YouTube thumbnail generator. The full file is below. It just produced a thumbnail that scored ${review.rating}/10. Your job: propose ONE high-impact code change that would address the root cause of the problems found.

VIDEO TITLE: ${video.title}
NICHE: ${detectNiche(video.title)}

DEEP REVIEW OF THIS THUMBNAIL:
${JSON.stringify(review, null, 2)}

RECENT EDIT HISTORY (so you don't repeat yourself):
${recentHistory}

CRITICAL RULES FOR YOUR EDIT:
1. Make ONE focused change. Not a refactor. Not multiple unrelated fixes.
2. Address a ROOT CAUSE, not a symptom. Fix the code that PRODUCES the bad output.
3. The "find" string must appear EXACTLY ONCE in the source file. If your find string is not unique or not present, your edit will be rejected.
4. Preserve the file's syntax. The file must remain a valid ES module after your edit.
5. Prefer editing the analyzeScript prompt, the design principles block, or the rendering decision logic — these have the highest leverage.
6. Do NOT just add more text to prompts hoping it helps. Improve the structure, the routing, the decision criteria.
7. If recent edits in the history failed or didn't help, try a DIFFERENT angle, not a variant of the same idea.
8. If the current state looks reasonable and you genuinely cannot identify a high-leverage change, set "no_change": true with a reason.

Return ONLY valid JSON in this exact shape:
{
  "reasoning": "1-3 sentences: what root cause are you targeting and why this edit addresses it",
  "expected_impact": "what you predict will improve and how you'd see it in future thumbnails",
  "no_change": false,
  "edits": [
    {
      "find": "EXACT string from the source file (must appear exactly once)",
      "replace": "new string to substitute",
      "why": "what this specific substitution accomplishes"
    }
  ]
}

If no_change is true, "edits" should be an empty array.

=== CURRENT SOURCE OF src/thumbnail-v2.js ===
${currentSource}
=== END SOURCE ===`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  // Robust JSON extraction: find the first { and matching }
  const start = text.indexOf('{');
  if (start === -1) return { no_change: true, reasoning: 'editor returned no JSON', edits: [] };
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return { no_change: true, reasoning: 'editor returned malformed JSON', edits: [] };
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { no_change: true, reasoning: 'JSON parse failed: ' + e.message, edits: [] };
  }
}

function applyEdits(source, edits) {
  let next = source;
  for (let i = 0; i < edits.length; i++) {
    const { find, replace } = edits[i];
    if (typeof find !== 'string' || typeof replace !== 'string') {
      return { ok: false, reason: `edit ${i}: find/replace must be strings` };
    }
    if (find.length === 0) {
      return { ok: false, reason: `edit ${i}: find is empty` };
    }
    const first = next.indexOf(find);
    if (first === -1) {
      return { ok: false, reason: `edit ${i}: find string not found in source` };
    }
    const second = next.indexOf(find, first + 1);
    if (second !== -1) {
      return { ok: false, reason: `edit ${i}: find string is not unique (appears at ${first} and ${second})` };
    }
    next = next.slice(0, first) + replace + next.slice(first + find.length);
  }
  return { ok: true, source: next };
}

// ─── MAIN LOOP ──────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(70)}`);
console.log(`  SELF-REWRITING THUMBNAIL LOOP`);
console.log(`  Iterations: ${ITERATIONS}, starting at ${START_FROM}`);
console.log(`  Source: ${SRC_PATH}`);
console.log(`  Output: ${BASE_DIR}`);
console.log(`${'═'.repeat(70)}\n`);

const history = [];
const allScores = [];
let lastEdit = null; // { iter, snapshotPath, proposal }

let iter = START_FROM;
const END_AT = START_FROM + ITERATIONS;

while (iter < END_AT) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ITERATION ${iter} / ${END_AT - 1}`);
  console.log(`${'═'.repeat(70)}`);

  // Always snapshot before the iteration runs (so we can revert this iter's edit later)
  const snapPath = snapshot(iter);
  console.log(`  Snapshot: ${path.basename(snapPath)}`);

  const video = pickRandomVideo();
  const niche = detectNiche(video.title);
  const outDir = path.join(BASE_DIR, `iter-${String(iter).padStart(3, '0')}`);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`  Video: "${video.title}" [${niche}]`);

  // GENERATE
  let pngPath, mod;
  try {
    mod = await importFresh();
    pngPath = await withTimeout(
      mod.generateThumbnailV2(outDir, video.title, video.title, video.title, niche, 'engaging'),
      5 * 60 * 1000,
      'generation'
    );
  } catch (genErr) {
    console.log(`  ✗ GENERATION FAILED: ${genErr.message}`);
    logJsonl(RUN_LOG, { iter, video: video.title, error: genErr.message, phase: 'generation', ts: new Date().toISOString() });

    // Was the last edit responsible?
    if (lastEdit) {
      console.log(`  ↩ REVERTING edit from iter ${lastEdit.iter} (snapshot: ${path.basename(lastEdit.snapshotPath)})`);
      restoreFrom(lastEdit.snapshotPath);
      logJsonl(EDIT_LOG, {
        iter: lastEdit.iter,
        action: 'reverted',
        reason: 'next-iteration generation crash',
        crash: genErr.message,
        snapshot: lastEdit.snapshotPath,
        ts: new Date().toISOString(),
      });
      // Mark the reverted edit in history so the editor doesn't repeat it
      history.push({
        iter: lastEdit.iter,
        score: null,
        action: 'REVERTED',
        summary: `${lastEdit.proposal.reasoning} — caused crash: ${genErr.message.slice(0, 100)}`,
      });
      lastEdit = null;
      // Retry the same iteration with the reverted code
      console.log(`  ↻ Retrying iteration ${iter} with reverted code`);
      continue;
    }
    // Not our fault — just skip and move on
    iter++;
    continue;
  }

  // REVIEW
  let review;
  try {
    review = await deepReview(pngPath, video.title);
  } catch (revErr) {
    console.log(`  ✗ REVIEW FAILED: ${revErr.message}`);
    review = { rating: 0, problems: [], works: [], _error: revErr.message };
  }

  console.log(`  Score: ${review.rating}/10`);
  if (review.first_impression) console.log(`  First impression: "${review.first_impression}"`);
  for (const p of (review.problems || [])) {
    console.log(`    ✗ ${p.symptom}`);
    console.log(`      root cause: ${p.root_cause}`);
  }

  fs.writeFileSync(path.join(outDir, 'deep-review.json'), JSON.stringify(review, null, 2));
  allScores.push(review.rating);
  logJsonl(SCORE_LOG, { iter, score: review.rating, video: video.title, niche, ts: new Date().toISOString() });
  logJsonl(RUN_LOG, { iter, video: video.title, score: review.rating, niche, png: pngPath, ts: new Date().toISOString() });

  // The previous edit (if any) survived this iter without crashing — promote it from "tentative" to "kept"
  if (lastEdit) {
    history.push({
      iter: lastEdit.iter,
      score: review.rating,
      action: 'KEPT',
      summary: lastEdit.proposal.reasoning,
    });
    lastEdit = null;
  }

  // PROPOSE EDIT
  console.log(`\n  --- Proposing code edit ---`);
  const currentSrc = fs.readFileSync(SRC_PATH, 'utf-8');
  let proposal;
  try {
    proposal = await proposeCodeEdit(currentSrc, review, video, history);
  } catch (propErr) {
    console.log(`  ✗ EDIT PROPOSAL FAILED: ${propErr.message}`);
    iter++;
    continue;
  }

  if (proposal.no_change || !proposal.edits || proposal.edits.length === 0) {
    console.log(`  ⊙ No edit this iteration: ${proposal.reasoning || '(no reason given)'}`);
    logJsonl(EDIT_LOG, { iter, action: 'no_change', reasoning: proposal.reasoning, ts: new Date().toISOString() });
    iter++;
    continue;
  }

  console.log(`  Reasoning: ${proposal.reasoning}`);
  console.log(`  Expected impact: ${proposal.expected_impact}`);
  console.log(`  Edits: ${proposal.edits.length}`);

  // APPLY EDITS
  const result = applyEdits(currentSrc, proposal.edits);
  if (!result.ok) {
    console.log(`  ✗ EDIT APPLY REJECTED: ${result.reason}`);
    logJsonl(EDIT_LOG, { iter, action: 'apply_failed', reason: result.reason, proposal, ts: new Date().toISOString() });
    iter++;
    continue;
  }

  fs.writeFileSync(SRC_PATH, result.source);

  // VALIDATE: can we still import it?
  try {
    await importFresh();
  } catch (impErr) {
    console.log(`  ✗ EDIT REJECTED — import failed: ${impErr.message}`);
    restoreFrom(snapPath);
    logJsonl(EDIT_LOG, { iter, action: 'import_failed', error: impErr.message, proposal, ts: new Date().toISOString() });
    iter++;
    continue;
  }

  console.log(`  ✓ EDIT APPLIED (tentative — will be confirmed if next iter doesn't crash)`);
  lastEdit = { iter, snapshotPath: snapPath, proposal };
  logJsonl(EDIT_LOG, { iter, action: 'applied', proposal, snapshot: snapPath, ts: new Date().toISOString() });

  // Running stats
  const recent = allScores.slice(-10);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  console.log(`  Rolling avg (last 10): ${avg.toFixed(2)}/10  |  All-time avg: ${(allScores.reduce((a,b)=>a+b,0)/allScores.length).toFixed(2)}/10`);

  iter++;
}

// ─── FINAL REPORT ───────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(70)}`);
console.log(`  COMPLETE`);
console.log(`${'═'.repeat(70)}`);
console.log(`  Iterations run: ${allScores.length}`);
if (allScores.length > 0) {
  console.log(`  Final avg: ${(allScores.reduce((a,b)=>a+b,0)/allScores.length).toFixed(2)}/10`);
  console.log(`  Best: ${Math.max(...allScores)}/10`);
  console.log(`  Worst: ${Math.min(...allScores)}/10`);
  const first10 = allScores.slice(0, 10);
  const last10 = allScores.slice(-10);
  if (first10.length && last10.length) {
    const f = first10.reduce((a,b)=>a+b,0)/first10.length;
    const l = last10.reduce((a,b)=>a+b,0)/last10.length;
    console.log(`  First 10 avg: ${f.toFixed(2)}  →  Last 10 avg: ${l.toFixed(2)}  (${l > f ? '+' : ''}${(l-f).toFixed(2)})`);
  }
}
console.log(`  Edit history: ${EDIT_LOG}`);
console.log(`  Snapshots: ${SNAPSHOT_DIR}`);
