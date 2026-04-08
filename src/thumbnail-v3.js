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
const PASS_THRESHOLD = 8;

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
// The planner asks Claude to design the thumbnail as complete HTML/CSS.
// References + learning pool are surfaced as context, never as constraints.

function buildPlannerPrompt({ title, scriptText, niche, tone, references, learningContext, priorAttempt, visionRefs = [] }) {
  const refBlock = references ? formatReferenceContext(references) : '';
  const scriptExcerpt = scriptText
    ? scriptText.substring(0, 6000)
    : 'No script available — design from title alone.';

  const visionBlock = visionRefs.length > 0
    ? `

═══ VISUAL REFERENCES — LOOK AT THESE IMAGES FIRST ═══

The first ${visionRefs.length} images attached to this message are real top-performing YouTube thumbnails from the same niche/style as your video. They are:
${visionRefs.map((r, i) => `  ${i + 1}. "${r.title}" (${r.views.toLocaleString()} views)`).join('\n')}

STUDY THEM. Notice their composition, color palette, focal hierarchy, typography, how text and image relate to each other, where negative space is. Your design should match this LEVEL of intentionality and visual quality. Not by copying their elements — by thinking like the designer who made them.

These thumbnails got millions of views because every pixel was a deliberate choice. If your design looks like a "text on stock photo" template next to these references, you have failed.
═══════════════════════════════════════════════════════
`
    : '';

  const retryBlock = priorAttempt
    ? `

═══ RETRY CONTEXT — your previous attempt was rejected ═══
Previous critic rating: ${priorAttempt.rating}/10
Designer verdict: ${priorAttempt.designer_verdict || '(none)'}

Specific problems the critic identified:
${(priorAttempt.problems || []).map(p => '  - ' + p).join('\n') || '  (none)'}

Single most important fix:
${priorAttempt.fix_instructions || '(none)'}

Make a STRUCTURALLY DIFFERENT design choice. Don't shuffle — rebuild. If the
text covered the focal subject, redesign so text and image have separate zones.
If the hook was vague, pick a more specific anchor. If the composition felt
generic, choose a more unusual angle.
═══════════════════════════════════════════════════════════
`
    : '';

  return `You are a senior YouTube thumbnail designer with 10+ years of experience. You design thumbnails that get 5M+ views. Real channels pay you $500/thumbnail. You are EXPERT at this craft.
${visionBlock}
Today you are designing a thumbnail for this video:

TITLE: "${title}"
NICHE: ${niche || 'unknown'}
TONE: ${tone || 'unknown'}

FULL SCRIPT (your thumbnail must connect to specific facts from this script — do NOT make up generic dramatic words, mine the actual content):
"""
${scriptExcerpt}
"""

${refBlock}

${learningContext}

${retryBlock}

═══ YOUR TASK ═══

Design this thumbnail as **complete self-contained HTML and CSS**. There are no element types to fill in. There are no archetypes to choose from. There is no template. You decide every pixel.

The HTML you write will be loaded directly into a headless Chrome browser at exact 1280x720 viewport and screenshotted. Whatever you write IS the thumbnail. Use any modern CSS feature: flexbox, grid, gradients, blend modes, filters, transforms, mask, clip-path, drop-shadow, web fonts from Google Fonts, etc. Be a real designer.

═══ TECHNICAL CONSTRAINTS (the only ones) ═══

1. The output must be a complete valid HTML5 document.
2. The body must have exactly 1280x720 dimensions and no margin/padding/scroll.
3. All text and shapes must render server-side in headless Chrome — do not rely on JavaScript animations or interactive features.
4. To embed images, use placeholders like \`<img src="{{IMG:1}}">\` and \`<img src="{{IMG:2}}">\`. The placeholders will be substituted with real images you specify in the image_requests array. You can request 0, 1, 2, or 3 images.
5. You may load Google Fonts via @import or link tags — the renderer has internet.
6. You may use background-image, mask-image, etc. with placeholder URLs the same way (e.g. \`background-image: url('{{IMG:1}}')\`).

═══ DESIGN PRINCIPLES (not rules — these are why human designers make the choices they make) ═══

- A great thumbnail tells one story in 0.05 seconds at 168x94 pixels. Test mentally: if you saw this thumbnail next to MrBeast/Aperture/Mark Tilbury in a feed, would yours look like one of theirs or obviously inferior?
- Every visual choice must be JUSTIFIED by an emotional or psychological reason you can articulate. If you cannot say WHY a color/shape/position is there, do not put it there.
- Text and image are designed TOGETHER, not stacked. Text never covers the focal subject of the image. Compositions have ONE clear focal hierarchy.
- Number hooks need a context label adjacent to them or they read as noise ($65 BILLION + STOLEN, not $65 BILLION alone).
- Named individuals (Bernie Madoff, Hitler, Putin) cannot be searched in stock libraries — design around the place/era/artifact, not their face.
- The image and the text must depict the same SPECIFIC story. A Yellowstone thumbnail must show Yellowstone, not "a volcano."

═══ HARD TEXT LEGIBILITY RULES (these are non-negotiable, learned from real human feedback) ═══

These come from a human reviewer who looked at previous outputs and called them out:

1. **NO TEXT BELOW 36px FONT SIZE.** Anything smaller vanishes at 168x94 mobile. Minimum is 36px (5% of canvas height). If you cannot fit your text at 36px+, cut the text — do not shrink it.

2. **NO GREY TEXT EVER.** Grey text (#888, #aaa, #ccc, anything between #444 and #ddd) disappears against any background at mobile scale. Text is either pure white (#FFF) on dark backgrounds, near-black (#000-#222) on bright backgrounds, or a saturated accent color (#FF1744 red, #FFD740 yellow, #00E676 green, #00BFFF cyan). NEVER grey.

3. **NO LOW-CONTRAST TEXT.** Every text element must have at least 7:1 contrast ratio against the pixels behind it. If the background is busy, add a solid color block, gradient, or text shadow to guarantee contrast. White text with no shadow over a bright sky is invalid. Grey text with no stroke over a grey image is invalid.

4. **MAXIMUM 2 TEXT BLOCKS PLUS A BANNER.** That's it. One primary hook (massive). One secondary line (large or medium). One short banner with a context word. NOTHING ELSE. If you find yourself adding a 4th text element, it is noise.

5. **NO ROTATED OR EDGE-CLIPPED TEXT.** Text rotated 90 degrees on the side of the canvas, text running along an edge, text in tiny corners — all invisible at mobile size. Text is horizontal, anchored, and large.

6. **BANNERS MUST BE SELF-EXPLANATORY TO COLD VIEWERS.** A banner that says "GRAND PRISMATIC TURNED BROWN" assumes the viewer knows what Grand Prismatic is. They don't. A banner that says "LAKE TURNED BROWN" or "WATER POISONED" works because anyone can parse it. NEVER use jargon or insider terminology in banners — they must make instant sense to someone who has never heard of the topic before.

These rules were generated from actual rejected thumbnails. Every output that violates them will be rejected.

═══ RETURN FORMAT — REQUIRED JSON ═══

Return ONLY a valid JSON object with this exact shape (no markdown fences, no commentary):

{
  "primary_subject": "the one named entity the thumbnail must visually depict (Yellowstone, Bernie Madoff, Marianas Trench)",
  "subject_is_person": true | false,
  "hook_text": "the 1-2 word hook your design uses, for logging",
  "image_requests": [
    {
      "id": 1,
      "prompt": "complete prompt for AI image generation OR Pexels search query — be specific, cinematic, describe the scene",
      "source_hint": "ai" | "real",
      "purpose": "what role this image plays in your composition"
    }
    // 0 to 3 images
  ],
  "html": "<!DOCTYPE html><html>...</html> — complete self-contained HTML/CSS document. Use {{IMG:1}}, {{IMG:2}}, {{IMG:3}} placeholders for the requested images.",
  "why": "5-paragraph designer reasoning: (1) what emotion you targeted, (2) what the viewer sees first at 168x94, (3) what psychological click trigger this exploits, (4) what survives compression, (5) element audit — for every pixel you placed, justify it"
}`;
}

