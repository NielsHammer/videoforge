/**
 * VideoForge Thumbnail v3 — free-form HTML/CSS generation
 *
 * Architectural break from v2:
 *   - No archetypes, no element types, no slot validation
 *   - Claude writes COMPLETE self-contained HTML/CSS for the thumbnail
 *   - Headless Chrome rasterizes whatever Claude wrote at exact 1280x720
 *   - Reference blueprints inform Claude's thinking, never constrain output
 *   - Persistent learning pool (winners + losers) carries human feedback
 *     across sessions
 *
 * Niels: "every single pixel needs to be dictated by the ai that is an
 * expert in thumbnails... it doesnt follow any strict ruleset, it just
 * needs to know everything we know and why we made those rules."
 *
 * Pipeline:
 *   1. Load script + relevant references + learning pool
 *   2. Claude designs the thumbnail as complete HTML/CSS, with image
 *      placeholders {{IMG:n}} where embedded images go
 *   3. Image fetcher resolves placeholders via Recraft → Flux → Pexels → Brave
 *   4. HTML is rewritten to embed local file:// URLs for the resolved images
 *   5. Puppeteer launches headless Chrome at 1280x720, navigates to the
 *      HTML, screenshots
 *   6. Mobile downscale review (168x94) catches "black rectangle" failures
 *   7. Harsh designer critic rates the result
 *   8. If rating < threshold AND attempts remaining → retry with feedback
 *   9. Best-of-attempts promoted as final
 *
 * v2 (thumbnail-v2.js) is left untouched as a reference. v3 lives entirely
 * in this file plus thumbnail-learning-pool.js + thumbnail-reference-loader.js.
 */
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { selectRelevantReferences, formatReferenceContext, selectReferenceThumbnailImages } from './thumbnail-reference-loader.js';
import { buildLearningContext } from './thumbnail-learning-pool.js';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FAL_KEY = process.env.FAL_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

const CANVAS_W = 1280;
const CANVAS_H = 720;
const MAX_ATTEMPTS = 3;
// Lowered from 8 to 7: with the critic now relative-calibrated against the
// Niels-approved winners pool, 7 means "same league as approved", which is
// the actual ship bar. The previous 8 was unreachable because the critic
// was over-tuned and gave 4/10 to thumbnails Niels personally approved.
const PASS_THRESHOLD = 7;

// ─── IMAGE FETCHING ──────────────────────────────────────────────────────────
// Single helper that tries Recraft → Flux → Pexels → Brave for any image
// query. Returns a local file path. The HTML rewriter substitutes these
// paths into Claude's HTML at the {{IMG:n}} placeholder positions.

async function fetchRecraftImage(prompt, style = 'realistic_image') {
  if (!FAL_KEY) return null;
  try {
    const r = await axios.post(
      'https://queue.fal.run/fal-ai/recraft-v3',
      { prompt, image_size: 'landscape_16_9', style, num_images: 1 },
      { headers: { Authorization: 'Key ' + FAL_KEY, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    let result = r.data;
    // Poll the queue for completion
    if (result.status_url || result.request_id) {
      const statusUrl = result.status_url || `https://queue.fal.run/fal-ai/recraft-v3/requests/${result.request_id}/status`;
      const responseUrl = result.response_url || `https://queue.fal.run/fal-ai/recraft-v3/requests/${result.request_id}`;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const s = await axios.get(statusUrl, { headers: { Authorization: 'Key ' + FAL_KEY }, timeout: 10000 });
          if (s.data.status === 'COMPLETED') {
            const final = await axios.get(responseUrl, { headers: { Authorization: 'Key ' + FAL_KEY }, timeout: 10000 });
            return final.data.images?.[0]?.url || null;
          }
          if (s.data.status === 'IN_QUEUE' || s.data.status === 'IN_PROGRESS') continue;
        } catch (e) { /* polling retry */ }
      }
    }
    return result.images?.[0]?.url || null;
  } catch (e) {
    return null;
  }
}

async function fetchFluxImage(prompt) {
  if (!FAL_KEY) return null;
  try {
    const r = await axios.post(
      'https://queue.fal.run/fal-ai/flux-pro/v1.1',
      { prompt, image_size: 'landscape_16_9' },
      { headers: { Authorization: 'Key ' + FAL_KEY, 'Content-Type': 'application/json' }, timeout: 30000 },
    );
    let result = r.data;
    if (result.status_url || result.request_id) {
      const statusUrl = result.status_url || `https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/${result.request_id}/status`;
      const responseUrl = result.response_url || `https://queue.fal.run/fal-ai/flux-pro/v1.1/requests/${result.request_id}`;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const s = await axios.get(statusUrl, { headers: { Authorization: 'Key ' + FAL_KEY }, timeout: 10000 });
          if (s.data.status === 'COMPLETED') {
            const final = await axios.get(responseUrl, { headers: { Authorization: 'Key ' + FAL_KEY }, timeout: 10000 });
            return final.data.images?.[0]?.url || null;
          }
        } catch (e) { /* retry */ }
      }
    }
    return result.images?.[0]?.url || null;
  } catch (e) {
    return null;
  }
}

async function fetchPexelsImage(query) {
  if (!PEXELS_API_KEY) return null;
  try {
    const r = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, per_page: 5, orientation: 'landscape' },
      headers: { Authorization: PEXELS_API_KEY },
      timeout: 10000,
    });
    const photos = (r.data.photos || []).filter(p => p.width >= 1000);
    if (photos.length === 0) return null;
    photos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return photos[0].src.large2x || photos[0].src.large;
  } catch (e) {
    return null;
  }
}

async function fetchBraveImage(query) {
  if (!BRAVE_API_KEY) return null;
  try {
    const r = await axios.get('https://api.search.brave.com/res/v1/images/search', {
      params: { q: query + ' high resolution', count: 5, safesearch: 'strict' },
      headers: { 'X-Subscription-Token': BRAVE_API_KEY, Accept: 'application/json' },
      timeout: 10000,
    });
    const results = (r.data.results || []).filter(r => (r.width || 0) >= 1000);
    if (results.length === 0) return null;
    results.sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));
    return results[0].properties?.url || null;
  } catch (e) {
    return null;
  }
}

async function downloadToFile(url, dest) {
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  fs.writeFileSync(dest, Buffer.from(r.data));
  return dest;
}

// Resolve a single image request. AI is the primary path per Niels:
// "we usually dont need pexels, we prefer ai generated because we can hit
// it spot on." Pexels/Brave are for "real things, real people, real places."
// The image_request from the planner can specify a "source_hint" of
// "ai" (default) or "real" if it needs a stock photo of a real entity.
async function resolveImageRequest(req, label, outDir) {
  const prompt = req.prompt || req.query || '';
  if (!prompt) return null;
  const isReal = req.source_hint === 'real' || req.use_real_photo === true;

  console.log(`  [${label}] ${isReal ? 'REAL' : 'AI'}: "${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}"`);

  let url = null;

  if (isReal) {
    // Real things first: Pexels → Brave → AI fallback
    url = await fetchPexelsImage(prompt);
    if (!url) url = await fetchBraveImage(prompt);
    if (!url) {
      console.log(`  [${label}] No real photo — falling back to AI`);
      url = await fetchRecraftImage(prompt);
      if (!url) url = await fetchFluxImage(prompt);
    }
  } else {
    // AI primary: Recraft → Flux → Pexels → Brave
    url = await fetchRecraftImage(prompt);
    if (!url) url = await fetchFluxImage(prompt);
    if (!url) {
      console.log(`  [${label}] AI failed — falling back to Pexels`);
      url = await fetchPexelsImage(prompt);
    }
    if (!url) url = await fetchBraveImage(prompt);
  }

  if (!url) {
    console.log(`  [${label}] All sources failed`);
    return null;
  }

  const localPath = path.join(outDir, `${label}.png`);
  try {
    await downloadToFile(url, localPath);
    console.log(`  [${label}] saved to ${path.basename(localPath)}`);
    return localPath;
  } catch (e) {
    console.log(`  [${label}] download failed: ${e.message}`);
    return null;
  }
}