async function planThumbnail({ title, scriptText, niche, tone, priorAttempt }) {
  const references = selectRelevantReferences(title, niche || 'education', 4);
  const learningContext = buildLearningContext(title, niche || 'education');
  // VISION ATTACHMENTS — actual reference thumbnail JPGs from the video library.
  // Claude will SEE 4 real top-performing thumbnails in the same niche/style
  // before designing. Without this Claude was reading abstract reasoning but
  // never visually seeing what good looks like, so it defaulted to Canva-tier
  // text-on-background output even with HTML/CSS freedom.
  const visionRefs = selectReferenceThumbnailImages(title, niche || 'education', 4);
  if (visionRefs.length > 0) {
    console.log('  [VisionRefs] Loaded ' + visionRefs.length + ' reference thumbnail images:');
    for (const r of visionRefs) {
      console.log(`    • ${r.views.toLocaleString().padStart(12)} views — "${r.title.substring(0, 70)}"`);
    }
  }

  if (references.length > 0) {
    console.log('  [References] Loaded ' + references.length + ' reference blueprints (text reasoning)');
  }

  const winnersCount = (learningContext.match(/Winner /g) || []).length;
  const losersCount = (learningContext.match(/Loser /g) || []).length;
  if (winnersCount + losersCount > 0) {
    console.log(`  [LearningPool] ${winnersCount} winners + ${losersCount} losers in context`);
  }

  const prompt = buildPlannerPrompt({ title, scriptText, niche, tone, references, learningContext, priorAttempt, visionRefs });

  // Build multimodal content: vision-reference images followed by the text prompt
  const content = [];
  for (const r of visionRefs) {
    try {
      const buf = fs.readFileSync(r.path);
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: buf.toString('base64') },
      });
    } catch (e) {
      console.log(`  [VisionRefs] Failed to load ${r.path}: ${e.message}`);
    }
  }
  content.push({ type: 'text', text: prompt });

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
  });
  const text = response.content[0].text;
  // Strip optional markdown fences if present
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Planner returned no JSON');
  const plan = JSON.parse(m[0]);
  if (!plan.html) throw new Error('Planner returned no html field');
  plan._vision_refs = visionRefs.map(v => ({ title: v.title, views: v.views, path: v.path }));
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
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
        {
          type: 'text',
          text: `You are a senior YouTube thumbnail designer with 10+ years experience designing thumbnails that get 5M+ views. You charge $500/thumbnail. A junior designer just submitted this thumbnail for the video "${title}" and is asking if it's ready to ship to a real channel.

You are NOT a friendly reviewer. You are HARSH. Most thumbnails you see are not good enough to ship. Default to a low rating. A 7+ means you would actually use this on one of YOUR channels with your name on it.

Rate 1-10 with this calibration:
- 1-3: Embarrassing. Looks like a template. Generic. No designer's hand visible.
- 4-5: Mediocre. Functional but forgettable. Wouldn't stand out in a feed.
- 6: Decent. Has one good idea but execution is sloppy.
- 7: Genuinely good. You'd be willing to attach your name to it.
- 8-9: Excellent. Clearly designed by a human with taste and intent.
- 10: Reserved for thumbnails good enough to be in a "best thumbnails of 2026" post.

THE FUNDAMENTAL TEST — answer this honestly before rating:
"If I saw this thumbnail in my YouTube feed alongside thumbnails from MrBeast, Veritasium, Mark Tilbury, Aperture, and Joe Scott — would it look like one of theirs, or would it look obviously inferior?"

If "obviously inferior" → rating cannot exceed 5.
If "could be theirs" → rating 7+ permitted.

Specific things that should KILL the rating:
- Text covers the most interesting part of the image
- Hook text is generic/disconnected from the title topic
- Subject identity unclear
- Designer's intentionality: does this LOOK like a person made a series of choices, or like an algorithm filled in slots?

Return ONLY valid JSON:
{
  "rating": 1-10,
  "would_use_on_real_channel": true | false,
  "designer_verdict": "one sentence — proud or embarrassed and why",
  "specific_problems": ["concrete defects, not vague critiques"],
  "what_works": ["genuine wins — empty array is fine"],
  "fix_instructions": "if rating < 8, the SINGLE most important thing to change"
}`,
        },
      ],
    }],
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

export async function generateThumbnailV3({ outputDir, title, scriptText = '', niche = '', tone = '', _attempt = 1, _priorAttempt = null }) {
  console.log('============================================================');
  console.log('VideoForge Thumbnail v3 (HTML/CSS)' + (_attempt > 1 ? ` — RETRY ${_attempt}/${MAX_ATTEMPTS}` : ''));
  console.log('============================================================');
  console.log('  Title: ' + title);
  console.log('  Niche: ' + niche);
  console.log('  Script: ' + (scriptText ? `${scriptText.length} chars` : 'none'));

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: Plan
  console.log('\n--- Step 1: Claude designs the thumbnail (full HTML/CSS) ---');
  const plan = await planThumbnail({ title, scriptText, niche, tone, priorAttempt: _priorAttempt });
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
  // Hard legibility violations cap the rating at 4 — Niels rules are non-advisory
  if (!legibility.ok) {
    review.rating = Math.min(review.rating, 4);
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
    return generateThumbnailV3({ outputDir, title, scriptText, niche, tone, _attempt: _attempt + 1, _priorAttempt: review });
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