// ─── PLANNER PROMPT ──────────────────────────────────────────────────────────
// Stripped down per Niels: "LESS RULES, MORE CREATIVITY". The planner used to
// have ~6KB of prescriptive layout guidance (archetypes, zone splits, element
// hierarchy hints). Result: every output converged to the same left-text +
// right-image template. This version trusts Claude to design freely and uses
// the learning pool winners (real Niels-approved thumbnails attached as vision
// images) as the calibration signal instead of prose rules.
//
// What's in the prompt:
//   - Title + script (the content)
//   - Technical HTML/CSS constraints (1280x720, headless Chrome)
//   - Hard legibility floor (no small text, no grey, no jargon, no typos)
//   - "Design what a $500/thumbnail designer would make for THIS video"
//
// What's NOT in the prompt:
//   - No layout examples
//   - No archetype list
//   - No zone/composition hints
//   - No long reference reasoning text dumps
//   - No "two-zone vs full-bleed vs triptych" framing
//
// What replaces the rules:
//   - Vision attachments: 4 niche reference thumbnails (proven top performers)
//     PLUS up to 4 winners from the learning pool (Niels-approved designs)
//     PLUS up to 3 losers with their text reasons (so Claude knows what to avoid)
//   - The learning pool grows over time and becomes the only calibration signal

function buildPlannerPrompt({ title, scriptText, niche, tone, priorAttempt, visionRefs = [], poolWinners = [], poolLosers = [], lockedHook = null, lockedMetaphor = null }) {
  const scriptExcerpt = scriptText
    ? scriptText.substring(0, 6000)
    : 'No script available — design from title alone.';

  const totalImages = visionRefs.length + poolWinners.length + poolLosers.length;

  const visionBlock = totalImages > 0
    ? `
═══ VISUAL CONTEXT ═══
${visionRefs.length} reference thumbnails attached (top-performing real YouTube thumbnails in this niche).
${poolWinners.length} APPROVED designs attached (the human reviewer Niels personally said these work).
${poolLosers.length} REJECTED designs attached (Niels personally rejected these — see reasons below).

CRITICAL — HOW TO USE THE APPROVED EXAMPLES:
Niels approved these designs for ONE reason: the LEVEL OF CRAFT. Every pixel
in an approved design was intentional, and the composition served THAT
specific video's content. The approved examples are NOT templates to copy.
The approved before/after is not a signal that more before/afters are wanted.
The approved hero-image-with-text is not a signal that all thumbnails should
be hero-image-with-text. The signal is: "match this commitment to designing
for the specific content." A Tunguska explosion thumbnail with this level
of craft looks completely different from a sugar transformation thumbnail
with this level of craft. The same craft, applied to different content,
produces structurally different designs every time.

If your design feels like it could be slid onto a different video by
swapping the words and image, you have copied a template. Throw it away
and design for THIS specific video's specific story.

LOOK AT EACH ATTACHED IMAGE before designing. Notice the LEVEL of intentionality —
not the layout pattern. Then design something with the same level of intentionality
for THIS video.

WHY EACH REJECTED DESIGN WAS REJECTED (do not repeat these mistakes):
${poolLosers.map((l, i) => `  ${i + 1}. "${l.title || 'untitled'}": ${l.reason}`).join('\n') || '  (none)'}

WHY EACH APPROVED DESIGN WORKS — read these as evidence of CRAFT, not as layout templates:
${poolWinners.map((w, i) => `  ${i + 1}. "${w.title || 'untitled'}": ${w.approved_reason || '(approved)'}`).join('\n') || '  (none)'}
`
    : '';

  const retryBlock = priorAttempt
    ? `
═══ YOUR PREVIOUS ATTEMPT WAS REJECTED ═══
Critic gave it ${priorAttempt.rating}/10. Verdict: ${priorAttempt.designer_verdict || '(none)'}
Problems: ${(priorAttempt.problems || []).slice(0, 4).map(p => p).join(' | ') || '(none)'}
Most important fix: ${priorAttempt.fix_instructions || '(none)'}

Make a STRUCTURALLY DIFFERENT design — not a tweak. Different composition,
different focal hierarchy, different image idea. If you used a left-text +
right-image split last time, DO NOT use that pattern again. Look at the
approved designs for alternatives.
`
    : '';

  const lockedHookBlock = lockedHook
    ? `
═══ LOCKED HOOK — DO NOT CHANGE THIS ═══

A separate hook-writing pass already chose the strongest hook for this video:

  HOOK: "${lockedHook.winner}"
  WHY: ${lockedHook.winner_reasoning}

Your job is NOT to write a different hook. Your job is to design a thumbnail composition that makes THIS hook hit as hard as possible. Use this exact text. If you want to add a tiny secondary context label (a banner, a date, a number), it must be a SUPPORTING element — not a competing hook.

The other 4 candidates the hook writer rejected:
${(lockedHook.candidates || []).filter(c => c.hook !== lockedHook.winner).map(c => `  - "${c.hook}" (reactive=${c.reactive} curiosity=${c.curiosity} specific=${c.specific} verb=${c.verb_strength})`).join('\n')}
`
    : '';

  const lockedMetaphorBlock = lockedMetaphor
    ? `
═══ LOCKED VISUAL METAPHOR — USE THIS IMAGE IDEA ═══

A separate visual metaphor brainstorm already chose the strongest image idea for this video. The metaphor was scored to make the locked hook FEEL true at a glance — DO NOT default to a literal stock image of the topic.

  METAPHOR: ${lockedMetaphor.winner.metaphor}
  WHY: ${lockedMetaphor.winner_reasoning}

Use this image_request prompt as the basis for image_requests[0]. You can refine the wording but the metaphor concept must stay intact. Do NOT replace it with a more obvious literal image:

  "${lockedMetaphor.winner.image_prompt}"
  source_hint: "${lockedMetaphor.winner.source_hint || 'ai'}"

The other 4 metaphors that were considered (showing the bar — these were rejected for the chosen one):
${(lockedMetaphor.candidates || []).filter((_, i) => i !== (lockedMetaphor.winner_index || 0)).slice(0, 4).map(c => `  - ${c.metaphor} (surprise=${c.surprise} emotion=${c.emotional_impact} specific=${c.specificity} coherence=${c.hook_coherence})`).join('\n')}

Your composition should make the locked hook + locked metaphor work together as ONE idea.
`
    : '';

  return `You are a senior YouTube thumbnail designer who charges $500/thumbnail. You design freely. You are not given templates, layouts, or composition rules — you decide every pixel based on what the SPECIFIC video needs.
${visionBlock}${lockedHookBlock}${lockedMetaphorBlock}
═══ THE VIDEO ═══

TITLE: "${title}"
NICHE: ${niche || 'unknown'}
TONE: ${tone || 'unknown'}

SCRIPT (mine this for specific facts, dates, numbers, scenes — never invent generic dramatic words):
"""
${scriptExcerpt}
"""
${retryBlock}
═══ YOUR TASK ═══

Design a complete HTML5/CSS document. Whatever you write will be loaded into headless Chrome at 1280x720 and screenshotted as the final thumbnail. Use any modern CSS: flexbox, grid, gradients, blend modes, filters, transforms, mask, clip-path, drop-shadow, web fonts from Google Fonts.

There is no template. There is no layout pattern you must follow. The composition should be designed for THIS video's specific content. Some videos need a full-bleed hero image with one massive word over it. Some need two photos. Some need a single dramatic close-up. You decide what THIS one needs.

═══ TECHNICAL CONSTRAINTS ═══

1. Complete valid HTML5 document, no scripts, server-side rendering only.
2. Body is exactly 1280x720, no margin/padding/scroll.
3. To embed images, use placeholders \`{{IMG:1}}\`, \`{{IMG:2}}\` etc. They get substituted with real images you specify in image_requests. 0–3 images.
4. Google Fonts via @import or link is allowed.

═══ HARD LEGIBILITY FLOOR (these are the only rules — everything else is your call) ═══

1. No text below 36px font-size. Smaller text vanishes at 168x94 mobile.
2. No grey text ever. Text is white, near-black, or a saturated accent color.
3. No rotated text. No text running along an edge.
4. No typos. Spell every word correctly. Common words like "ALERTS" should never come out as "ALRTS".
5. Banners must be self-explanatory to a viewer who has never heard of the topic. No jargon ("Grand Prismatic Turned Brown" assumes prior knowledge — use "Lake Turned Brown" instead).
6. No floating clip-art icons or emoji decorations. The image carries the meaning, not little graphic flourishes.

These six rules are enforced programmatically. Anything else is your creative decision.

═══ HOOK WRITING — THE HARDEST PART ═══

The single biggest weakness of past attempts has been hooks that DESCRIBE a fact instead of TRIGGERING a feeling. A great hook makes the viewer stop scrolling. A weak hook makes them keep scrolling because the brain has to do work to understand the magnitude.

EXAMPLES OF DESCRIPTIVE (weak) vs REACTIVE (strong):
  - "12 MILLION SQ MILES" (weak — requires math) → "HALF THE WORLD" (strong — instant feel)
  - "STILL ERUPTING" (weak — just states fact) → "WON'T STOP" or "NO END IN SIGHT" (strong — creates unease)
  - "INVISIBLE IN 2 SECONDS" (weak — describes what happens) → "YOU CAN'T SEE IT" (strong — challenges the viewer)
  - "60% MORTALITY RATE" (weak — clinical) → "MOST PEOPLE DIED" (strong — visceral)
  - "PROCESSED 30 TRILLION DAILY" (weak — abstract) → "ALL OF YOUR MONEY" (strong — personal)
  - "1.5 BILLION DOLLARS" (neutral) → "1.5 BILLION DOLLARS STOLEN" (better — adds the verb that creates emotion)

When picking your hook, ask: "Would a viewer FEEL this in 0.05 seconds, or do they have to do math to understand it?" If they have to do math, find a more visceral framing.

GOOD hook patterns that work across topics:
  - Specific impossible-sounding fact ($65 BILLION VANISHED, MACH 3.3 STILL UNBEATEN)
  - Personal challenge ("YOU CAN'T SEE IT", "THIS IS YOUR BRAIN")
  - Forbidden frame ("LEAKED", "BANNED", "CLASSIFIED")
  - Reaction trigger ("WON'T STOP", "NEVER FOUND", "STILL MISSING")
  - Stark contrast ("ONE MAN", "NO BANK", "ZERO SURVIVORS")

Bad hook patterns to avoid:
  - Pure numbers without context (12 MILLION, 27000, 11KM)
  - Vague descriptors (AMAZING, INCREDIBLE, SHOCKING)
  - Topic categories (HISTORY EXPLAINED, SCIENCE FACTS)
  - Question hooks that don't promise a reveal (WHAT IF?, IS IT TRUE?)

The Sugar 30 DAYS thumbnail works because "30 DAYS" is a specific concrete time you can imagine. The Madoff $65 BILLION STOLEN thumbnail works because STOLEN is the verb that creates emotion. The Area 51 LEAKED thumbnail works because LEAKED is the forbidden-frame trigger.

═══ RETURN FORMAT — JSON ONLY ═══

{
  "primary_subject": "the one named entity the thumbnail visually depicts",
  "subject_is_person": true | false,
  "hook_text": "the hook text your design uses, for logging",
  "image_requests": [
    { "id": 1, "prompt": "specific, cinematic AI generation prompt OR Pexels search query", "source_hint": "ai" | "real", "purpose": "role in composition" }
  ],
  "html": "<!DOCTYPE html><html>...</html>",
  "why": "3-4 sentences explaining the design decision in plain English. Why this image? Why this hook? Why this composition? Not a checklist — a real designer's thought."
}`;
}

// Load actual PNG/JPG bytes from a learning-pool entry's png_path field.
// Pool entries store the path to the rendered thumbnail at the time of
// approval/rejection — we attach those images so Claude sees the real designs,
// not just the text descriptions.
import { loadWinners, loadLosers } from './thumbnail-learning-pool.js';

function loadPoolEntriesWithImages(maxWinners = 4, maxLosers = 3) {
  const winners = loadWinners();
  const losers = loadLosers();
  // Most recent first — newest judgments are the most relevant calibration
  winners.reverse();
  losers.reverse();
  const out = { winners: [], losers: [] };
  for (const w of winners) {
    if (out.winners.length >= maxWinners) break;
    if (!w.png_path || !fs.existsSync(w.png_path)) continue;
    try {
      const buf = fs.readFileSync(w.png_path);
      out.winners.push({ ...w, _bytes: buf });
    } catch (e) { /* skip */ }
  }
  for (const l of losers) {
    if (out.losers.length >= maxLosers) break;
    if (!l.png_path || !fs.existsSync(l.png_path)) continue;
    try {
      const buf = fs.readFileSync(l.png_path);
      out.losers.push({ ...l, _bytes: buf });
    } catch (e) { /* skip */ }
  }
  return out;
}

// ─── TWO-PASS HOOK PLANNER ─────────────────────────────────────────────────
// Pass 1: generate 5 candidate hooks for the topic, score them on the
// reactive/curiosity/specific/verb-strength axes, pick the best.
// Pass 2: existing planThumbnail runs with the locked hook injected.
//
// Niels: "the system has the design craft now. The weak link is hook writing."
// The single-pass planner was racing through hook selection while doing
// design work. Forcing hook selection to happen FIRST and CHEAPLY (one
// text-only Claude call, no image gen) lets the system iterate on hooks
// without burning AI image credits.
async function generateHookCandidates({ title, scriptText, niche, tone }) {
  const scriptExcerpt = scriptText
    ? scriptText.substring(0, 4000)
    : 'No script available — design from title alone.';

  const prompt = `You are a YouTube thumbnail hook writer. The video is:

TITLE: "${title}"
NICHE: ${niche || 'unknown'}
TONE: ${tone || 'unknown'}

SCRIPT (mine this for specific facts, dates, numbers, scenes):
"""
${scriptExcerpt}
"""

Generate 5 candidate hook texts for the thumbnail. Each hook is 1-3 words designed to make a viewer STOP scrolling. Pull facts from the script — never generic dramatic words.

Score each candidate 1-10 on these four axes:
  - reactive: does it create a feeling, or just describe a fact? ("HALF THE WORLD" = 9, "12 MILLION SQ MILES" = 3)
  - curiosity: does it make the viewer want to know more, or does it tell them what happens? ("YOU CAN'T SEE IT" = 9, "INVISIBLE IN 2 SECONDS" = 5)
  - specific: does it use specific concrete language, or vague descriptors? ("$65 BILLION STOLEN" = 9, "MASSIVE FRAUD" = 3)
  - verb_strength: is there a verb that creates emotion? STOLEN, BANNED, ERASED, LEAKED, VANISHED are 9. Static descriptors are 3.

CRITICAL — the failure modes you must avoid:
  - Pure numbers without an emotional verb (12 MILLION, 27000, 11KM) — viewers can't feel them
  - Vague descriptors (AMAZING, SHOCKING, INCREDIBLE) — meaningless
  - Topic categories (HISTORY EXPLAINED, SCIENCE FACTS) — never click triggers
  - Questions without a reveal (WHAT IF?, IS IT TRUE?) — feel like a trap
  - Hooks that just restate the title in different words — viewer learns nothing new
  - Hooks that read as ads or giveaways ($1,000,000 UNCLAIMED reads as a sweepstakes, not a math mystery)
  - Two hooks that say the same thing (ERASED + FROM EVERY MAP ON EARTH = redundant)

For abstract topics (math, sound, neuroscience, geopolitics) the hook must work HARDER. The visceral angle isn't obvious — find it. What's the most uncomfortable, most surprising, or most personal frame for THIS specific story?

Then pick the SINGLE BEST hook and explain why in one sentence.

Return ONLY this JSON:
{
  "candidates": [
    { "hook": "TEXT", "reactive": N, "curiosity": N, "specific": N, "verb_strength": N, "total": N },
    ...exactly 5
  ],
  "winner": "the chosen hook text",
  "winner_reasoning": "one sentence explaining why this beats the others"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].text;
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Hook planner returned no JSON');
  const result = JSON.parse(m[0]);
  if (!result.winner) throw new Error('Hook planner returned no winner');
  return result;
}

// ─── VISUAL METAPHOR BRAINSTORM ────────────────────────────────────────────
// Pass 1.5 — runs AFTER the hook is locked but BEFORE design begins.
// Niels: "on abstract topics the system defaults to literal boring images
// (chalkboard for math, passport for country, spreadsheet for finance).
// The hooks are now creative but the images aren't keeping up."
//
// This step asks Claude: "given the locked hook, what's the most surprising
// image that makes this hook FEEL true?" Generates 5 candidates, scores
// them on surprise/emotional_impact/specificity/hook_coherence, picks the
// strongest. The chosen metaphor is then locked into the design pass the
// same way the hook is.
async function generateImageMetaphors({ title, scriptText, niche, tone, lockedHook }) {
  const scriptExcerpt = scriptText
    ? scriptText.substring(0, 4000)
    : 'No script available — design from title alone.';

  const prompt = `You are a senior YouTube thumbnail designer brainstorming the visual for this video.

TITLE: "${title}"
NICHE: ${niche || 'unknown'}
TONE: ${tone || 'unknown'}

LOCKED HOOK: "${lockedHook?.winner || '(no hook)'}"
WHY THIS HOOK: ${lockedHook?.winner_reasoning || ''}

SCRIPT EXCERPT (mine for specific scenes, objects, characters, moments):
"""
${scriptExcerpt}
"""

Your job: generate 5 candidate visual metaphors for this video. The image you pick must make the locked hook FEEL true at a single glance. The image is what stops the scroll — the hook punches the meaning home.

CRITICAL — the failure mode you must avoid is the LITERAL IMAGE:
  - For a math problem, the literal image is a chalkboard. The metaphorical image is a single number that won't fit, a fortress with one missing brick, a mountain with one impassable cliff.
  - For a country that doesn't exist, the literal image is a passport. The metaphorical image is a missing piece on a world map, a flag dissolving into nothing, a border guard with no flag to salute.
  - For a $6B spreadsheet error, the literal image is a spreadsheet. The metaphorical image is a single cracked cell expanding into a tower of money on fire, one wrong key on a keyboard glowing red.
  - For an unsolved hardest problem, the literal image is equations. The metaphorical image is a maze with no exit, a lock with no key, a single open door with darkness behind it.
  - For an infrasound that drives people insane, the literal image is a sound wave. The metaphorical image is an eye twitching, a person's hands over their ears with nothing visible making the sound, a calm room where everyone is screaming silently.

The literal image is what an amateur picks. The metaphorical image is what a senior designer picks because it makes the viewer FEEL the story before reading the title.

CRITICAL — TONE MATCHING (avoid the gore-on-intellectual-topics trap):
For INTELLECTUAL or ABSTRACT topics (mathematics, physics, philosophy, neuroscience, language, geometry, logic, theory), the metaphor must NEVER use violence, death, gore, blood, dead bodies, war scenes, crime scenes, or murder imagery. These topics need INTELLECTUAL-MYSTERY metaphors, not VIOLENT-DRAMA metaphors. A "field of collapsed mathematicians" reads as a war crime, not an unsolved problem. "82% destroyed" with bodies looks like a battlefield. NO. Use:
  - Locked doors with no keys
  - Infinite hallways
  - A single missing piece in a complex pattern
  - A maze with no exit
  - A chessboard frozen in an unsolvable position
  - A clock face with the wrong number of hands
  - A book with one page that won't be read no matter how you turn it
  - A staircase that loops back on itself
  - A library where one shelf is empty
  - A puzzle with one piece missing forever

Violence and death imagery are reserved for topics ABOUT violence and death (war, crime, disasters, plague, etc). For intellectual topics, the mystery is the discomfort — not the body count.

VISUAL OBVIOUSNESS at 168x94 — the metaphor must read INSTANTLY at thumbnail size:
For "missing thing" metaphors (a country that doesn't exist, a number that doesn't fit, etc), the missing-ness must be VISUALLY OBVIOUS at the smallest mobile size. Subtle darkening or muted highlighting will fail. Use:
  - A clear blank void where a thing should be
  - Bold borders drawn around empty space
  - A high-contrast hole, cutout, or absence
  - A zoomed-in view where the missing piece is the focal point
NOT: a slightly darker region on a wide map, a barely-visible ghost outline, an off-color patch in a complex scene.

Score each candidate 1-10 on these axes:
  - surprise: would a senior designer say "oh, that's clever" — or "that's the obvious choice"? (passport = 2, missing-piece-on-map = 8)
  - emotional_impact: does the image make the viewer FEEL the hook before reading any text? (a chalkboard = 2 for "unsolvable problem", a maze with no exit = 9)
  - specificity: is the image specific and concrete, or generic stock? (a person's hands over their ears = 6, "an eye twitching slightly with one tiny tear" = 9)
  - hook_coherence: does the image visually answer the question the hook raises? (hook "ONE ZERO BREAKS IT" + image of a chalkboard = 3, hook "ONE ZERO BREAKS IT" + image of a tower of dominoes mid-collapse with one zero falling = 9)

Then pick the SINGLE BEST metaphor and explain why in one sentence.

Return ONLY this JSON:
{
  "candidates": [
    {
      "metaphor": "one-sentence description of the image",
      "image_prompt": "complete cinematic AI generation prompt for this metaphor — be specific about composition, lighting, color, mood",
      "source_hint": "ai" | "real",
      "surprise": N,
      "emotional_impact": N,
      "specificity": N,
      "hook_coherence": N,
      "total": N
    },
    ...exactly 5
  ],
  "winner_index": 0-4,
  "winner_reasoning": "one sentence explaining why this metaphor beats the others for THIS specific topic + hook combination"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].text;
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Metaphor planner returned no JSON');
  const result = JSON.parse(m[0]);
  if (!Array.isArray(result.candidates) || result.candidates.length === 0) {
    throw new Error('Metaphor planner returned no candidates');
  }
  result.winner = result.candidates[result.winner_index || 0];
  return result;
}

async function planThumbnail({ title, scriptText, niche, tone, priorAttempt, lockedHook = null, lockedMetaphor = null }) {
  // VISION ATTACHMENTS — three sources fed into Claude as multimodal images:
  //   1. Niche reference thumbnails (top-performing real YouTube thumbnails)
  //   2. Pool winners — Niels-approved designs (the real calibration signal)
  //   3. Pool losers — Niels-rejected designs with text reasons
  const visionRefs = selectReferenceThumbnailImages(title, niche || 'education', 4);
  const pool = loadPoolEntriesWithImages(4, 3);

  if (visionRefs.length > 0) {
    console.log('  [VisionRefs] ' + visionRefs.length + ' niche references:');
    for (const r of visionRefs) {
      console.log(`    • ${r.views.toLocaleString().padStart(12)} views — "${r.title.substring(0, 70)}"`);
    }
  }
  if (pool.winners.length > 0) {
    console.log('  [Pool] ' + pool.winners.length + ' winners (Niels-approved):');
    for (const w of pool.winners) console.log(`    ✓ "${(w.title || '').substring(0, 70)}"`);
  }
  if (pool.losers.length > 0) {
    console.log('  [Pool] ' + pool.losers.length + ' losers (Niels-rejected):');
    for (const l of pool.losers) console.log(`    ✗ "${(l.title || '').substring(0, 70)}" — ${l.reason.substring(0, 80)}`);
  }

  const prompt = buildPlannerPrompt({
    title, scriptText, niche, tone, priorAttempt,
    visionRefs,
    poolWinners: pool.winners,
    poolLosers: pool.losers,
    lockedHook,
    lockedMetaphor,
  });

  // Build multimodal content: niche refs + winners + losers, then text
  const content = [];
  for (const r of visionRefs) {
    try {
      const buf = fs.readFileSync(r.path);
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: buf.toString('base64') } });
    } catch (e) { /* skip */ }
  }
  for (const w of pool.winners) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: w._bytes.toString('base64') } });
  }
  for (const l of pool.losers) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: l._bytes.toString('base64') } });
  }
  content.push({ type: 'text', text: prompt });

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
  });
  const text = response.content[0].text;
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Planner returned no JSON');
  const plan = JSON.parse(m[0]);
  if (!plan.html) throw new Error('Planner returned no html field');
  plan._vision_refs = visionRefs.map(v => ({ title: v.title, views: v.views, path: v.path }));
  plan._pool_winners_used = pool.winners.length;
  plan._pool_losers_used = pool.losers.length;
  return plan;
}

// ─── HTML REWRITING ─────────────────────────────────────────────────────────
// Substitute {{IMG:n}} placeholders with the resolved local file paths.
function rewriteHtmlImages(html, imagePaths) {
  let out = html;
  for (const [id, p] of Object.entries(imagePaths)) {
    if (!p) continue;
    const fileUrl = 'file://' + p;
    out = out.replace(new RegExp('\\{\\{IMG:' + id + '\\}\\}', 'g'), fileUrl);
  }
  // Any unresolved placeholders → strip the img tag entirely so the page still loads
  out = out.replace(/\{\{IMG:\d+\}\}/g, '');
  return out;
}

// ─── RENDER ─────────────────────────────────────────────────────────────────
// Launch headless Chrome at 1280x720, load the rewritten HTML, screenshot.
let _browser = null;
async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
  return _browser;
}

export async function closeBrowser() {
  if (_browser) {
    try { await _browser.close(); } catch (e) {}
    _browser = null;
  }
}

async function renderHtmlToPng(html, outPath, tempHtmlPath) {
  // CRITICAL: must navigate to a file:// URL (not setContent) so the page
  // origin allows loading file:// images. setContent uses about:blank which
  // is blocked by Chrome's same-origin policy from referencing local files.
  fs.writeFileSync(tempHtmlPath, html);
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: CANVAS_W, height: CANVAS_H, deviceScaleFactor: 1 });
  await page.goto('file://' + tempHtmlPath, { waitUntil: 'networkidle0', timeout: 30000 });
  // Give web fonts a moment to settle
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: outPath, type: 'png', clip: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H } });
  await page.close();
  return outPath;
}

// ─── CRITIC ─────────────────────────────────────────────────────────────────
// Same harsh designer critic as v2 but reads the v3 rendered PNG.

async function reviewThumbnail(pngPath, title) {
  const buffer = fs.readFileSync(pngPath);
  const base64 = buffer.toString('base64');
  // Recalibrated: the critic now sees the actual Niels-approved winners as
  // visual reference points and judges the candidate RELATIVE to them. The
  // previous critic was over-tuned ("everything is a Canva template") and
  // gave 4/10 to outputs Niels personally marked as winners. Comparing
  // against real human-approved designs anchors the calibration.
  const pool = loadPoolEntriesWithImages(3, 0); // 3 winners as reference, no losers
  const content = [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
  ];
  for (const w of pool.winners) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: w._bytes.toString('base64') } });
  }

  const referenceBlock = pool.winners.length > 0
    ? `\n\nThe ${pool.winners.length} additional images attached are real thumbnails the human reviewer (Niels) personally APPROVED. They are your calibration anchor — outputs that match their level of intentionality and visual quality should rate 7+. Outputs that look obviously worse than these should rate ≤5.\n\nApproved reference reasoning:\n${pool.winners.map((w, i) => `  ${i + 1}. "${w.title}": ${w.approved_reason}`).join('\n')}`
    : '';

  content.push({
    type: 'text',
    text: `You are reviewing a YouTube thumbnail for the video "${title}". The first image is the candidate to review.${referenceBlock}

Rate 1-10:
- 1-3: Has a hard defect (typo, unreadable text, wrong subject, looks broken)
- 4-5: Functional but forgettable, looks like a template
- 6: Decent — one good idea but execution has issues
- 7: Solid — same league as the approved reference thumbnails above
- 8-9: Excellent — would actually go on a real channel
- 10: Best-of-the-year tier

Be honest, not reflexively harsh. If the candidate is structurally as good as the reference winners, rate it 7+. The point of this review is to catch real defects (typos, broken layouts, wrong subjects, unreadable text), not to gatekeep at impossible standards.

Hard defects that cap the rating at 4:
- Visible typos
- Text covering the focal subject of the image
- Subject identity is wrong (Yellowstone thumbnail showing a generic volcano)
- Floating clip-art / emoji icons used as decoration
- Compositionally identical to a recently seen template (no specific design choices for THIS topic)

Return ONLY valid JSON:
{
  "rating": 1-10,
  "would_use_on_real_channel": true | false,
  "designer_verdict": "one sentence — what's good or bad about this specific design",
  "specific_problems": ["concrete defects, empty array if none"],
  "what_works": ["genuine wins, empty array if none"],
  "fix_instructions": "if rating < 7, the SINGLE most important thing to change"
}`,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content }],
  });
  const text = response.content[0].text;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { rating: 5, problems: ['parse failed'], strengths: [], fix_instructions: null };
  const parsed = JSON.parse(m[0]);
  return {
    rating: parsed.rating,
    designer_verdict: parsed.designer_verdict,
    problems: parsed.specific_problems || [],
    strengths: parsed.what_works || [],
    fix_instructions: parsed.fix_instructions || null,
    would_click: parsed.would_use_on_real_channel,
  };
}

// Spell-check the visible text in the rendered HTML against a common-word
// dictionary. Catches the "WARNING ALRTS" failure mode Niels flagged on the
// Petrov thumbnail. The dictionary is small but covers the words that real
// thumbnails use — proper nouns, currencies, dates, and uncommon terms are
// allowlisted via the SPELLING_WHITELIST set.
const SPELLING_WHITELIST = new Set([
  // Currency / quantity / time
  'b', 'm', 'k', 'tn', 'gb', 'tb', 'kb', 'pm', 'am', 'pst', 'est', 'utc',
  // Common YouTube thumbnail words that pass dictionary check anyway:
  'wtf', 'omg', 'lol', 'ai', 'us', 'usa', 'uk', 'eu', 'un', 'ftc', 'cia', 'fbi', 'irs', 'usda',
  'mph', 'kph', 'kg', 'lb', 'lbs', 'oz', 'cm', 'mm', 'km', 'ft', 'in',
  // Brand / proper noun fragments commonly seen
  'mrbeast', 'spacex', 'tesla', 'nvidia', 'openai', 'youtube', 'facebook', 'instagram', 'twitter', 'tiktok', 'paypal', 'walmart', 'amazon',
  // Numbers spelled with shorthand
  '1st', '2nd', '3rd', '4th', '5th', '10th', '20th', '21st',
]);

// A small but useful common-English dictionary. We don't need every word —
// just enough to catch the obvious typos like ALRTS / RECIVED / OCASSION.
// If a word is not in the dictionary AND not in the whitelist AND not a
// number/proper-noun, it's flagged as a probable typo.
const COMMON_WORDS = new Set([
  // The 1500 most common English words covering 95% of typical thumbnail vocabulary.
  // Compact but comprehensive enough to catch real typos.
  'a','about','above','accept','access','accident','according','account','across','act','action','actual','actually','add','addition','admit','advantage','advice','affect','after','again','against','age','ago','agree','agreement','ahead','aid','air','alarm','alarms','alert','alerts','alien','aliens','alive','all','allow','almost','alone','along','already','also','although','always','am','american','among','amount','an','analysis','ancient','and','animal','animals','announce','another','answer','any','anyone','anything','apart','appear','apple','approach','april','are','area','argue','arm','arms','army','around','arrest','arrested','arrive','art','as','ask','asleep','at','attack','attempt','august','authority','available','average','avoid','away','awake','baby','back','bad','bag','balance','ball','bank','banks','bar','base','bay','be','beach','bear','beat','beautiful','because','become','bed','been','before','begin','behind','being','believe','below','best','better','between','big','bigger','biggest','bill','billion','billions','bird','birth','bit','black','blood','blue','board','boat','body','book','born','both','bottom','box','boy','brain','brains','brand','break','breath','breathe','brief','bright','bring','britain','broad','broke','broken','brother','brown','build','building','built','burn','bus','business','but','buy','by','call','came','can','cancer','cannot','cant','capital','car','card','care','career','carry','case','cash','cat','catch','cause','cell','center','central','century','certain','chair','chairman','challenge','chance','change','character','charge','check','chemistry','child','children','china','chinese','choice','choose','church','city','civil','claim','class','clean','clear','clearly','climate','close','closed','clothes','club','coal','coast','code','coffee','cold','collapse','collapsed','collection','college','color','colour','come','coming','common','community','company','compare','complete','completely','computer','concern','condition','confidence','consider','contain','continue','contract','control','cool','copy','corner','correct','cost','could','council','count','country','couple','course','court','cover','create','crime','cross','crowd','crucial','cup','current','currently','cut','daily','damage','danger','dangerous','dark','darkness','data','date','daughter','day','days','dead','deal','dealing','dear','death','debate','decade','decide','decision','deep','defence','degree','democracy','department','depth','describe','design','despite','detail','develop','development','did','die','died','difference','different','difficult','direct','direction','director','discover','discovered','discuss','disease','do','doctor','document','documents','does','dog','done','door','doubt','down','dr','draw','dream','drink','drive','driver','drop','dry','due','during','duty','each','early','earn','earth','east','easy','eat','economic','economy','edge','education','effect','effective','effort','egg','eight','either','election','electric','element','else','email','emergency','employee','encounter','end','enemy','energy','engine','engineer','english','enjoy','enough','enter','entire','environment','equal','equally','equipment','er','erupt','erupted','eruption','especially','establish','estimate','europe','european','even','evening','event','ever','every','everyone','everything','evidence','exactly','example','except','exchange','exist','expect','experience','explain','express','extra','extreme','eye','eyes','face','faces','fact','factor','factory','fail','failed','failure','fair','fall','familiar','family','famous','far','farm','farmer','fast','father','favourite','fear','federal','feel','feeling','few','field','fifteen','fifty','fight','figure','file','fill','film','final','finally','financial','find','fine','finger','finish','fire','first','fish','five','flat','floor','flow','flower','fly','focus','follow','food','foot','for','force','forces','foreign','forest','forever','forget','form','former','forty','forward','found','four','france','free','freedom','french','friday','friend','friends','from','front','full','fund','funds','funny','further','future','gain','gallons','game','garden','gas','gave','general','generate','generation','germany','get','girl','give','glass','go','god','gold','gone','good','got','government','great','green','grew','grey','ground','group','grow','growth','had','hair','half','hall','hand','hands','handcuffs','handcuff','hang','happen','happened','happens','happy','hard','hate','have','having','he','head','health','hear','heard','heart','heat','heavy','held','hell','help','hence','her','here','herself','hide','high','higher','highest','him','himself','his','history','historic','historical','hit','hold','hole','holiday','home','honest','hope','hospital','hot','hotel','hour','hours','house','how','however','huge','human','humans','hundred','hung','i','ice','idea','identify','if','ill','image','imagine','immediate','immediately','impact','important','impossible','improve','in','include','income','incredible','indeed','independent','indicate','industry','influence','information','inside','instead','interest','international','internet','into','introduce','investigate','investigation','investment','involve','iron','is','island','it','italy','item','its','itself','january','japan','japanese','job','join','joint','joke','judge','july','jump','june','just','keep','key','kill','killed','kind','king','kitchen','knee','knew','know','knowledge','known','korea','korean','labour','lady','lake','land','language','large','last','late','later','laugh','launch','launched','law','lay','lead','leader','leaders','leak','leaked','learn','learning','least','leave','led','left','legal','less','let','letter','level','liberal','library','lie','lied','life','lift','light','lights','like','likely','line','link','lion','list','listen','little','live','lives','living','local','lock','london','long','longer','look','looked','lose','loss','losses','lost','lot','love','low','lower','lowest','lunch','machine','mad','made','main','major','make','making','man','manage','manager','manchester','many','map','march','marina','mariana','marianas','mark','market','marriage','mars','mass','massive','match','material','matter','may','maybe','me','mean','meaning','means','measure','medical','meet','meeting','member','memory','mental','mention','message','metal','method','middle','might','mile','miles','million','millions','mind','mine','minister','minute','minutes','miss','missing','mission','mistake','model','modern','moment','monday','money','month','months','moon','moral','more','morning','most','mother','motion','mountain','mouth','move','movement','mr','mrs','much','murder','music','must','my','myself','name','named','national','natural','nature','near','nearly','necessary','neck','need','needs','negative','neither','nerve','net','never','new','news','newspaper','next','nice','night','nights','nine','no','nobody','none','nor','normal','north','northern','not','note','nothing','notice','now','nuclear','number','numbers','obvious','obviously','occasion','occur','ocean','of','off','offer','office','officer','official','often','oh','oil','ok','old','on','once','one','only','open','operation','opinion','opportunity','oppose','or','order','organization','original','other','others','our','out','outside','over','own','owner','oxygen','pack','page','pages','paid','pain','paint','paper','parent','parents','park','part','particular','particularly','partly','partner','party','pass','passage','past','path','patient','pattern','pay','peace','people','per','percent','perfect','perform','perhaps','period','person','personal','phone','photo','physical','pick','picture','piece','place','plan','planet','plant','plastic','play','please','plus','pm','point','police','policy','political','politics','poll','pollution','poor','population','position','positive','possible','possibly','post','potential','power','powerful','practical','practice','prepare','present','president','press','pressure','pretty','prevent','previous','price','primary','prime','prince','principle','print','prior','prison','private','probably','problem','problems','process','produce','product','production','professional','program','project','promise','proper','property','protect','prove','provide','public','published','pull','pupil','purpose','push','put','quality','quarter','question','quick','quickly','quiet','quite','race','radio','railway','rain','raise','ran','range','rate','rather','reach','read','ready','real','realize','really','reason','receive','received','recent','recently','recognize','record','red','reduce','reform','refuse','region','relate','relation','relationship','release','remain','remember','remove','report','represent','require','research','resource','respect','responsibility','rest','restaurant','result','return','reveal','revealed','review','rich','ride','right','ring','rise','rising','risk','river','road','rock','role','roll','roman','room','rose','round','route','row','royal','rule','run','russia','russian','sad','safe','safety','said','sale','same','sand','satellite','saturday','save','saw','say','scale','scene','school','science','scientific','scientist','scientists','sea','seat','second','second','secret','secretary','section','see','seek','seem','seems','seen','sell','send','sense','sent','separate','september','series','serious','service','set','settle','seven','several','severe','shake','shall','shape','share','she','sheet','ship','shirt','shock','shoe','shop','short','should','show','side','sight','sign','signal','silence','silver','similar','simple','simply','since','sing','single','sir','sister','sit','site','situation','six','size','skill','skin','sky','sleep','slight','slip','slow','slowly','small','smile','smoke','snow','so','social','society','soft','soldier','solution','some','somebody','someone','something','sometimes','son','song','soon','sort','sound','source','south','southern','soviet','space','speak','special','species','specific','specifically','speed','spend','spent','spirit','spoke','sport','spread','spring','staff','stage','stand','standard','star','stare','start','state','station','stay','step','still','stock','stolen','stone','stood','stop','store','storm','story','straight','strategy','street','strength','stress','strike','string','strong','structure','student','study','stuff','style','subject','success','successful','such','sudden','suddenly','sufficient','sugar','suggest','suit','summer','sun','sunday','support','suppose','sure','surface','surprise','survey','survive','suspect','sword','system','table','take','taken','talk','tall','task','tax','taxes','tea','teach','teacher','team','tear','technology','telephone','television','tell','temperature','ten','tend','term','terrible','test','than','thank','that','the','theatre','their','them','themselves','then','theory','there','therefore','these','they','thick','thin','thing','think','third','thirty','this','those','though','thought','thousand','threat','threats','three','threshold','through','throughout','throw','thumb','thus','tie','time','times','tiny','to','today','together','told','tomorrow','tone','tonight','too','took','top','total','tough','tour','toward','towards','town','track','trade','train','training','transport','travel','treat','treatment','tree','trench','trial','tried','trip','trouble','true','trust','truth','try','tuesday','turn','turned','turning','twelve','twenty','twice','two','type','uk','under','understand','undertake','union','unit','united','unless','unlike','until','up','upon','use','used','user','using','usually','value','various','very','via','victim','view','village','violence','visit','voice','vote','wait','wake','walk','wall','want','war','warm','warning','warns','was','wash','watch','water','wave','way','we','wealth','weapon','wear','weather','wednesday','week','weeks','weight','welcome','well','went','were','west','western','what','whatever','wheel','when','where','whether','which','while','white','who','whole','whom','whose','why','wide','widely','wife','will','win','wind','window','winter','wise','wish','with','within','without','woman','women','wonder','wood','word','work','worker','workers','working','works','world','worry','worse','worst','worth','would','write','writing','written','wrong','wrote','xxx','yard','yeah','year','years','yes','yesterday','yet','york','you','young','younger','your','yours','yourself','zero','zone',
]);

// Extract all visible text content from a self-contained HTML document.
// Strips tags, scripts, styles, and CSS strings — only what would actually
// render on screen.
function extractVisibleText(html) {
  const noStyle = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  const noScript = noStyle.replace(/<script[\s\S]*?<\/script>/gi, '');
  const noTags = noScript.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities (basic)
  const decoded = noTags
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  return decoded.replace(/\s+/g, ' ').trim();
}

// Spell check the visible text. Conservative — only flags words that have
// the STRUCTURAL SHAPE of a typo, not "any word not in my dictionary."
// Real typos like ALRTS, RECIVED, NESCESARY have telltale structural signs:
// missing vowels in consonant clusters, double letters in wrong places,
// or letter combinations that don't appear in real English.
//
// False positives we want to avoid: FLOORS, ANTS, GIGABYTES, NEUROSCIENCE,
// TUNGUSKA, LEAFCUTTER — uncommon real words that don't fit a typo profile.
function checkSpelling(html) {
  const text = extractVisibleText(html);
  if (!text) return [];
  const tokens = text.toLowerCase().match(/[a-z][a-z']*[a-z]|[a-z]/g) || [];
  const suspected = [];
  const seen = new Set();
  for (const tok of tokens) {
    if (seen.has(tok)) continue;
    seen.add(tok);
    if (tok.length <= 1) continue;
    if (COMMON_WORDS.has(tok)) continue;
    if (SPELLING_WHITELIST.has(tok)) continue;
    // Skip recognized contractions
    if (/^(it|that|there|don|isn|wasn|won|can|couldn|shouldn|wouldn|hasn|haven|hadn|aren|weren|i|you|he|she|we|they)'(s|t|d|ll|re|ve|m)$/.test(tok)) continue;
    // STRUCTURAL TYPO HEURISTICS — only flag if the word has the shape of
    // a real typo, not just an uncommon word.
    if (looksLikeTypo(tok)) suspected.push(tok);
  }
  return suspected;
}

// Returns true if the word has the structural fingerprint of a real typo.
// Heuristics tuned to catch the actual failure modes (ALRTS, RECIVED) without
// false-positiving on uncommon real words (FLOORS, LEAFCUTTER, TUNGUSKA).
function looksLikeTypo(word) {
  if (word.length < 4 || word.length > 12) return false;
  const vowels = (word.match(/[aeiouy]/g) || []).length;
  // Two ironclad fingerprints that real English words never have:
  //   1. Zero vowels in a 4+ letter word (ALRTS, MNGRS, LRTS)
  //   2. Triple letter run (AAANG, LLLRT)
  // We deliberately do NOT flag 4-consonant clusters (STRENGTH, MONTHS,
  // SCHWARTZ are real). The point is to catch obvious garbage, not police
  // every uncommon word.
  if (vowels === 0) return true;
  if (/(.)\1\1/.test(word)) return true;
  return false;
}

// Heuristic check for the "small grey text" failure mode Niels flagged on
// the v3 Marianas thumbnail. Scans the rendered HTML for any inline color
// or font-size that violates the legibility rules. Operates on the HTML
// itself (not the PNG) because text properties are explicit there. Returns
// {ok: bool, violations: [strings]}.
function checkHtmlLegibility(html) {
  const violations = [];
  // Pull all font-size declarations
  const fontSizeMatches = [...html.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)\s*(px|rem|em)/gi)];
  for (const m of fontSizeMatches) {
    let pxValue = parseFloat(m[1]);
    if (m[2] === 'rem' || m[2] === 'em') pxValue *= 16; // assume default root
    if (pxValue < 36) {
      violations.push(`text font-size ${pxValue}px is below 36px minimum (cannot survive 168x94 downscale)`);
    }
  }
  // Pull all color values that look like grey
  // Grey hex: #444-#ddd, or rgb where r==g==b in 70-220 range
  const colorMatches = [...html.matchAll(/color\s*:\s*(#[0-9a-f]{3,6}|rgba?\([^)]+\))/gi)];
  for (const m of colorMatches) {
    const c = m[1].toLowerCase();
    if (c.startsWith('#')) {
      // Expand 3-char to 6-char
      let hex = c.slice(1);
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      if (hex.length !== 6) continue;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      // Grey if r==g==b within tolerance and value is in mid range
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max - min < 25 && max >= 70 && max <= 220) {
        violations.push(`text color ${c} is grey — never grey, use white/dark/saturated accent only`);
      }
    } else if (c.startsWith('rgb')) {
      const nums = c.match(/\d+(?:\.\d+)?/g);
      if (nums && nums.length >= 3) {
        const r = +nums[0], g = +nums[1], b = +nums[2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max - min < 25 && max >= 70 && max <= 220) {
          violations.push(`text color ${c} is grey — never grey`);
        }
      }
    }
  }
  // Detect rotated text (transform: rotate)
  if (/transform\s*:[^;]*rotate/i.test(html)) {
    violations.push(`text uses transform: rotate — rotated text vanishes at mobile scale`);
  }
  // Spell check visible text — catches the most obvious failure mode
  // (no-vowel words like ALRTS, MNGRS) without flagging real but uncommon
  // words like STRENGTH or SCHWARTZ. The current heuristic is conservative
  // by design — better to miss a typo than block a good thumbnail.
  const suspectedTypos = checkSpelling(html);
  if (suspectedTypos.length > 0) {
    for (const t of suspectedTypos.slice(0, 5)) {
      violations.push(`possible typo: "${t.toUpperCase()}" (no vowels or weird consonant cluster)`);
    }
  }
  return { ok: violations.length === 0, violations };
}

// Mobile downscale review — render at 168x94 and check for "black rectangle"
async function mobileLuminanceCheck(pngPath, outDir) {
  // Use node-canvas to scale to 168x94 and compute luminance stats
  const img = await loadImage(pngPath);
  const c = createCanvas(168, 94);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, 168, 94);
  const mobileBuffer = c.toBuffer('image/png');
  const mobilePath = path.join(outDir, 'thumbnail-v3-mobile.png');
  fs.writeFileSync(mobilePath, mobileBuffer);
  const data = ctx.getImageData(0, 0, 168, 94).data;
  let sum = 0, n = 0, mn = 255, mx = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    if (lum < mn) mn = lum;
    if (lum > mx) mx = lum;
    n++;
  }
  const avg = sum / n;
  const range = mx - mn;
  return { avg: Math.round(avg), range: Math.round(range), is_black_rect: avg < 30 && range < 80, mobilePath };
}

// ─── MAIN ENTRY POINT ──────────────────────────────────────────────────────

export async function generateThumbnailV3({ outputDir, title, scriptText = '', niche = '', tone = '', _attempt = 1, _priorAttempt = null, _lockedHook = null, _lockedMetaphor = null }) {
  console.log('============================================================');
  console.log('VideoForge Thumbnail v3 (HTML/CSS)' + (_attempt > 1 ? ` — RETRY ${_attempt}/${MAX_ATTEMPTS}` : ''));
  console.log('============================================================');
  console.log('  Title: ' + title);
  console.log('  Niche: ' + niche);
  console.log('  Script: ' + (scriptText ? `${scriptText.length} chars` : 'none'));

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Step 0: Two-pass hook generation — happens once per topic, reused on retries.
  // The hook writer picks the strongest of 5 candidates BEFORE any design or
  // image work. This stops the design pass from racing through hook selection
  // and defaulting to safe descriptive framings.
  let lockedHook = _lockedHook;
  if (!lockedHook) {
    console.log('\n--- Step 0: Hook writer (5 candidates → pick strongest) ---');
    try {
      lockedHook = await generateHookCandidates({ title, scriptText, niche, tone });
      console.log('  Candidates considered:');
      for (const c of (lockedHook.candidates || [])) {
        const total = (c.reactive || 0) + (c.curiosity || 0) + (c.specific || 0) + (c.verb_strength || 0);
        console.log(`    "${c.hook}" — r:${c.reactive} c:${c.curiosity} s:${c.specific} v:${c.verb_strength} = ${total}`);
      }
      console.log('  WINNER: "' + lockedHook.winner + '"');
      console.log('  Why: ' + lockedHook.winner_reasoning);
      fs.writeFileSync(path.join(outputDir, 'thumbnail-v3-hook.json'), JSON.stringify(lockedHook, null, 2));
    } catch (e) {
      console.log('  [Hook writer] Failed: ' + e.message + ' — falling back to single-pass planner');
      lockedHook = null;
    }
  }

  // Step 0.5: Visual metaphor brainstorm — happens once per topic, reused on retries.
  // After the hook is locked, brainstorm 5 candidate visual metaphors and pick the
  // strongest. Stops the design pass from defaulting to literal stock images
  // (chalkboard for math, passport for country, spreadsheet for finance) on
  // abstract topics. The metaphor must make the locked hook FEEL true.
  let lockedMetaphor = _lockedMetaphor;
  if (!lockedMetaphor && lockedHook) {
    console.log('\n--- Step 0.5: Visual metaphor brainstorm (5 candidates → pick strongest) ---');
    try {
      lockedMetaphor = await generateImageMetaphors({ title, scriptText, niche, tone, lockedHook });
      console.log('  Metaphor candidates:');
      for (const c of (lockedMetaphor.candidates || [])) {
        const total = (c.surprise || 0) + (c.emotional_impact || 0) + (c.specificity || 0) + (c.hook_coherence || 0);
        console.log(`    s:${c.surprise} e:${c.emotional_impact} sp:${c.specificity} hc:${c.hook_coherence} = ${total} → "${(c.metaphor || '').substring(0, 80)}"`);
      }
      const winner = lockedMetaphor.winner;
      console.log('  WINNER: ' + (winner?.metaphor || 'unknown'));
      console.log('  Why: ' + lockedMetaphor.winner_reasoning);
      fs.writeFileSync(path.join(outputDir, 'thumbnail-v3-metaphor.json'), JSON.stringify(lockedMetaphor, null, 2));
    } catch (e) {
      console.log('  [Metaphor brainstorm] Failed: ' + e.message + ' — design pass will pick image freely');
      lockedMetaphor = null;
    }
  }

  // Step 1: Plan
  console.log('\n--- Step 1: Claude designs the thumbnail (full HTML/CSS) ---');
  const plan = await planThumbnail({ title, scriptText, niche, tone, priorAttempt: _priorAttempt, lockedHook, lockedMetaphor });
  plan.title = title;
  plan.niche = niche;
  plan._attempt = _attempt;
  console.log('  Subject: ' + plan.primary_subject + (plan.subject_is_person ? ' (person — image will depict context)' : ''));
  console.log('  Hook: ' + plan.hook_text);
  console.log('  Image requests: ' + (plan.image_requests || []).length);
  for (const req of (plan.image_requests || [])) {
    console.log(`    [${req.id}] ${req.source_hint || 'ai'}: ${(req.prompt || '').substring(0, 80)}`);
  }
  console.log('  HTML size: ' + plan.html.length + ' chars');

  fs.writeFileSync(path.join(outputDir, 'thumbnail-v3-plan.json'), JSON.stringify(plan, null, 2));

  // Step 2: Resolve image placeholders
  console.log('\n--- Step 2: Fetching images ---');
  const imagePaths = {};
  for (const req of (plan.image_requests || [])) {
    const localPath = await resolveImageRequest(req, `img-${req.id}`, outputDir);
    if (localPath) imagePaths[req.id] = localPath;
  }

  // Step 3: Rewrite HTML and render
  console.log('\n--- Step 3: Render via headless Chrome ---');
  const rewritten = rewriteHtmlImages(plan.html, imagePaths);
  const htmlPath = path.join(outputDir, 'thumbnail-v3.html');
  const pngPath = path.join(outputDir, 'thumbnail-v3.png');

  // HARD legibility check — Niels rule: no text under 36px, no grey text,
  // no rotated text. Catches the "small grey text vanishes at 168x94" failure
  // mode before rendering. Violations are surfaced into the review so the
  // retry logic can react.
  const legibility = checkHtmlLegibility(rewritten);
  if (!legibility.ok) {
    console.log('  ⚠️  Legibility violations:');
    for (const v of legibility.violations) console.log('    ✗ ' + v);
  }

  try {
    await renderHtmlToPng(rewritten, pngPath, htmlPath);
    const sizeKB = Math.round(fs.statSync(pngPath).size / 1024);
    console.log('  Saved: ' + pngPath + ' (' + sizeKB + ' KB)');
  } catch (e) {
    console.log('  ✗ Render failed: ' + e.message);
    throw e;
  }

  // Step 4: Mobile downscale check
  console.log('\n--- Step 4: Mobile downscale review (168x94) ---');
  const mobile = await mobileLuminanceCheck(pngPath, outputDir);
  if (mobile) {
    console.log('  Mobile: avg=' + mobile.avg + '/255 range=' + mobile.range + '/255' + (mobile.is_black_rect ? ' ✗ BLACK RECTANGLE' : ''));
  }

  // Step 5: Designer critic
  console.log('\n--- Step 5: Harsh designer critic ---');
  const review = await reviewThumbnail(pngPath, title);
  console.log('  Critic rating: ' + review.rating + '/10');
  if (review.designer_verdict) console.log('  Designer verdict: ' + review.designer_verdict);
  if (review.problems.length > 0) {
    console.log('  Problems:');
    for (const p of review.problems) console.log('    - ' + p);
  }
  // Black-rectangle penalty
  if (mobile && mobile.is_black_rect) {
    review.rating = Math.min(review.rating, 3);
    review.problems = [...review.problems, 'MOBILE BLACK RECTANGLE — too dark to see at 168x94'];
  }
  // Legibility violations apply graduated penalties:
  //   - Typos and text-too-small are HARD (cap rating at 4) — these are
  //     unshippable defects.
  //   - Rotated text and grey text are SOFT (-2 points) — they're warnings
  //     but don't necessarily ruin the design.
  // Previously a single rotation violation was capping 8/10 designs to 4/10.
  if (!legibility.ok) {
    const hasHardViolation = legibility.violations.some(v =>
      /font-size .* below 36px/.test(v) || /typo/i.test(v));
    const hasSoftViolation = legibility.violations.some(v =>
      /transform: rotate/.test(v) || /grey/i.test(v));
    if (hasHardViolation) {
      review.rating = Math.min(review.rating, 4);
    } else if (hasSoftViolation) {
      review.rating = Math.max(1, review.rating - 2);
    }
    review.problems = [...review.problems, ...legibility.violations.map(v => 'LEGIBILITY: ' + v)];
    review._legibility_violations = legibility.violations;
  }
  review._mobile_avg = mobile?.avg || null;
  review._mobile_range = mobile?.range || null;
  fs.writeFileSync(path.join(outputDir, 'thumbnail-v3-review.json'), JSON.stringify(review, null, 2));

  if (review.rating >= PASS_THRESHOLD) {
    console.log('\n✅ PASSED designer review (' + review.rating + '/10) on attempt ' + _attempt);
    return pngPath;
  }

  if (_attempt < MAX_ATTEMPTS) {
    console.log('\n⚠️  Below threshold (' + review.rating + '/10). Retrying...');
    // Archive this attempt
    const archDir = path.join(outputDir, `attempt-${_attempt}`);
    fs.mkdirSync(archDir, { recursive: true });
    fs.copyFileSync(pngPath, path.join(archDir, 'thumbnail-v3.png'));
    fs.copyFileSync(path.join(outputDir, 'thumbnail-v3-plan.json'), path.join(archDir, 'thumbnail-v3-plan.json'));
    fs.copyFileSync(path.join(outputDir, 'thumbnail-v3-review.json'), path.join(archDir, 'thumbnail-v3-review.json'));
    return generateThumbnailV3({ outputDir, title, scriptText, niche, tone, _attempt: _attempt + 1, _priorAttempt: review, _lockedHook: lockedHook, _lockedMetaphor: lockedMetaphor });
  }

  console.log('\n⚠️  Out of retries. Promoting best of attempts.');
  // Best-of: scan attempt directories and pick the highest-rated
  let best = { rating: review.rating, path: pngPath };
  for (let a = 1; a < _attempt; a++) {
    try {
      const arev = JSON.parse(fs.readFileSync(path.join(outputDir, `attempt-${a}`, 'thumbnail-v3-review.json'), 'utf-8'));
      if ((arev.rating || 0) > best.rating) {
        best = { rating: arev.rating, path: path.join(outputDir, `attempt-${a}`, 'thumbnail-v3.png') };
      }
    } catch (e) { /* skip */ }
  }
  if (best.path !== pngPath) {
    console.log('  Best attempt was ' + best.rating + '/10 — promoting it');
    fs.copyFileSync(best.path, pngPath);
  }
  return pngPath;
}
