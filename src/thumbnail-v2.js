/**
 * VideoForge Thumbnail v2 — Context-Aware Thumbnail Generator
 *
 * Completely separate from thumbnail.js (v1). Uses:
 * - Claude for deep script analysis (understands full video context)
 * - Recraft V3 via fal.ai for background/scene generation ($0.04/image)
 * - node-canvas for professional text compositing (no Puppeteer needed)
 * - Brave/Pexels for supplementary real images when needed
 */

import Anthropic from '@anthropic-ai/sdk';
import { createCanvas, registerFont, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FAL_KEY = process.env.FAL_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const WIDTH = 1280;
const HEIGHT = 720;

// ─── NICHE DEFINITIONS ─────────────────────────────────────────────────────────
// Each niche defines color palettes, preferred layouts, and visual style guidance.
// When a video's niche isn't an exact match, Claude picks the closest one.
const NICHES = {
  travel: {
    name: "Travel & Geography",
    palettes: [
      { bg: "#0a1628", text: "#FFFFFF", accent: "#FF6B35", highlight: "#FFD700" },
      { bg: "#1a0a2e", text: "#FFFFFF", accent: "#00D4AA", highlight: "#FF4081" },
      { bg: "#0d2137", text: "#FFFFFF", accent: "#4FC3F7", highlight: "#FFC107" },
    ],
    layouts: ["split_image_text", "full_bleed_text", "dual_image"],
    imageStyle: "cinematic landscape photography, vibrant saturated colors, dramatic lighting",
    textStyle: "adventurous, exciting, discovery-focused",
  },
  finance: {
    name: "Finance & Business",
    palettes: [
      { bg: "#0a0f1a", text: "#FFFFFF", accent: "#00E676", highlight: "#FFD700" },
      { bg: "#1a0000", text: "#FFFFFF", accent: "#FF1744", highlight: "#FFFFFF" },
      { bg: "#0f0a00", text: "#FFFFFF", accent: "#FFD700", highlight: "#00E676" },
    ],
    layouts: ["split_image_text", "bold_center_text", "icon_grid"],
    imageStyle: "clean financial imagery, charts, money, luxury items, sharp professional look",
    textStyle: "urgent, numbers-focused, wealth/loss oriented",
  },
  tech: {
    name: "Technology & Science",
    palettes: [
      { bg: "#0a0a1a", text: "#FFFFFF", accent: "#00BFFF", highlight: "#FF4081" },
      { bg: "#0d0d0d", text: "#FFFFFF", accent: "#7C4DFF", highlight: "#00E5FF" },
      { bg: "#001015", text: "#FFFFFF", accent: "#00E676", highlight: "#FFFFFF" },
    ],
    layouts: ["split_image_text", "bold_center_text", "full_bleed_text"],
    imageStyle: "sleek technology, futuristic, devices, digital interfaces, clean modern look",
    textStyle: "intriguing, future-focused, explanatory",
  },
  history: {
    name: "History & Culture",
    palettes: [
      { bg: "#1a1000", text: "#FFFFFF", accent: "#D4A574", highlight: "#FFD700" },
      { bg: "#150a0a", text: "#FFFFFF", accent: "#CC4444", highlight: "#D4A574" },
      { bg: "#0a0f1a", text: "#FFFFFF", accent: "#8899BB", highlight: "#FFD700" },
    ],
    layouts: ["split_image_text", "full_bleed_text", "dual_image"],
    imageStyle: "historical imagery, ancient architecture, dramatic documentary photography, sepia tones",
    textStyle: "dramatic, revelation-focused, epic scope",
  },
  space: {
    name: "Space & Astronomy",
    palettes: [
      { bg: "#050510", text: "#FFFFFF", accent: "#7B68EE", highlight: "#00BFFF" },
      { bg: "#0a0015", text: "#FFFFFF", accent: "#FF6B9D", highlight: "#7C4DFF" },
      { bg: "#000a0f", text: "#FFFFFF", accent: "#00E5FF", highlight: "#FFFFFF" },
    ],
    layouts: ["full_bleed_text", "split_image_text", "bold_center_text"],
    imageStyle: "cosmic imagery, nebulae, planets, stars, dramatic deep space photography",
    textStyle: "awe-inspiring, mystery-focused, scale-emphasizing",
  },
  nature: {
    name: "Nature & Animals",
    palettes: [
      { bg: "#0a1a0a", text: "#FFFFFF", accent: "#4CAF50", highlight: "#FFD700" },
      { bg: "#0f1a28", text: "#FFFFFF", accent: "#00BCD4", highlight: "#FF6B35" },
      { bg: "#1a1000", text: "#FFFFFF", accent: "#FF9800", highlight: "#4CAF50" },
    ],
    layouts: ["full_bleed_text", "split_image_text", "dual_image"],
    imageStyle: "stunning wildlife photography, dramatic nature, vivid colors, National Geographic style",
    textStyle: "wonder-inducing, dramatic, discovery-focused",
  },
  health: {
    name: "Health & Fitness",
    palettes: [
      { bg: "#0a1a0f", text: "#FFFFFF", accent: "#00E676", highlight: "#FFFFFF" },
      { bg: "#1a0505", text: "#FFFFFF", accent: "#FF5252", highlight: "#FFD740" },
      { bg: "#0f0a1a", text: "#FFFFFF", accent: "#BB86FC", highlight: "#03DAC5" },
    ],
    layouts: ["split_image_text", "bold_center_text", "icon_grid"],
    imageStyle: "clean health imagery, fitness, food, body, medical illustration style",
    textStyle: "actionable, warning/tip oriented, transformation-focused",
  },
  entertainment: {
    name: "Entertainment & Lifestyle",
    palettes: [
      { bg: "#1a0520", text: "#FFFFFF", accent: "#FF4081", highlight: "#FFD740" },
      { bg: "#0a0f1a", text: "#FFFFFF", accent: "#448AFF", highlight: "#FF6B35" },
      { bg: "#1a1a00", text: "#FFFFFF", accent: "#FFEA00", highlight: "#FF4081" },
    ],
    layouts: ["bold_center_text", "split_image_text", "full_bleed_text"],
    imageStyle: "vibrant pop culture imagery, bright bold colors, energetic dynamic composition",
    textStyle: "catchy, fun, curiosity-inducing",
  },
  horror: {
    name: "Horror & Mystery",
    palettes: [
      { bg: "#0a0505", text: "#FFFFFF", accent: "#FF1744", highlight: "#FFFFFF" },
      { bg: "#050a0a", text: "#FFFFFF", accent: "#00BFA5", highlight: "#FF1744" },
      { bg: "#0f0510", text: "#FFFFFF", accent: "#9C27B0", highlight: "#FF5252" },
    ],
    layouts: ["full_bleed_text", "bold_center_text", "split_image_text"],
    imageStyle: "dark atmospheric imagery, shadows, fog, eerie locations, horror photography",
    textStyle: "ominous, suspenseful, warning-like",
  },
  education: {
    name: "Education & How-To",
    palettes: [
      { bg: "#0a1428", text: "#FFFFFF", accent: "#FF1744", highlight: "#FFD740" },
      { bg: "#0f0a1a", text: "#FFFFFF", accent: "#FF1744", highlight: "#00E5FF" },
      { bg: "#001a0a", text: "#FFFFFF", accent: "#FF1744", highlight: "#FFFFFF" },
    ],
    layouts: ["split_image_text", "icon_grid", "bold_center_text"],
    imageStyle: "clean educational imagery, infographic style, icons, diagrams, clear visual metaphors",
    textStyle: "clear, informative, tip/list oriented",
  },
  military: {
    name: "Military & War",
    palettes: [
      { bg: "#0a0f0a", text: "#FFFFFF", accent: "#8BC34A", highlight: "#FF5722" },
      { bg: "#0f0a05", text: "#FFFFFF", accent: "#FF6F00", highlight: "#FFFFFF" },
      { bg: "#0a0a14", text: "#FFFFFF", accent: "#78909C", highlight: "#FF1744" },
    ],
    layouts: ["full_bleed_text", "split_image_text", "dual_image"],
    imageStyle: "dramatic military photography, equipment, historical warfare, documentary style",
    textStyle: "intense, factual, revealing",
  },
  retirement: {
    name: "Retirement & Senior Living",
    palettes: [
      { bg: "#0a1428", text: "#FFFFFF", accent: "#4FC3F7", highlight: "#FFD740" },
      { bg: "#0f0a00", text: "#FFFFFF", accent: "#FFB300", highlight: "#4CAF50" },
      { bg: "#0a1a14", text: "#FFFFFF", accent: "#26A69A", highlight: "#FFFFFF" },
    ],
    layouts: ["split_image_text", "bold_center_text", "full_bleed_text"],
    imageStyle: "warm inviting imagery, comfortable lifestyle, golden years, beautiful destinations",
    textStyle: "reassuring yet urgent, advice-oriented, list-focused",
  },
};

// ─── REFERENCE LOADER ───────────────────────────────────────────────────────────
// Loads curated thumbnail blueprints from thumbnail-references/<niche>/*.json
const REFERENCES_DIR = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), "../thumbnail-references");

function loadReferences(niche) {
  const refs = [];
  const nicheDir = path.join(REFERENCES_DIR, niche);
  if (!fs.existsSync(nicheDir)) return refs;

  const files = fs.readdirSync(nicheDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(nicheDir, file), "utf-8"));
      refs.push(data);
    } catch (e) {
      console.log(`  [Ref] Skipping invalid reference: ${file}`);
    }
  }
  return refs;
}

function loadAllReferences() {
  const all = {};
  if (!fs.existsSync(REFERENCES_DIR)) return all;
  const niches = fs.readdirSync(REFERENCES_DIR).filter(d =>
    fs.statSync(path.join(REFERENCES_DIR, d)).isDirectory()
  );
  for (const niche of niches) {
    const refs = loadReferences(niche);
    if (refs.length > 0) all[niche] = refs;
  }
  return all;
}

function summarizeReference(ref) {
  // Create a concise summary for Claude's context (keep token usage reasonable)
  const meta = ref.meta || {};
  const bg = ref.background || {};
  const textItems = ref.text_hierarchy || [];
  const comp = ref.composition || {};
  const design = ref.design_patterns || {};
  const recipe = ref.reproduction_recipe || {};
  const palette = ref.color_palette || {};

  const textSummary = textItems.map(t => {
    const pos = t.position || {};
    return `  - ${t.role}: "${t.content}" | font=${t.font_family} size_ratio=${t.size_ratio} | center=(${pos.center_x_ratio}, ${pos.center_y_ratio}) | color=${t.color} | stroke=${t.stroke?.detected ? "yes" : "no"} shadow=${t.shadow?.detected ? "yes" : "no"}`;
  }).join("\n");

  return `REFERENCE: "${meta.title_reference}"
Layout: ${meta.layout_type} | Mood: ${meta.mood} | Energy: ${meta.energy}
Background: ${bg.type} — ${bg.image_description?.substring(0, 150) || "n/a"}
Color grade: sat=${bg.color_grade?.saturation} contrast=${bg.color_grade?.contrast || "n/a"} warmth=${bg.color_grade?.warmth}
Palette: dominant=${palette.dominant} text=${palette.text_primary} type=${palette.palette_type}
Text:\n${textSummary}
Composition: ${comp.text_placement_strategy} | flow=${comp.visual_flow}
Why it works: ${(design.why_it_works || []).slice(0, 3).join(" | ")}
Recipe: ${Object.values(recipe).slice(0, 4).join(" → ")}`;
}

// ─── DESIGN PRINCIPLES (synthesized from 139+ real thumbnail blueprints) ────────
// Instead of copying individual references, the system has internalized universal
// design principles from analyzing 169 videos across 11+ niches. These principles
// are applied CREATIVELY per video — no template matching, no single-reference copying.
const PRINCIPLES_PATH = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), "./thumbnail-principles.json");
let PRINCIPLES = {};
try {
  PRINCIPLES = JSON.parse(fs.readFileSync(PRINCIPLES_PATH, "utf-8"));
} catch (e) {
  console.log("  [Warn] Could not load thumbnail-principles.json — using inline fallback");
}

// ─── SCRIPT ANALYSIS (Claude) ───────────────────────────────────────────────────
// Claude acts as a creative director who has INTERNALIZED design principles from
// 139+ real thumbnails. It doesn't copy any single reference — it synthesizes
// knowledge from all of them to create something original per video.
// ─── ARCHETYPES ─────────────────────────────────────────────────────────────────
// Each archetype is a contract: required + forbidden element types. The planner
// must pick exactly ONE archetype per thumbnail. The post-parse validator drops
// any element type the chosen archetype forbids — this kills the "annotation
// circles on a server rack because the slot exists" failure mode.
const ARCHETYPES = {
  hero_subject: {
    description: "ONE dominant subject fills the frame. Massive 1-2 word hook overlaid on a calm zone of the image. No annotations, no banner-as-decoration.",
    when: "Single named entity, dramatic photo, awe/dread/curiosity. Most space, history, science, geography.",
    required: ["image", "text"],
    optional: ["gradient", "vignette", "banner"],
    forbidden: ["arrow", "circle", "color_zone", "divider", "desaturate", "warm_glow", "overlay_image"],
    max_text: 1,
    max_banners: 1,
  },
  data_callout: {
    description: "Image with 1-2 annotation arrows or circles pointing at SPECIFIC visible features. Each annotation must justify itself.",
    when: "Charts, maps, diagrams, scientific images where a specific feature is the story. Finance, science, military intel.",
    required: ["image", "text"],
    optional: ["arrow", "circle", "banner", "gradient", "vignette"],
    forbidden: ["color_zone", "divider", "desaturate", "warm_glow", "overlay_image"],
    max_annotations: 2,
    max_text: 1,
    max_banners: 1,
  },
  before_after: {
    description: "Two photos side by side showing transformation. NOT one photo with a filter — two distinct images.",
    when: "Skin, body, weight, ruined-vs-restored buildings, clean-vs-polluted environments.",
    required: ["image", "image", "divider", "text"],
    optional: ["banner", "gradient", "warm_glow", "desaturate"],
    forbidden: ["arrow", "circle", "color_zone", "overlay_image"],
    max_text: 1,
    max_banners: 1,
  },
  triptych: {
    description: "Three vertical panels showing 3 steps, examples, or comparisons. Each panel an independent image.",
    when: "Lists, routines, before/during/after, comparisons of three things.",
    required: ["image", "image", "image", "text"],
    optional: ["divider", "banner", "gradient"],
    forbidden: ["arrow", "circle", "color_zone", "desaturate", "warm_glow", "overlay_image"],
    max_text: 1,
    max_banners: 1,
  },
  split_comparison: {
    description: "Two halves contrasting two things. Vertical divider. Each half is its own image.",
    when: "Versus content, big-vs-small, them-vs-us, country-vs-country, before-vs-after of distinct subjects.",
    required: ["image", "image", "divider", "text"],
    optional: ["banner", "color_zone", "gradient"],
    forbidden: ["arrow", "circle", "desaturate", "warm_glow", "overlay_image"],
    max_text: 1,
    max_banners: 2,
  },
  programmatic_diagram: {
    description: "Renderer draws the structure programmatically (iceberg / pyramid / crash chart). AI image is the BACKDROP only. Labels are programmatic.",
    when: "Iceberg of secrets, hierarchy/pyramid, financial crash. Anything category B.",
    required: ["text"],
    optional: ["image", "gradient", "vignette", "banner"],
    forbidden: ["arrow", "circle", "color_zone", "divider", "desaturate", "warm_glow", "overlay_image"],
    max_text: 1,
    max_banners: 1,
    requires_render_mode: true,
  },
  bottom_title_card: {
    description: "Massive image fills 80% of the frame, bold text in a banner bar across the bottom 20%. Cinematic / movie-poster.",
    when: "Documentary, history, prestige content where the image is the hero.",
    required: ["image", "banner"],
    optional: ["gradient", "vignette", "text"],
    forbidden: ["arrow", "circle", "color_zone", "divider", "desaturate", "warm_glow", "overlay_image"],
    max_text: 1,
    max_banners: 1,
  },
  center_statement: {
    description: "Single word or 2-word statement DEAD CENTER, image fills entire frame as backdrop. Period for finality.",
    when: "Single word with cultural weight (NIHILISM, ENTROPY, FORBIDDEN). The word IS the thumbnail.",
    required: ["image", "text"],
    optional: ["gradient", "vignette", "fill"],
    forbidden: ["arrow", "circle", "color_zone", "divider", "desaturate", "warm_glow", "overlay_image", "banner"],
    max_text: 1,
    max_banners: 0,
  },
};

function archetypePromptBlock() {
  const lines = ["═══ ARCHETYPE SELECTION (CRITICAL — pick exactly ONE) ═══",
    "You MUST select exactly one archetype for this thumbnail. The renderer will SILENTLY DROP any element type that the archetype forbids — so do not waste time adding elements outside the contract. Pick the archetype that best fits this video.",
    ""];
  for (const [name, a] of Object.entries(ARCHETYPES)) {
    lines.push(`  • ${name}`);
    lines.push(`      ${a.description}`);
    lines.push(`      WHEN: ${a.when}`);
    lines.push(`      REQUIRED elements: ${a.required.join(', ')}`);
    lines.push(`      FORBIDDEN: ${a.forbidden.join(', ')}`);
    lines.push("");
  }
  lines.push("Set \"archetype\" in your JSON response to one of the names above. The renderer will reject the plan and retry if you violate the contract.");
  return lines.join("\n");
}

// Sanitize a parsed plan against its declared archetype: drop forbidden element
// types, enforce element-count limits. Returns {plan, dropped[], violations[]}.
function applyArchetypeContract(plan) {
  const dropped = [];
  const violations = [];
  if (!plan.archetype || !ARCHETYPES[plan.archetype]) {
    violations.push(`Unknown or missing archetype: "${plan.archetype || ''}". Defaulting to hero_subject.`);
    plan.archetype = "hero_subject";
  }
  const contract = ARCHETYPES[plan.archetype];
  if (!Array.isArray(plan.elements)) return { plan, dropped, violations };

  // Drop forbidden types
  const before = plan.elements.length;
  plan.elements = plan.elements.filter(el => {
    if (contract.forbidden.includes(el.type)) {
      dropped.push(`${el.type} (forbidden by ${plan.archetype})`);
      return false;
    }
    return true;
  });

  // Enforce caps
  const cap = (typeName, limit) => {
    let kept = 0;
    plan.elements = plan.elements.filter(el => {
      if (el.type !== typeName) return true;
      if (kept < limit) { kept++; return true; }
      dropped.push(`extra ${typeName} (cap ${limit} for ${plan.archetype})`);
      return false;
    });
  };
  if (typeof contract.max_text === "number") cap("text", contract.max_text);
  if (typeof contract.max_banners === "number") cap("banner", contract.max_banners);
  if (typeof contract.max_annotations === "number") {
    let kept = 0;
    plan.elements = plan.elements.filter(el => {
      if (el.type !== "arrow" && el.type !== "circle") return true;
      if (kept < contract.max_annotations) { kept++; return true; }
      dropped.push(`extra ${el.type} (annotation cap ${contract.max_annotations})`);
      return false;
    });
  }

  // Check required types are present
  const have = new Set(plan.elements.map(e => e.type));
  const missing = [];
  const reqCounts = {};
  for (const t of contract.required) reqCounts[t] = (reqCounts[t] || 0) + 1;
  for (const [t, n] of Object.entries(reqCounts)) {
    const present = plan.elements.filter(e => e.type === t).length;
    if (present < n) missing.push(`${t} x${n - present}`);
  }
  if (missing.length) violations.push(`Missing required elements for ${plan.archetype}: ${missing.join(", ")}`);

  return { plan, dropped, violations };
}

async function analyzeScript(title, scriptText, niche, tone, priorFeedback = null) {
  const nicheList = Object.keys(NICHES).join(", ");
  const scriptExcerpt = scriptText
    ? scriptText.substring(0, 4000)
    : "No script available — use title only.";

  // RETRY CONTEXT — when a previous attempt was rejected by self-review,
  // surface the specific failures so the planner does not repeat them.
  const retryBlock = priorFeedback
    ? `

═══════════════════════════════════════════════════════════
RETRY CONTEXT — A PREVIOUS ATTEMPT FAILED SELF-REVIEW
═══════════════════════════════════════════════════════════
The previous plan scored ${priorFeedback.combined_rating || priorFeedback.rating}/10 (combined) and was rejected.
Critic rating: ${priorFeedback.rating}/10
Structural score: ${priorFeedback.structural_score || 'n/a'}/10 (vs reference library)

Problems the visual reviewer found (DO NOT REPEAT THESE):
${(priorFeedback.problems || []).map(p => `  - ${p}`).join('\n') || '  (none recorded)'}

Structural deviations from top-performing references in this niche:
${(priorFeedback.structural_notes || []).map(n => `  - ${n}`).join('\n') || '  (none)'}

Specific fix instructions from the reviewer:
${priorFeedback.fix_instructions || '(none)'}

Your job on this retry is NOT to make a small variation of the previous plan.
You MUST change AT LEAST TWO of the following from the previous attempt:
  (a) the hook text itself — pick a different angle, not the same word capitalized differently
  (b) the archetype — try a different one from the contract list
  (c) the image prompt subject framing — different scene, different perspective, different mood
If you return the same hook word as the previous attempt, the system will reject the plan
and force another retry. The previous attempt's hook MUST NOT appear in this attempt's plan.

Other rules that always apply:
- If the previous plan used annotation circles for no reason — drop them.
- If text overlapped the focal point — pick a layout where text and image have separate zones.
- If structural notes mention text_area_ratio is too high — use less text or smaller text.
- If structural notes mention color_count is too high — simplify the palette to 2-4 colors max.
- If structural notes mention text_size_ratio is too high — drop from "massive" to "large" or "medium".
═══════════════════════════════════════════════════════════
`
    : '';

  // Build the principles block — compact synthesis of ALL blueprints
  const principlesBlock = `
DESIGN PRINCIPLES (synthesized from analyzing 139+ real high-performing YouTube thumbnails across all niches):

HOOK TEXT PATTERNS THAT WORK (pick the best pattern for THIS video, not the obvious one):
- Number hooks: "$306 PER DAY", "$62,500,000,000/mg" — specific beats round, daily framing > annual
- Prohibition hooks: "DO NOT JOIN", "FORBIDDEN" — triggers reactance, people want what they're told to avoid
- Revelation hooks: "THIS IS JUPITER", "THEY LIED" — recontextualize something familiar
- Question hooks: "HOW DO YOU HACK A GOD?", "HOW?" — the more audacious the better
- Statement hooks: "OWN NOTHING.", "ITS FREEZING." — period at end adds finality and weight
- Single-word hooks: "ENTROPY", "STOICISM" — works when the word itself carries cultural weight
- Exclusivity hooks: "NOBODY TEACHES THIS", "HE KNEW TOO MUCH..." — implies insider knowledge
- Transformation hooks: "DAY 1 / DAY 21" — show gap between current and aspirational state

CROSS-NICHE TECHNIQUES (use these regardless of niche — they work everywhere):
- ONE RED WORD: Make the KEY word red (#cc2020-#FF3333), rest white. E.g. "ITS [red]FREEZING[/red]."
- PERIOD FINALITY: Period after short statement = verdict. "IMPOSSIBLE." "DELUSIONAL."
- ELLIPSIS CLIFFHANGER: "HE KNEW TOO MUCH..." = open loop
- WATERMARK NUMBER: Large dollar amount at 25% canvas size, 65% opacity behind subject
- WHITE BG PATTERN BREAK: White background stands out in a feed of dark thumbnails — signals clean/educational

LAYOUT VARIETY — CRITICAL RULE:
Every thumbnail MUST have a layout designed specifically for its topic. DO NOT default to "big text top-left, banner bottom-left, full-bleed background" — that is ONE layout and you must NOT use it for everything.

VISUAL HIERARCHY — FOCAL POINT RULE:
EVERY composition must have ONE primary focal point that dominates at thumbnail scale. Supporting elements must be visually de-emphasized through:
- Background elements: blur (ctx.filter = 'blur(2px)'), reduced opacity (0.3-0.6), or darker overlay
- Secondary images: 40-60% opacity, positioned as backdrop not foreground
- Multiple text elements: establish clear size hierarchy (primary 2x larger than secondary)
- Competing elements: if >3 visual elements exist, blur or fade the least important ones
Rule: Viewer's eye should land on the PRIMARY element within 0.1 seconds, with all other elements clearly supporting it.

NICHE-SPECIFIC LAYOUT GUIDANCE:
- FINANCE/TRADING: Use split panels showing chart patterns, colored zones (green=profit, red=loss), annotation arrows pointing to key data. Text can be CENTER or RIGHT. Think: annotated chart, not just text over dark photo.
- SELF-IMPROVEMENT/ROUTINE: Use TRIPTYCH (3 vertical panels) showing 3 activities/steps side by side. Or before/after split (desaturated left, vibrant right). The layout itself should communicate "transformation" or "steps."
- HISTORY: Use dramatic classical painting-style images with MINIMAL text. Text can be at BOTTOM as a title card, or CENTERED as an epic statement. Think documentary poster, not YouTube clickbait.
- MEGAPROJECTS/GEOGRAPHY: Use comparison layouts — before/after, small vs big, desert vs city. Two images side by side with a divider. Or a massive landscape with small text anchored at bottom-right.
- SCIENCE/CRISIS: Use annotation-heavy layouts — arrows pointing to data, circles highlighting problem areas, colored danger zones. The layout should look like an infographic, not a movie poster.
- SPACE: Use immersive full-bleed with text positioned wherever the composition demands — could be bottom-center, right-side, or overlapping the subject. Let the space image dominate.

AVAILABLE COMPOSITION STYLES (you must use DIFFERENT ones for different topics):
1. split_comparison — Two halves showing contrast. Use two image elements side by side + divider.
2. triptych — Three vertical panels. Use three image elements at x:0/33/66, each w:33.
3. annotation_overlay — Full image + arrows, circles, and labels pointing to specific things.
4. before_after — Full image with left half desaturated, right half vibrant. Use desaturate element.
5. bottom_title_card — Massive image (80% height), text in a banner bar at bottom. Cinematic.
6. center_statement — Text dead center, image fills entire frame. For powerful single-word hooks.
7. right_aligned — Image fills left 60%, text stack on right 40% with colored background.
8. data_callout — Image with colored zones, arrows, and numbers annotating specific areas.
9. minimal_text_maximum_image — Tiny text in corner, the IMAGE does all the selling. For visually stunning topics.

IMAGE GENERATION RULES:
What works: Single dramatic light source (side-lit, backlit). Unexpected perspective. Real material textures (marble, ice, rust). Near-monochrome with ONE saturated accent. Mood first, details second.
What FAILS: Flat illustrative clip-art. Corporate stock imagery. Over-saturated everything. Generic backgrounds.
Always include in prompts: "cinematic, dramatic lighting, 16:9, no text, no watermarks"

COLOR PSYCHOLOGY:
- Awe/wonder: dark base (#0a0a15) + warm gold (#c08030) + cool teal (#40a0b0)
- Horror/dread: near-black (#0a0805) + blood red (#8a2020)
- Money/aspiration: green (#7cb342) on dark + gold (#d4a832) for premium
- Danger/forbidden: blood-red (#cc2222) + pure black + yellow warning (#e8d020)
- Educational/clean: white bg (#F0EEEB) + black text + single red accent (#D42B2B)
- Mystery/conspiracy: dark teal (#0a1215) + matrix green (#00CC55)
- Classical/intellectual: charcoal (#2a2a2a) + marble grey (#8a8a7a) + one red or gold accent

WHY PEOPLE CLICK (apply at least 2 of these):
- Curiosity gap: Show something that raises an unanswerable question
- Forbidden knowledge: Imply suppressed/dangerous information
- Specific credibility: $306 not $300 — specificity = believability
- Visual beauty as scroll-stop: A genuinely stunning image stops the scroll before text is even read
- Emotion before reason: Thumbnail triggers emotion (fear/awe/desire), title provides the rational hook
- Identity challenge: Attack viewer's sacred beliefs or self-image`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3500,
    messages: [{
      role: "user",
      content: `You are a YouTube thumbnail designer who thinks like a psychologist. You understand WHY people click, not just what thumbnails look like. Viewers decide to click in 0.05 seconds. Your job: exploit that 0.05-second window.

BEFORE DESIGNING ANYTHING, answer these 5 questions in your "why" field:
1. EMOTION: What ONE emotion should the viewer feel? (dread, curiosity, aspiration, shock, disgust, envy, fear)
2. FIRST IMPRESSION: What ONE thing does the eye see first at 168x94px? (a number, a shape, a color contrast, a face, an object)
3. CLICK TRIGGER: What psychological vulnerability makes someone click? (FOMO, identity anxiety, completion obsession, threat detection, forbidden knowledge, transformation desire)
4. MOBILE TEST: At 168x94px, what survives? Describe the dominant impression in 5 words.
5. ELEMENT AUDIT: Name every visual element. For EACH one, answer: "If I removed this, would something be lost?" If no, remove it.

Your design decisions MUST flow from these answers. Not from templates or layout patterns.

EXAMPLES OF THINKING LIKE A DESIGNER:
- Before/after skin thumbnail: "The viewer needs to feel IDENTITY ANXIETY — that's their face on the left, and the ideal on the right. Two COMPLETE faces of the SAME person. The red arrow forces the eye to compare. Zero text because text would give the logical brain a defense against the emotional comparison."
- Iceberg thumbnail: "The viewer needs to feel COMPLETION OBSESSION — they see layers going deeper and darker, and they NEED to know what's at the bottom. The iceberg shape itself is the hook. Each tier deeper = darker, more ominous. The bottom tier should glow RED to signal danger. The word 'FORBIDDEN' makes the bottom layer irresistible."
- Crash chart thumbnail: "The viewer needs to feel DREAD and VERTIGO. The chart should show a sickening plunge — a thick green line climbing steadily, then a VIOLENT red drop that makes your stomach turn. The crash is the visual hero. '72 HOURS' tells you how fast it happened. 'LEHMAN' tells you who died."
- Space object thumbnail: "The viewer needs to feel EXISTENTIAL THREAT. One massive dark object dominating the frame, Earth tiny below. A single clinical word stamped on it like a scientific classification. The viewer thinks: 'This is real and cataloged and heading our way.'"

CRITICAL — TWO RENDERING CATEGORIES:
Before designing, decide which category this thumbnail falls into:

CATEGORY A — "AI Scene + Text Overlay" (DEFAULT for most thumbnails):
The AI generates a dramatic background scene/object/environment. The renderer overlays clean programmatic text on top. Use this for: space scenes, landscapes, historical imagery, dramatic objects, atmospheric moods, CGI renders. The Rogue Planet approach: stunning AI image + minimal bold text.
AI image generators are GREAT at: cinematic scenes, objects, environments, creatures, atmospheres, textures.

CATEGORY B — "Programmatic Structure" (for data/information visuals):
The renderer builds the visual structure programmatically with canvas drawing — NO AI-generated infographics. Use this when the thumbnail needs: financial charts, iceberg/pyramid diagrams, before/after splits, data visualizations, annotated diagrams.
AI image generators CANNOT do: readable text, financial charts, infographics with labels, structured diagrams, icon grids, mathematical equations/formulas. Every attempt produces GIBBERISH TEXT or unreadable tiny symbols. For physics/science content, request 'no mathematical formulas, no equations, no text overlays' and focus on visual concepts only.
Set "render_mode" in your JSON response to use these:
- "crash_chart" — programmatic stock crash chart with candlesticks, curve, and gradient fill
- "iceberg" — AI generates a realistic underwater iceberg image (request via image_prompt: 'realistic underwater iceberg, massive ice formation below dark ocean waterline, deep blue water fading to black depths, red glow from the abyss below, cinematic'). Programmatic labels overlay on top.
- "pyramid" — programmatic tiered pyramid with labeled sections

For Category B, the AI image is NOT used as background — the programmatic renderer draws everything. You still design the text overlay (hook text + banner) which renders on top.

VIDEO TITLE: "${title}"
NICHE HINT: ${niche || "unknown"}
TONE: ${tone || "unknown"}

SCRIPT EXCERPT:
${scriptExcerpt}

${principlesBlock}

${archetypePromptBlock()}

═══ NAMED-PERSON SUBJECTS — CRITICAL RULE ═══
If the primary_subject is a NAMED INDIVIDUAL HUMAN (Bernie Madoff, Elon Musk, Hitler, Putin, Epstein, etc.), you MUST set subject_is_person: true AND design the image around the PLACE/ERA/ARTIFACT, never their face. Stock photo libraries do not have specific celebrities — searching "Bernie Madoff" returns a random stock guy. Searching "Elon Musk" returns a random office worker. The viewer ends up looking at the wrong person, which destroys the thumbnail's credibility.

Instead, anchor on the SCENE:
- Bernie Madoff → 2008 Manhattan trading floor, abandoned NYC office, Wall Street at dusk
- Hitler → 1940s Berlin streets, Reichstag, Nuremberg rally architecture (no faces)
- Putin → Kremlin spires, Red Square at night, dark Russian government interior
- Elon Musk → SpaceX rocket on launchpad, Tesla factory floor, Mars Starship rendering
- Epstein → Manhattan townhouse exterior, private island aerial, prison interior

The image_prompt and photo_search_query for person-subjects must describe the SCENE — never the person. The hook text and a banner can name the person, but the image carries the place/era.

═══ HOOK CONTEXT — CRITICAL RULE ═══
Every numeric hook ($65 BILLION, 60 GALLONS, 11KM DOWN, 18 MONTHS) MUST be paired with a 1-2 word context label that tells the viewer WHAT the number measures. Without context, a number is just scroll-past noise.

GOOD: "$65 BILLION" + banner: "STOLEN" → viewer instantly understands the story
GOOD: "60 GALLONS" + banner: "PER AVOCADO" → viewer understands the comparison
GOOD: "11KM DOWN" + banner: "NO LIGHT" → viewer feels the depth
BAD: "$1.5 BILLION" with no context → viewer thinks "of what?"
BAD: "60 GALLONS" with no context → viewer has no idea what this video is about

Set hook_context to the 1-2 word "why" label. The system will auto-promote it into a banner element adjacent to the hook text. Numeric hooks without hook_context will be REJECTED and force a retry.

${retryBlock}
STEP 1 — DESIGN THE HOOK TEXT (most important decision):
Before designing anything visual, identify the PRIMARY SUBJECT of this video from the title. The hook text MUST relate to the main subject, NOT to tangential topics mentioned in the script.

For EDUCATIONAL/PHILOSOPHY content: Always include the MAIN TOPIC WORD, not just abstract concepts:
- Title: "Nihilism: The Belief in Nothing" → PRIMARY SUBJECT: NIHILISM → Hook: "NIHILISM" (the philosophy name people search for)
- Title: "What Happens When Monkeys Learn to Use Money?" → Primary subject: MONKEYS + MONEY → Hook: "MONKEY MONEY" or "$306 BANANAS"
- Title: "The Day Tesla Stock Crashed" → Primary subject: TESLA CRASH → Hook: "TESLA" + "72 HOURS"
- WRONG: "NOTHING." for nihilism video → looks like motivational content, not philosophy education
- WRONG: "EXISTENCE." for existentialism video → use "EXISTENTIALISM" instead

For educational content, the hook should help viewers FIND the content they're looking for, not just create mystery.

Now answer: what 1-2 words about the PRIMARY SUBJECT would make someone STOP SCROLLING and ask a question?

CONTEXTUAL HOOK GENERATION — CRITICAL RULE:
Before selecting hook words, detect the SPECIFIC DOMAIN from the title and use domain-appropriate terminology:
- HACKING/CYBERSECURITY: Use "UNHACKABLE", "ENCRYPTED", "BREACH", "ZERO-DAY" — NOT "IMPOSSIBLE" or "SECURE"
- PHYSICS/SCIENCE: Use scientific terms like "FUSION", "QUANTUM", "ENTROPY" — NOT generic "AMAZING" or "CRAZY"
- FINANCE/TRADING: Use "LIQUIDATED", "MARGIN CALL", "VOLATILITY" — NOT generic "CRASHED" or "FAILED"
- MILITARY/WAR: Use "CLASSIFIED", "OPERATION", "INTEL" — NOT generic "SECRET" or "HIDDEN"
- SPACE/ASTRONOMY: Use "ROGUE", "COLLISION", "ORBIT" — NOT generic "MOVING" or "COMING"
The hook must signal the correct niche immediately so viewers know what type of content they're clicking on.

The hook MUST:
- Be 1-2 words MAXIMUM. Never 3+. Single words are strongest.
- Create a SPECIFIC curiosity gap — the viewer must think "wait, what?" or "how is that possible?"
- Be a FACT, NUMBER, or PROVOCATIVE CLAIM from the video. NOT a random dramatic word.
- Use DOMAIN-SPECIFIC terminology that matches the video's actual topic area.
- Make sense ON ITS OWN without the title. Someone seeing ONLY the thumbnail text should understand the hook.

GOOD hooks (specific, create clear questions):
- "$10 BILLION" → viewer asks: what cost $10 billion?
- "FORBIDDEN." → viewer asks: what's forbidden and why?
- "60% DEAD." → viewer asks: 60% of what died?
- "UNDEFEATABLE." → viewer asks: what/who is undefeatable?
- "$306/DAY" → viewer asks: how do you make $306/day?

BAD hooks (vague, don't create questions):
- "YOU FELL" → fell where? makes no sense without context
- "ITS MOVING" → what's moving? vague nonsense
- "6 MINUTES AGO" → too many words, doesn't work as a concept
- "WHILE EVERYONE WAS SLEEPING" → that's a sentence, not a hook
- "COPIED." → copied what? no curiosity gap

Optional secondary text (1-2 words): names the SPECIFIC SUBJECT or TARGET of the hook — NOT a category label.
- "$10 BILLION" + "PENTAGON" = clear story (what cost $10 billion? The Pentagon.)
- "IT'S MOVING." + "YELLOWSTONE" = terrifying (what's moving? Yellowstone supervolcano.)
- "60% DEAD." + "COVERUP" = conspiracy intrigue (why was this covered up?)
- WRONG: "HACKED" with "6 MINUTES" — "hacked" is a category, not a target. Use "PENTAGON" or "BANK OF AMERICA" instead.
- WRONG: "ERUPTION" with "IT'S MOVING" — "eruption" restates the hook. Use the NAME of the volcano instead.
- WRONG: "FORGOTTEN" for something everyone knows (e.g. Black Death) — the secondary text must be TRUTHFUL to the video's angle.

UNUSUAL WORD RULE: If your hook uses a niche/uncommon word (e.g. "SPAGHETTIFIED", "SUBLIMATED"), MOST VIEWERS WON'T KNOW IT. You MUST do one of:
  a) Make the IMAGE visually explain the word (show something being stretched apart for "spaghettified"), OR
  b) Add secondary text that gives context ("BLACK HOLES" so they understand the topic)
  Never pair an unusual word with a generic/abstract background — that leaves the viewer confused.

AVOID OVERUSED VISUAL TROPES — CRITICAL FOR CLICK-THROUGH:
Certain visual elements are so overused they trigger instant "scroll past" reactions:
- Guy Fawkes/Anonymous masks for hacker content (use abstract digital surveillance imagery instead)
- Stock explosion photos for crisis content (use data visualizations or real satellite imagery)
- Generic "hacker in hoodie" silhouettes (use code matrices, digital fingerprints, or glitch effects)
- Typical "shocked face" expressions (use dramatic lighting or environmental reactions)
- Dollar bill stacks for money content (use specific financial instruments, charts, or luxury objects)
For ANY topic that has been covered extensively on YouTube, deliberately avoid the most obvious visual approach. The goal is to make viewers think "I haven't seen this angle before."

STEP 1.5 — ANALYZE MESSAGE TONE FOR VISUAL METAPHOR SELECTION:
Before choosing imagery, determine if this video's message is:
- HELPFUL/POSITIVE: Use discovery imagery (doors opening, lightbulbs, serendipitous moments, guiding lights)
- THREATENING/NEGATIVE: Use surveillance imagery (eyes, cameras, monitoring systems)
- MYSTERIOUS/NEUTRAL: Use abstract or ambiguous imagery

For titles about content "finding you" or "appearing when needed" — this is SERENDIPITY, not surveillance. Use imagery of:
- Doors/portals opening to reveal something valuable
- Lightbulbs/illumination moments
- Compass/navigation pointing to discovery
- Golden hour lighting suggesting perfect timing
- Books/content appearing magically
NEVER use eyes, cameras, or surveillance imagery for positive discovery content.

DISCOVERY ENHANCEMENT RULE:
Before designing composition, check if title contains discovery/revelation words: 'found', 'discovered', 'hidden', 'secret', 'revealed', 'uncovered', 'detected'.
If YES, add visual discovery elements to the composition:
- Highlight zones (colored circles/rectangles around key areas)
- Discovery markers (arrows pointing to specific features)
- Callout annotations (labels marking interesting details)
- Zoom indicators (suggesting close examination)
These elements should suggest that something SPECIFIC was discovered, not just show the subject normally.

STEP 2 — DESIGN THE COMPOSITION as a layered element array.
Canvas is 1280x720. Positions are percentages (0-100). Elements render in order (painter's algorithm).

You have UP TO 3 IMAGES available:
- "background" = main image (always available)
- "supplementary" = second image (set supplementary_query to request it)
- "third" = third image (set image_prompt_2 to request it)
Use multiple images for split, triptych, comparison, and collage layouts.

Return ONLY valid JSON:
{
  "archetype": "REQUIRED — exactly one of: ${Object.keys(ARCHETYPES).join(' | ')}. Pick the one whose contract best matches the video. The renderer will silently drop any element your archetype forbids.",
  "primary_subject": "REQUIRED — the ONE concrete searchable noun the thumbnail must visually depict. This is the named entity from the title that, if missing from the image, makes the thumbnail meaningless. Examples: 'Rome' (not 'Roman empire collapse'), 'Yellowstone' (not 'volcano'), 'Lehman Brothers' (not 'stock crash'), 'Black Death' (not 'plague'), 'Pentagon' (not 'building'). Must be 1-3 words. Will be injected into every image search query — if it can't be found in a stock photo or generated, the thumbnail fails. Pick the MOST SEARCHABLE form of the subject.",
  "subject_is_person": "REQUIRED true/false. Set to true ONLY when primary_subject is a NAMED INDIVIDUAL HUMAN (Bernie Madoff, Elon Musk, Hitler, Putin). Stock photo libraries do NOT have specific celebrities — searching 'Bernie Madoff' returns a random stock photo guy. When subject_is_person is true, you MUST design the image around the PLACE, ERA, or ARTIFACT associated with the person (Madoff → Wall Street trading floor, Hitler → 1940s Berlin, Putin → Kremlin), NOT their face. The image_prompt and photo_search_query for person-subjects must describe the SCENE, not the person.",
  "hook_context": "REQUIRED when hook_text contains a number, dollar sign, or percentage. The 1-2 word context that explains WHAT the number measures. Examples: '$65 BILLION' → hook_context: 'STOLEN' or 'VANISHED'. '60 GALLONS' → hook_context: 'PER AVOCADO'. '11KM DOWN' → hook_context: 'NO LIGHT' or 'CRUSHING'. '18 MONTHS' → hook_context: 'TO ERUPTION'. '$1.5 BILLION' → hook_context: 'NO BANK'. Without this context the viewer sees a number with no story and scrolls past. The system will REJECT the plan and force a retry if a numeric hook is missing this field. The hook_context will be rendered as a banner directly adjacent to the number — they must read as one phrase together.",
  "niche": "closest from: ${nicheList}",
  "category": "A" or "B",
  "render_mode": null for category A, or "crash_chart" | "iceberg" | "pyramid" for category B,
  "iceberg_tiers": [{"label": "Surface Web"}, {"label": "Deep Web"}, ...] (only if render_mode is "iceberg"),
  "pyramid_tiers": [{"label": "Tier 1", "color": "#cc2222"}, ...] (only if render_mode is "pyramid"),
  "composition_style": "which of the 9 styles above you're using — MUST vary per topic",
  "use_real_photo": true/false,
  "photo_search_query": "ultra-specific search if use_real_photo is true",
  "image_prompt": "cinematic AI image prompt for main image. Include: 'cinematic, dramatic lighting, 16:9, no text, no watermarks, no people, no faces'. Describe a SPECIFIC scene. IMPORTANT: specify where in the frame the main subject should be positioned to leave clear negative space for text overlay (e.g. 'subject on the right side, dark empty space on the left for text').",
  "text_safe_zone": "where text will go — e.g. 'left 40%' or 'top-right' or 'bottom bar'. The AI image should leave this area simpler/darker for text readability.",
  "supplementary_query": "second image search query, or null",
  "before_query": "ONLY for archetype=before_after. Pexels search query for the BEFORE state (problem visible). Example: 'acne face close up', 'ruined temple ancient', 'polluted river plastic waste'",
  "after_query": "ONLY for archetype=before_after. Pexels search query for the AFTER state (result visible). Example: 'clear glowing skin face', 'restored temple', 'clean river crystal water'",
  "duplicate_main_for_split": "DEPRECATED — do not use. Use before_query + after_query instead.",
  "image_prompt_2": "AI prompt for third image if needed (triptych, comparison), or null",
  "mood": "one word",
  "elements": [
    === IMAGES (can use up to 3 — place at different positions for splits/triptych) ===
    { "type": "image", "role": "background" | "supplementary" | "third", "x": 0, "y": 0, "w": 100, "h": 100, "brightness": 0.0-1.0, "face_crop": true/false }

    === OVERLAY IMAGE (places image with opacity control — for layered compositions) ===
    { "type": "overlay_image", "role": "supplementary" | "third", "x": 50, "y": 0, "w": 50, "h": 100, "opacity": 0.3, "brightness": 0.4 }

    === COLOR ZONE (colored panel — for split layouts, triptych backgrounds, data callouts) ===
    { "type": "color_zone", "color": "#1a5c2a", "x": 0, "y": 0, "w": 33, "h": 100, "opacity": 0.85, "radius": 0 }

    === GRADIENT OVERLAY ===
    { "type": "gradient", "direction": "top_to_bottom" | "left_to_right" | "bottom_to_top" | "radial_center",
      "stops": [{"pos": 0, "color": "rgba(0,0,0,0.7)"}, {"pos": 1, "color": "rgba(0,0,0,0)"}],
      "x": 0, "y": 0, "w": 100, "h": 100 }

    === FILL (solid color region) ===
    { "type": "fill", "color": "#0a0a0a", "x": 0, "y": 0, "w": 50, "h": 100 }

    === TEXT (max 2 text elements) ===
    { "type": "text", "content": "HOOK TEXT AS SINGLE UNIT", "x": 5, "y": 10, "max_w": 60, "max_h": 50,
      "align": "left" | "center" | "right", "font_size": "massive" | "large" | "medium",
      "color": "#FFFFFF", "emphasis_word": "WORD", "emphasis_color": "#cc2020",
      "use_period": true/false, "stroke": true, "subtitle": "OPTIONAL SECOND LINE" }

    === BANNER WITH TEXT (colored box with text INSIDE — always use this for secondary text) ===
    { "type": "banner", "color": "rgba(204,32,32,0.85)", "x": 5, "y": 75, "w": 30, "h": 12, "radius": 4, "banner_text": "LEHMAN" }
    IMPORTANT: Always use banner_text to put text INSIDE the banner. This guarantees alignment. Do NOT use a separate text element for banner text.

    === ANNOTATION ELEMENTS (for data callouts, infographic style) ===
    { "type": "arrow", "x": 30, "y": 50, "x2": 60, "y2": 30, "color": "#FF0000", "width": 4, "head_size": 16 }
    { "type": "circle", "x": 45, "y": 40, "w": 20, "h": 20, "radius_pct": 8, "color": "#FF0000", "width": 3, "fill_color": "rgba(255,0,0,0.15)" }

    === SKIN DAMAGE ("before" side — adds blemishes while keeping FULL COLOR) ===
    { "type": "desaturate", "x": 0, "y": 0, "w": 50, "h": 100 }
    NEVER makes the image greyscale/black-and-white. Keeps full color but adds: red acne spots, uneven skin tone, redness patches, dullness. The "before" side must be IN COLOR showing visible skin problems.

    === WARM GLOW ("after" side — healthy radiant skin) ===
    { "type": "warm_glow", "x": 50, "y": 0, "w": 50, "h": 100, "intensity": 0.5 }
    Adds: golden warmth, brightness boost, saturation increase. Smooth glowing skin.

    BEFORE/AFTER RULE: For transformation thumbnails (skin, body, weight loss, ruined-vs-restored buildings, polluted-vs-clean rivers, etc.):
    - Set archetype: "before_after"
    - Set use_real_photo: true (AI image generation CANNOT produce matched transformations — always use stock photos)
    - Set before_query: a Pexels search query for the "problem" state. Examples: "acne face close up", "overweight stomach", "ruined ancient temple", "polluted river plastic"
    - Set after_query: a Pexels search query for the "result" state. Examples: "clear glowing skin face", "fit muscular abs", "restored ancient temple", "clean river crystal water"
    - The renderer will run TWO separate Pexels searches and composite them side by side. Two distinct real photos, no filter hacks.
    - Place background image on LEFT (x:0, w:50, role: background) and supplementary on RIGHT (x:50, w:50, role: supplementary)
    - Add a white divider at position 50
    - DO NOT use "desaturate" or "warm_glow" elements — these are deprecated filter hacks. The two distinct photos do the work.
    - DO NOT set duplicate_main_for_split — that is also deprecated.
    - Both photos must clearly depict the same SUBJECT TYPE (both faces, both buildings, both stomachs) so the comparison is legible at mobile scale.

    === VIGNETTE === { "type": "vignette", "strength": 0.3-0.7, "x": 50, "y": 50 }
    === DIVIDER === { "type": "divider", "orientation": "vertical" | "horizontal", "position": 50, "color": "#FFFFFF", "width": 4 }
  ],
  "color_grade": { "saturation": 1.0-1.4, "contrast": 1.0-1.3, "warmth": "warm" | "cool" | "neutral" },
  "click_triggers": ["2-3 psychological triggers"],
  "emotion": "the ONE emotion: dread, curiosity, aspiration, shock, envy, fear, etc.",
  "first_impression_168px": "what the viewer sees first at mobile size — 5 words max",
  "why": "Answer all 5 design thinking questions. What emotion, what clicks first, what psychological vulnerability, what survives at 168px, and did you audit every element?"
}

NON-NEGOTIABLE RULES:
1. HOOK TEXT: Maximum 2 words. Must create a SPECIFIC curiosity gap. Must make sense without the video title.
2. SECONDARY TEXT: Maximum 2 words. Optional. Must name the SPECIFIC SUBJECT/TARGET (a place, person, organization, object), NOT a category label. The banner is the PUNCHLINE — high-contrast, never blend into dark background.
3. COLORS: Maximum TWO text colors — white + ONE accent (red, green, gold, or yellow). Banner text ALWAYS white/light on colored background.
4. TEXT ELEMENTS: One "text" element for the primary hook (massive). For secondary text, use banner_text property on the banner element — NOT a separate text element. This guarantees the text is inside the banner box.
5. FONT SIZE: Primary hook is ALWAYS "massive".
6. FACELESS: No people or faces in image prompts.
7. GRAMMAR: Check apostrophes (IT'S not ITS), spelling, punctuation.
8. COMPLETE STORY: Hook text + secondary text + image must tell a complete story together. A number alone ("35,000") means NOTHING — 35,000 what? Always pair numbers with what they measure. Either include the unit in the hook ("35,000 PCs") or put it in the banner_text ("COMPUTERS").
9. NO DEFAULT LAYOUT: You MUST NOT use "big text top-left + red banner bottom-left + full-bleed dark image" for every thumbnail. Each thumbnail must have a composition designed for its SPECIFIC topic. Vary: text position, text alignment, number of images, use of color zones.
10. ANNOTATIONS MUST HIGHLIGHT SOMETHING: If you use circle or arrow elements, they MUST point to something specific and meaningful in the image (fire, destruction, a key object). An annotation pointing at empty dark space is worse than no annotation. If nothing specific to annotate, don't use annotations.
11. BANNER COLORS: All banners in a single thumbnail should use the SAME color scheme (e.g. all red). Don't mix red and gold/orange banners. Consistency.
12. BANNER VISIBILITY: Must be clearly readable at mobile thumbnail size. White text on bold opaque banner = good.
13. ALWAYS INCLUDE TEXT: Every thumbnail MUST have at least one hook word.
14. CATEGORY B ROUTING: If this thumbnail needs a financial chart, iceberg diagram, or pyramid — set category to "B" and use the appropriate render_mode. For icebergs: generate a realistic underwater iceberg IMAGE, labels are overlaid programmatically. Do NOT add extra banners that compete with the iceberg labels — the labels ARE the content. Only add the main hook text (e.g. "FORBIDDEN.") in one corner.
15. TEXT SPACING: If your hook text has multiple words (e.g. "$639 BILLION"), put them as ONE text element content string — NOT as separate text elements that might overlap. The renderer will handle line wrapping.
16. TEST: "If I put this thumbnail next to the other 4 in this batch, would it look DIFFERENT?" If no, redesign.`
    }]
  });

  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const plan = JSON.parse(jsonMatch[0]);

    // Validate niche — RESPECT the caller's hint when valid. Claude's
    // auto-detection routinely picks "education" for everything; the caller
    // (autonomous loop, batch test, live order) usually has better signal.
    // Aliases map reference-library niches to NICHES const entries when the
    // const doesn't have a direct match (science/military/retirement exist
    // as reference dirs but not as NICHES keys).
    const NICHE_ALIASES = {
      science: "tech",
      self_improvement: "health",
      military: "history",
      retirement: "finance",
    };
    const resolveNiche = (n) => {
      if (!n) return null;
      if (NICHES[n]) return n;
      if (NICHE_ALIASES[n] && NICHES[NICHE_ALIASES[n]]) return NICHE_ALIASES[n];
      return null;
    };
    const callerNiche = resolveNiche(niche);
    if (callerNiche) {
      if (plan.niche !== callerNiche) {
        console.log(`  [Niche] Caller specified "${niche}" → resolved to "${callerNiche}", overriding planner's "${plan.niche || 'unknown'}"`);
      }
      plan.niche = callerNiche;
      // Stash the original niche so the structural scorer can use the matching
      // reference distribution (science → science refs, not tech refs)
      plan._reference_niche = niche;
    } else if (!NICHES[plan.niche]) {
      plan.niche = "education";
    }

    // Validate primary_subject — fallback extractor if Claude omits or fails it.
    // Pick the longest run of capitalized words from the title that isn't a
    // stopword. This is a coarse heuristic but recovers Rome/Yellowstone/Pentagon
    // class subjects reliably.
    if (!plan.primary_subject || typeof plan.primary_subject !== "string" || plan.primary_subject.trim().length === 0) {
      const STOP = new Set(["The", "A", "An", "Of", "In", "On", "And", "Or", "But", "For", "To", "Why", "How", "What", "When", "Where", "This", "That", "It", "Its", "It's", "Is", "Are", "Was", "Were", "Be", "Been", "Has", "Have", "Had", "Will", "Would", "Could", "Should", "I", "You", "We", "They", "He", "She"]);
      const words = title.split(/\s+/);
      const runs = [];
      let cur = [];
      for (const w of words) {
        const clean = w.replace(/[^A-Za-z']/g, "");
        if (clean && /^[A-Z]/.test(clean) && !STOP.has(clean)) {
          cur.push(clean);
        } else {
          if (cur.length) runs.push(cur);
          cur = [];
        }
      }
      if (cur.length) runs.push(cur);
      runs.sort((a, b) => b.length - a.length);
      plan.primary_subject = runs[0] ? runs[0].slice(0, 3).join(" ") : title.split(/\s+/).slice(0, 2).join(" ");
      console.log("  [Subject] Planner omitted primary_subject — extracted from title: \"" + plan.primary_subject + "\"");
    } else {
      console.log("  [Subject] " + plan.primary_subject);
    }

    // If Claude returned elements array, validate it
    if (plan.elements && Array.isArray(plan.elements)) {
      // Ensure all elements have valid types
      const validTypes = ["image", "fill", "gradient", "text", "banner", "vignette", "divider", "overlay_image", "arrow", "circle", "color_zone", "desaturate", "warm_glow"];
      plan.elements = plan.elements.filter(el => validTypes.includes(el.type));
      if (plan.elements.length === 0) {
        console.log("  [Analysis] Elements array was empty after validation, falling back");
        plan.elements = null;
      }
    }

    // Apply archetype contract — drops elements forbidden by the chosen archetype
    // and reports violations so the retry logic can react.
    if (plan.elements && Array.isArray(plan.elements)) {
      const { dropped, violations } = applyArchetypeContract(plan);
      if (dropped.length) console.log("  [Archetype] " + plan.archetype + " — dropped: " + dropped.join(", "));
      if (violations.length) {
        console.log("  [Archetype] VIOLATIONS:");
        for (const v of violations) console.log("    ✗ " + v);
        plan._archetype_violations = violations;
      } else {
        console.log("  [Archetype] " + plan.archetype + " — contract OK (" + plan.elements.length + " elements)");
      }
    }

    // NAMED-PERSON SUBJECT HANDLING — Pexels/Brave do not have specific
    // celebrity photos. Searching "Bernie Madoff" returns a random stock guy.
    // When subject is a named individual, force the image to depict the
    // place/era/artifact associated with them, not their face. We rewrite
    // the photo_search_query to remove the person and add the scene anchor
    // if the planner didn't already do it.
    const detectPersonName = (s) => {
      if (!s) return false;
      // Heuristic: 2-3 capitalized words, not all-uppercase, none of which are common nouns
      const words = s.trim().split(/\s+/);
      if (words.length < 1 || words.length > 4) return false;
      const COMMON = new Set(["Yellowstone", "Pentagon", "Rome", "Berlin", "Wall", "Street", "Earth", "Mars", "Trench", "Marianas", "Mariana", "Avocado", "North", "South", "East", "West", "Korea", "China", "Russia", "America"]);
      let nameLikeWords = 0;
      for (const w of words) {
        if (/^[A-Z][a-z]+$/.test(w) && !COMMON.has(w)) nameLikeWords++;
      }
      return nameLikeWords >= words.length - 1 && nameLikeWords >= 1;
    };
    if (plan.subject_is_person === undefined) {
      plan.subject_is_person = detectPersonName(plan.primary_subject);
      if (plan.subject_is_person) {
        console.log("  [Person] Auto-detected named person: \"" + plan.primary_subject + "\" — image will depict context, not face");
      }
    } else if (plan.subject_is_person === true) {
      console.log("  [Person] Planner flagged subject as named person — image will depict context, not face");
    }

    // HOOK CONTEXT VALIDATION — Niels feedback: numeric hooks without context
    // are scroll-past garbage. "$65 BILLION" works because MADOFF is right next
    // to it. "$1.5B" fails because the viewer has no idea what it measures.
    const textElements = (plan.elements || []).filter(e => e.type === 'text');
    const hookText = textElements[0]?.content || plan.hook_text || '';
    const hasNumberHook = /[\d$%]/.test(hookText);
    const hookViolations = [];
    if (hasNumberHook) {
      const hasContext = !!plan.hook_context && plan.hook_context.trim().length > 0;
      // Also accept it if there's already a banner with banner_text providing context
      const banners = (plan.elements || []).filter(e => e.type === 'banner' && e.banner_text);
      const hasContextBanner = banners.some(b => b.banner_text.trim().length > 0);
      if (!hasContext && !hasContextBanner) {
        hookViolations.push(`Numeric hook "${hookText}" has no hook_context label and no context banner. Viewer will see a number with no story.`);
      }
    }
    if (hookViolations.length) {
      console.log("  [HookContext] VIOLATIONS:");
      for (const v of hookViolations) console.log("    ✗ " + v);
      plan._hook_violations = hookViolations;
    } else if (hasNumberHook) {
      console.log("  [HookContext] OK — numeric hook \"" + hookText + "\" has context: \"" + (plan.hook_context || banners.map(b => b.banner_text).join(', ')) + "\"");
    }

    // Auto-promote hook_context into a banner element if planner provided
    // the field but didn't add a corresponding banner element. This makes
    // hook_context a guarantee, not a hope.
    if (hasNumberHook && plan.hook_context && plan.hook_context.trim() && plan.elements) {
      const banners2 = plan.elements.filter(e => e.type === 'banner');
      const alreadyShown = banners2.some(b => (b.banner_text || '').toUpperCase().includes(plan.hook_context.toUpperCase()));
      if (!alreadyShown) {
        // Find the primary text element to position the banner adjacent to it
        const primaryText = plan.elements.find(e => e.type === 'text');
        const bannerY = primaryText ? Math.min(95, (primaryText.y || 15) + 20) : 75;
        plan.elements.push({
          type: 'banner',
          color: 'rgba(204,32,32,0.92)',
          x: primaryText ? primaryText.x || 5 : 5,
          y: bannerY,
          w: 40,
          h: 10,
          radius: 4,
          banner_text: plan.hook_context.toUpperCase().substring(0, 24),
          _auto_promoted: true,
        });
        console.log("  [HookContext] Auto-promoted hook_context \"" + plan.hook_context + "\" into a banner element adjacent to the hook");
      }
    }

    // Legacy layout validation (only used as fallback if no elements)
    if (!plan.elements) {
      const validLayouts = ["split_image_text", "full_bleed_text", "bold_center_text", "dual_image", "icon_grid"];
      if (!validLayouts.includes(plan.layout)) {
        plan.layout = NICHES[plan.niche]?.layouts?.[0] || "full_bleed_text";
      }
    }

    return plan;
  } catch (e) {
    console.log("  [Analysis] Claude parse failed: " + e.message + ", using defaults");
    return {
      niche: niche && NICHES[niche] ? niche : "education",
      hook_text: title.split(" ").slice(0, 4).join(" ").toUpperCase(),
      secondary_text: null,
      image_prompt: `cinematic illustration of ${title}, dramatic lighting, vibrant colors`,
      supplementary_query: title,
      color_grade: { saturation: 1.2, contrast: 1.1, warmth: "neutral" },
      text_color: "#FFFFFF",
      text_stroke: true,
      palette_index: 0,
      layout: "full_bleed_text",
      mood: "dramatic",
      visual_elements: [],
      why: "fallback",
    };
  }
}

// ─── IMAGE GENERATION — Recraft V3 via fal.ai ──────────────────────────────────
// $0.04/image, best-in-class text rendering, 16:9 native support
async function generateRecraftImage(prompt, style = "digital_illustration") {
  if (!FAL_KEY) { console.log("  [Image] No FAL_KEY set"); return null; }

  const validStyles = [
    "digital_illustration", "realistic_image", "vector_illustration",
  ];
  if (!validStyles.includes(style)) style = "digital_illustration";

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`  [Image] Recraft V3 attempt ${attempt}/3...`);
    try {
      const r = await axios.post(
        "https://queue.fal.run/fal-ai/recraft-v3",
        {
          prompt,
          image_size: "landscape_16_9",
          style,
          num_images: 1,
        },
        {
          headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" },
          timeout: 120000,
        }
      );

      // Handle async queue
      const rid = r.data.request_id;
      if (!rid) {
        const images = r.data.images || r.data.output?.images;
        if (images && images.length > 0) return images[0].url;
        continue;
      }

      console.log("  [Image] Queued, polling...");
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 2000));
        try {
          const s = await axios.get(
            `https://queue.fal.run/fal-ai/recraft-v3/requests/${rid}/status`,
            { headers: { Authorization: "Key " + FAL_KEY }, timeout: 10000 }
          );
          if (s.data.status === "COMPLETED") {
            const r2 = await axios.get(
              `https://queue.fal.run/fal-ai/recraft-v3/requests/${rid}`,
              { headers: { Authorization: "Key " + FAL_KEY }, timeout: 15000 }
            );
            const images = r2.data.images || r2.data.output?.images;
            if (images && images.length > 0) {
              console.log("  [Image] Recraft V3 done");
              return images[0].url;
            }
          }
          if (s.data.status === "FAILED") { console.log("  [Image] Recraft V3 failed"); break; }
        } catch (e) { /* polling retry */ }
      }
    } catch (e) {
      console.log(`  [Image] Attempt ${attempt} error: ${e.message}`);
    }
  }

  console.log("  [Image] All Recraft V3 attempts failed");
  return null;
}

// ─── Fallback: Flux Pro 1.1 ────────────────────────────────────────────────────
async function generateFluxImage(prompt) {
  if (!FAL_KEY) return null;
  console.log("  [Image] Falling back to Flux Pro 1.1...");

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await axios.post(
        "https://queue.fal.run/fal-ai/flux-pro/v1.1",
        { prompt, image_size: { width: 1280, height: 720 }, num_images: 1, enable_safety_checker: true },
        { headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" }, timeout: 120000 }
      );
      const rid = r.data.request_id;
      if (!rid) {
        const im = r.data.images || r.data.output?.images;
        if (im && im.length > 0) return im[0].url;
        continue;
      }
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 2000));
        try {
          const s = await axios.get(
            `https://queue.fal.run/fal-ai/flux-pro/requests/${rid}/status`,
            { headers: { Authorization: "Key " + FAL_KEY }, timeout: 10000 }
          );
          if (s.data.status === "COMPLETED") {
            const r2 = await axios.get(
              `https://queue.fal.run/fal-ai/flux-pro/requests/${rid}`,
              { headers: { Authorization: "Key " + FAL_KEY }, timeout: 15000 }
            );
            const im = r2.data.images || r2.data.output?.images;
            if (im && im.length > 0) { console.log("  [Image] Flux Pro done"); return im[0].url; }
          }
          if (s.data.status === "FAILED") break;
        } catch (e) { /* polling retry */ }
      }
    } catch (e) { console.log(`  [Image] Flux attempt ${attempt} error: ${e.message}`); }
  }
  return null;
}

// ─── Real photo search — multi-source best match ────────────────────────────────
// Searches Pexels + Brave for real photographs. Used when use_real_photo=true.
// Returns the best quality match across all sources.
async function searchRealPhoto(query, label = "Photo") {
  if (!query) return null;
  const candidates = [];

  // Search Pexels — best for high-res landscape photography
  if (PEXELS_API_KEY) {
    try {
      const r = await axios.get("https://api.pexels.com/v1/search", {
        params: { query, per_page: 5, orientation: "landscape" },
        headers: { Authorization: PEXELS_API_KEY },
        timeout: 10000,
      });
      for (const photo of (r.data.photos || [])) {
        if (photo.width >= 1000 && photo.height >= 500) {
          candidates.push({
            url: photo.src.large2x || photo.src.large,
            width: photo.width,
            height: photo.height,
            source: "pexels",
            score: photo.width * photo.height, // prefer highest resolution
          });
        }
      }
      if (candidates.length > 0) {
        console.log(`  [${label}] Pexels: ${candidates.length} candidates`);
      }
    } catch (e) { /* continue */ }
  }

  // Search Brave Images — good for specific landmarks/locations
  if (BRAVE_API_KEY) {
    try {
      const r = await axios.get("https://api.search.brave.com/res/v1/images/search", {
        params: { q: query + " high resolution landscape photo", count: 5, safesearch: "strict" },
        headers: { "X-Subscription-Token": BRAVE_API_KEY, Accept: "application/json" },
        timeout: 10000,
      });
      for (const result of (r.data.results || [])) {
        const url = result.properties?.url;
        const w = result.width || 0;
        const h = result.height || 0;
        if (url && w >= 800 && h >= 400) {
          candidates.push({ url, width: w, height: h, source: "brave", score: w * h });
        }
      }
      if (candidates.filter(c => c.source === "brave").length > 0) {
        console.log(`  [${label}] Brave: ${candidates.filter(c => c.source === "brave").length} candidates`);
      }
    } catch (e) { /* continue */ }
  }

  if (candidates.length === 0) {
    console.log(`  [${label}] No real photos found for: ${query}`);
    return null;
  }

  // Sort by resolution (highest first) and prefer Pexels (more reliable URLs)
  candidates.sort((a, b) => {
    if (a.source === "pexels" && b.source !== "pexels") return -1;
    if (b.source === "pexels" && a.source !== "pexels") return 1;
    return b.score - a.score;
  });

  const best = candidates[0];
  console.log(`  [${label}] Best: ${best.source} ${best.width}x${best.height}`);
  return best.url;
}

// Simple supplementary search (smaller, secondary image)
async function searchSupplementaryImage(query) {
  return searchRealPhoto(query, "Supplementary");
}

// ─── Download image to buffer ───────────────────────────────────────────────────
async function downloadImage(url) {
  try {
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    const buf = Buffer.from(r.data);

    // Detect format from magic bytes
    const isWebP = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
    const isJFIF = buf[0] === 0xFF && buf[1] === 0xD8;
    const isPNG = buf[0] === 0x89 && buf[1] === 0x50;

    if (isPNG || isJFIF) {
      return await loadImage(buf);
    }

    if (isWebP) {
      // node-canvas can't handle WebP — convert via temp file + external tool
      const tmpIn = "/tmp/thumb-dl-" + Date.now() + ".webp";
      const tmpOut = tmpIn.replace(".webp", ".png");
      fs.writeFileSync(tmpIn, buf);
      const { execSync } = await import("child_process");
      try {
        execSync(`convert "${tmpIn}" "${tmpOut}"`, { timeout: 10000 });
        const pngBuf = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
        return await loadImage(pngBuf);
      } catch (convErr) {
        // Try dwebp as fallback
        try {
          execSync(`dwebp "${tmpIn}" -o "${tmpOut}"`, { timeout: 10000 });
          const pngBuf = fs.readFileSync(tmpOut);
          fs.unlinkSync(tmpIn);
          fs.unlinkSync(tmpOut);
          return await loadImage(pngBuf);
        } catch (e2) {
          console.log("  [Download] WebP conversion failed — install imagemagick or webp");
          try { fs.unlinkSync(tmpIn); } catch (e) {}
          try { fs.unlinkSync(tmpOut); } catch (e) {}
        }
      }
    }

    // Try loading as-is anyway
    return await loadImage(buf);
  } catch (e) {
    console.log("  [Download] Failed: " + e.message);
    return null;
  }
}

// ─── TEXT RENDERING ─────────────────────────────────────────────────────────────
// Professional YouTube-style text with outlines, shadows, and proper sizing

// Measure and wrap text into lines at a given font size
function wrapText(ctx, words, maxWidth, fontSize, fontFamily) {
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Draw a single text block with optional emphasis word (one-red-word technique)
// Returns { fontSize, totalHeight } for positioning secondary text
function drawTextBlock(ctx, text, x, y, maxWidth, maxHeight, color, useStroke, align = "left", startFontSize = 200, emphasisWord = null, emphasisColor = null, textSafeZone = null) {
  const words = text.toUpperCase().split(" ");
  const fontFamily = "Bebas Neue, Impact, Arial Black";

  // Find optimal font size — start BIG and shrink until it fits
  // YouTube thumbnails need MASSIVE text that's readable at 168x94px
  let fontSize = startFontSize;
  let lines = [];

  while (fontSize >= 80) {
    lines = wrapText(ctx, words, maxWidth, fontSize, fontFamily);
    const totalHeight = lines.length * (fontSize * 1.05);
    if (totalHeight <= maxHeight && lines.every(l => {
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      return ctx.measureText(l).width <= maxWidth;
    })) {
      break;
    }
    fontSize -= 4;
  }

  const lineHeight = fontSize * 1.0; // Tight line spacing like real YouTube thumbnails
  const totalTextHeight = lines.length * lineHeight;
  const startY = y + (maxHeight - totalTextHeight) / 2 + fontSize * 0.85;

  ctx.font = `bold ${fontSize}px ${fontFamily}`;

  // Normalize emphasis word for matching
  const emphasisUpper = emphasisWord ? emphasisWord.toUpperCase().replace(/[^A-Z0-9$]/g, "") : null;

  for (let i = 0; i < lines.length; i++) {
    const ly = startY + i * lineHeight;
    let lx = x;

    // Handle alignment
    if (align === "center") {
      const w = ctx.measureText(lines[i]).width;
      lx = x + (maxWidth - w) / 2;
    }

    // Check if this line contains the emphasis word — if so, render word-by-word
    const lineWords = lines[i].split(" ");
    const hasEmphasis = emphasisUpper && lineWords.some(w => w.replace(/[^A-Z0-9$]/g, "") === emphasisUpper);

    if (hasEmphasis && emphasisColor) {
      // Word-by-word rendering for emphasis (ONE RED WORD technique)
      let curX = lx;
      for (let w = 0; w < lineWords.length; w++) {
        const word = lineWords[w];
        const wordClean = word.replace(/[^A-Z0-9$]/g, "");
        const isEmphasis = wordClean === emphasisUpper;
        const wordColor = isEmphasis ? emphasisColor : color;
        const wordStr = w < lineWords.length - 1 ? word + " " : word;

        ctx.save();
        ctx.font = `bold ${fontSize}px ${fontFamily}`;

        if (useStroke) {
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = Math.max(24, fontSize * 0.24);
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeText(wordStr, curX, ly);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        ctx.fillStyle = wordColor;
        ctx.fillText(wordStr, curX, ly);
        curX += ctx.measureText(wordStr).width;
        ctx.restore();
      }
    } else {
      // Standard single-color line rendering
      ctx.save();

      if (useStroke) {
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Thick outline for readability — needs to survive at 168x94px mobile
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.max(8, fontSize * 0.08);
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(lines[i], lx, ly);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.fillStyle = color;
      ctx.fillText(lines[i], lx, ly);

      ctx.restore();
    }
  }

  return { fontSize, totalHeight: totalTextHeight, startY, endY: startY + (lines.length - 1) * lineHeight };
}

// Draw primary + optional secondary text with creative synthesis features:
// - emphasis_word: renders ONE word in accent color (the "one red word" technique)
// - use_period: appends "." to hook text for finality effect
function drawThumbnailText(ctx, text, secondaryText, x, y, maxWidth, maxHeight, plan, palette) {
  const textColor = plan.text_color || palette.text || "#FFFFFF";
  const useStroke = plan.text_stroke !== false;
  const emphasisWord = plan.emphasis_word || null;
  const emphasisColor = palette.accent || "#FF1744";

  // Apply period finality technique if Claude decided to use it
  let hookText = text;
  if (plan.use_period === true && !text.endsWith(".")) {
    hookText = text + ".";
  }

  if (secondaryText) {
    // Two-tier: primary gets ~70% of height, secondary gets ~25%
    // Primary text should DOMINATE the frame
    const primaryHeight = maxHeight * 0.68;
    const secondaryHeight = maxHeight * 0.28;
    const gap = maxHeight * 0.04;

    const align = plan.layout === "full_bleed_text" || plan.layout === "bold_center_text" ? "center" : "left";

    const primary = drawTextBlock(ctx, hookText, x, y, maxWidth, primaryHeight, textColor, useStroke, align, 200, emphasisWord, emphasisColor);
    // Secondary text renders in accent color — no emphasis word needed (it IS the accent)
    const secondaryFontSize = Math.round(primary.fontSize * 0.65);
    drawTextBlock(ctx, secondaryText, x, y + primaryHeight + gap, maxWidth, secondaryHeight, emphasisColor, useStroke, align, secondaryFontSize);
  } else {
    // No secondary — primary text gets the ENTIRE space to be as big as possible
    const align = plan.layout === "full_bleed_text" || plan.layout === "bold_center_text" ? "center" : "left";
    drawTextBlock(ctx, hookText, x, y, maxWidth, maxHeight, textColor, useStroke, align, 220, emphasisWord, emphasisColor);
  }
}

// ─── LAYOUT RENDERERS ───────────────────────────────────────────────────────────

// Layout 1: Image on one side, bold text on the other
function layoutSplitImageText(ctx, mainImage, suppImage, text, palette, plan) {
  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, palette.bg);
  grad.addColorStop(1, shiftColor(palette.bg, 20));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Image always on the right for consistency — text reads left-to-right
  if (mainImage) {
    // Image covers right ~55%
    const imgX = WIDTH * 0.42;

    ctx.save();
    ctx.beginPath();
    // Diagonal cut for visual interest
    ctx.moveTo(imgX + 60, 0);
    ctx.lineTo(WIDTH, 0);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(imgX - 30, HEIGHT);
    ctx.closePath();
    ctx.clip();
    drawCover(ctx, mainImage, imgX - 40, 0, WIDTH - imgX + 40, HEIGHT);
    ctx.restore();

    // Gradient fade from left (dark) into image
    const fadeGrad = ctx.createLinearGradient(imgX - 60, 0, imgX + 100, 0);
    fadeGrad.addColorStop(0, palette.bg);
    fadeGrad.addColorStop(1, "transparent");
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Accent glow behind text area
  const glowGrad = ctx.createRadialGradient(WIDTH * 0.2, HEIGHT * 0.5, 0, WIDTH * 0.2, HEIGHT * 0.5, 350);
  glowGrad.addColorStop(0, hexToRgba(palette.accent, 0.06));
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, WIDTH * 0.5, HEIGHT);

  // Text on the left — take up nearly half the canvas
  drawThumbnailText(ctx, text, plan.secondary_text, 40, 20, WIDTH * 0.48, HEIGHT - 40, plan, palette);

  // Accent bar on far left edge
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, 8, HEIGHT);
}

// Layout 2: Full-bleed image with text overlay
// Reference: travel-01 (text over scenic photo, minimal darkening)
// Reference: science-01 (ENTROPY over colorful explosion)
function layoutFullBleedText(ctx, mainImage, suppImage, text, palette, plan) {
  if (mainImage) {
    drawCover(ctx, mainImage, 0, 0, WIDTH, HEIGHT);

    // For bright/travel images: NO full-canvas overlay. The image IS the thumbnail.
    // Only add a subtle darkening band behind where text will go (center zone)
    const isDark = plan.mood === "dark" || plan.mood === "mysterious" || plan.mood === "ominous";

    if (isDark) {
      // Dark niches: very light overall overlay only
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    // Focused text shadow zone — only darken where text actually sits
    // This preserves the image everywhere else
    const textZone = ctx.createLinearGradient(0, HEIGHT * 0.2, 0, HEIGHT * 0.85);
    textZone.addColorStop(0, "rgba(0,0,0,0.0)");
    textZone.addColorStop(0.15, "rgba(0,0,0,0.35)");
    textZone.addColorStop(0.5, "rgba(0,0,0,0.45)");
    textZone.addColorStop(0.85, "rgba(0,0,0,0.35)");
    textZone.addColorStop(1, "rgba(0,0,0,0.0)");
    ctx.fillStyle = textZone;
    ctx.fillRect(0, HEIGHT * 0.2, WIDTH, HEIGHT * 0.65);

  } else {
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, palette.bg);
    grad.addColorStop(0.5, shiftColor(palette.bg, 15));
    grad.addColorStop(1, palette.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Text centered — give it most of the canvas (text IS the thumbnail at mobile scale)
  drawThumbnailText(ctx, text, plan.secondary_text, 50, HEIGHT * 0.08, WIDTH - 100, HEIGHT * 0.84, plan, palette);
}

// Layout 3: Bold centered text with background image visible
// Reference: science-01 (ENTROPY over colorful visual), education-01 (100 over globe)
function layoutBoldCenterText(ctx, mainImage, suppImage, text, palette, plan) {
  if (mainImage) {
    // Draw the image FIRST at decent visibility
    drawCover(ctx, mainImage, 0, 0, WIDTH, HEIGHT);

    // Moderate overlay — darken enough for text but keep image visible
    const isDark = plan.mood === "dark" || plan.mood === "mysterious" || plan.mood === "ominous";
    const overlayAlpha = isDark ? 0.45 : 0.3;
    ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Subtle accent glow from center
    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, 400);
    glow.addColorStop(0, hexToRgba(palette.accent, 0.06));
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    // No image — dark gradient background
    const grad = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 0, WIDTH / 2, HEIGHT / 2, 600);
    grad.addColorStop(0, shiftColor(palette.bg, 25));
    grad.addColorStop(1, palette.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Big centered text — fill the frame aggressively
  drawThumbnailText(ctx, text, plan.secondary_text, 50, 30, WIDTH - 100, HEIGHT - 60, plan, palette);
}

// Layout 4: Two images side by side with text overlay
function layoutDualImage(ctx, mainImage, suppImage, text, palette, plan) {
  // Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (mainImage && suppImage) {
    // Left image
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, WIDTH * 0.5 - 4, HEIGHT);
    ctx.clip();
    drawCover(ctx, mainImage, 0, 0, WIDTH * 0.5, HEIGHT);
    ctx.restore();

    // Right image
    ctx.save();
    ctx.beginPath();
    ctx.rect(WIDTH * 0.5 + 4, 0, WIDTH * 0.5, HEIGHT);
    ctx.clip();
    drawCover(ctx, suppImage, WIDTH * 0.5 + 4, 0, WIDTH * 0.5, HEIGHT);
    ctx.restore();

    // Center divider
    ctx.fillStyle = palette.accent;
    ctx.fillRect(WIDTH * 0.5 - 3, 0, 6, HEIGHT);
  } else if (mainImage) {
    drawCover(ctx, mainImage, 0, 0, WIDTH, HEIGHT);
  }

  // Dark gradient overlay for text
  const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  overlay.addColorStop(0, "rgba(0,0,0,0.6)");
  overlay.addColorStop(0.3, "rgba(0,0,0,0.1)");
  overlay.addColorStop(0.7, "rgba(0,0,0,0.1)");
  overlay.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Text across both images
  drawThumbnailText(ctx, text, plan.secondary_text, 60, HEIGHT * 0.05, WIDTH - 120, HEIGHT * 0.45, plan, palette);
}

// Layout 5: Full-bleed image with bold text overlay (improved icon_grid)
// No more bordered boxes — image fills the entire canvas like real thumbnails
function layoutIconGrid(ctx, mainImage, suppImage, text, palette, plan) {
  if (mainImage) {
    // Full bleed image — the image IS the background
    drawCover(ctx, mainImage, 0, 0, WIDTH, HEIGHT);

    // Gradient overlay from left for text readability
    const fadeGrad = ctx.createLinearGradient(0, 0, WIDTH * 0.35, 0);
    fadeGrad.addColorStop(0, "rgba(0,0,0,0.7)");
    fadeGrad.addColorStop(0.6, "rgba(0,0,0,0.3)");
    fadeGrad.addColorStop(1, "rgba(0,0,0,0.0)");
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, palette.bg);
    grad.addColorStop(1, shiftColor(palette.bg, 15));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Text on the left — BIG and bold, no box borders
  drawThumbnailText(ctx, text, plan.secondary_text, 40, 30, WIDTH * 0.55, HEIGHT - 60, plan, palette);
}

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────────

function drawCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawFaceCrop(ctx, img, x, y, w, h) {
  // For face photos: crop from the center-top area (face region)
  // Use a taller crop window shifted upward to capture the face
  const targetRatio = w / h;
  let sw, sh, sx, sy;

  // Calculate source dimensions to fill the target area
  if (img.width / img.height > targetRatio) {
    // Image is wider than target — crop sides, keep full height
    sh = img.height;
    sw = sh * targetRatio;
    sx = (img.width - sw) / 2; // Center horizontally
    sy = 0; // Start from top (where face is)
  } else {
    // Image is taller than target — crop bottom, keep full width
    sw = img.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = img.height * 0.05; // Start slightly below top (forehead to chin)
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shiftColor(hex, amount) {
  let r = parseInt(hex.slice(1, 3), 16) + amount;
  let g = parseInt(hex.slice(3, 5), 16) + amount;
  let b = parseInt(hex.slice(5, 7), 16) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── LAYOUT DISPATCHER ─────────────────────────────────────────────────────────

const LAYOUT_FUNCTIONS = {
  split_image_text: layoutSplitImageText,
  full_bleed_text: layoutFullBleedText,
  bold_center_text: layoutBoldCenterText,
  dual_image: layoutDualImage,
  icon_grid: layoutIconGrid,
};

// ─── PROGRAMMATIC RENDERERS (Category B) ────────────────────────────────────────
// For structured/data visuals that AI image generators cannot produce:
// charts, infographics, icebergs, pyramids, annotated diagrams.
// AI generates background textures only; all structure is drawn with canvas.

function renderCrashChart(ctx, plan) {
  const W = WIDTH, H = HEIGHT;
  const fontFamily = "Bebas Neue, Impact, Arial Black";

  // Dark background
  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, 0, W, H);

  // Subtle grid — barely visible, just enough to suggest a chart
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = (H / 6) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Generate crash curve — BOLD, simple, dramatic
  const points = [];
  const segments = 80;
  const peakX = Math.floor(segments * 0.45); // peak at 45% — more room for the crash
  for (let i = 0; i <= segments; i++) {
    const xRatio = i / segments;
    let yRatio;
    if (i <= peakX) {
      const progress = i / peakX;
      yRatio = 0.65 - progress * 0.45 + (Math.sin(i * 0.6) * 0.015);
    } else {
      const crashProgress = (i - peakX) / (segments - peakX);
      yRatio = 0.2 + crashProgress * crashProgress * 0.7;
    }
    points.push({ x: 30 + xRatio * (W - 60), y: yRatio * H });
  }

  // MASSIVE red fill under the crash portion — this is the dominant visual
  const peakPoint = points[peakX];
  ctx.beginPath();
  ctx.moveTo(peakPoint.x, peakPoint.y);
  for (let i = peakX; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineTo(points[points.length - 1].x, H);
  ctx.lineTo(peakPoint.x, H);
  ctx.closePath();
  const crashFill = ctx.createLinearGradient(peakPoint.x, 0, W, 0);
  crashFill.addColorStop(0, "rgba(200,30,30,0.35)");
  crashFill.addColorStop(1, "rgba(200,20,20,0.7)");
  ctx.fillStyle = crashFill;
  ctx.fill();

  // Subtle green fill under the rise
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i <= peakX; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.lineTo(peakPoint.x, H);
  ctx.lineTo(points[0].x, H);
  ctx.closePath();
  ctx.fillStyle = "rgba(30,150,80,0.08)";
  ctx.fill();

  // THICK curve line — must be visible at thumbnail scale
  ctx.lineWidth = 16;
  // Green rise
  ctx.strokeStyle = "#22aa55";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i <= peakX; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  // Red crash
  ctx.strokeStyle = "#dd2222";
  ctx.beginPath();
  ctx.moveTo(points[peakX].x, points[peakX].y);
  for (let i = peakX + 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // BIG crash arrow — the visual punch
  const arrowStart = { x: peakPoint.x + 40, y: peakPoint.y + 20 };
  const arrowEnd = points[Math.min(peakX + 25, segments)];
  ctx.strokeStyle = "#ff2222";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(arrowStart.x, arrowStart.y);
  ctx.lineTo(arrowEnd.x + 10, arrowEnd.y - 30);
  ctx.stroke();
  // Large arrowhead
  const angle = Math.atan2(arrowEnd.y - arrowStart.y, arrowEnd.x - arrowStart.x);
  ctx.fillStyle = "#ff2222";
  ctx.beginPath();
  ctx.moveTo(arrowEnd.x + 10, arrowEnd.y - 30);
  ctx.lineTo(arrowEnd.x + 10 - 36 * Math.cos(angle - 0.5), arrowEnd.y - 30 - 36 * Math.sin(angle - 0.5));
  ctx.lineTo(arrowEnd.x + 10 - 36 * Math.cos(angle + 0.5), arrowEnd.y - 30 - 36 * Math.sin(angle + 0.5));
  ctx.closePath();
  ctx.fill();

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function renderIceberg(ctx, plan) {
  const W = WIDTH, H = HEIGHT;
  const tiers = plan.iceberg_tiers || [
    { label: "Surface Web" },
    { label: "Deep Web" },
    { label: "Dark Web" },
    { label: "Marianas Web" },
    { label: "Level 5" },
    { label: "Level 6" },
    { label: "Level 7" },
  ];
  const fontFamily = "Bebas Neue, Impact, Arial Black";

  // --- BACKGROUND: dramatic dark ocean gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#1a3050");
  bgGrad.addColorStop(0.18, "#0d2848");
  bgGrad.addColorStop(0.22, "#0a2040");
  bgGrad.addColorStop(0.5, "#061530");
  bgGrad.addColorStop(0.8, "#040a18");
  bgGrad.addColorStop(1, "#020408");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // --- KEY DIMENSIONS ---
  const centerX = W * 0.6;           // offset right so labels fit on the left
  const waterY = Math.floor(H * 0.20);
  const tipY = waterY - H * 0.13;
  const bottomY = H - 20;
  const waterlineHalfW = W * 0.09;   // narrow at waterline
  const maxHalfW = W * 0.34;         // wide at bottom (~68% of canvas width)

  // --- RED ABYSS GLOW at the very bottom ---
  const abyssGlow = ctx.createRadialGradient(centerX, bottomY + 10, 0, centerX, bottomY, H * 0.42);
  abyssGlow.addColorStop(0, "rgba(200,30,20,0.50)");
  abyssGlow.addColorStop(0.35, "rgba(140,20,10,0.18)");
  abyssGlow.addColorStop(0.7, "rgba(60,10,5,0.06)");
  abyssGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = abyssGlow;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);

  // --- Helper: iceberg edge X at a given Y (for label connectors) ---
  const midY = waterY + (bottomY - waterY) * 0.45;
  const midHalfW = waterlineHalfW + (maxHalfW - waterlineHalfW) * 0.55;
  function iceEdgeX(y, side) {
    // side: -1 = left, +1 = right
    let halfW;
    if (y <= tipY) {
      halfW = 0;
    } else if (y <= waterY) {
      const t = (y - tipY) / (waterY - tipY);
      halfW = waterlineHalfW * (t * t * 0.4 + t * 0.6);
    } else if (y <= bottomY) {
      const t = (y - waterY) / (bottomY - waterY);
      halfW = waterlineHalfW + (maxHalfW - waterlineHalfW) * (t * 0.7 + t * t * 0.3);
    } else {
      halfW = maxHalfW;
    }
    return centerX + side * halfW;
  }

  // --- ORGANIC ICEBERG SHAPE (bezier curves, NOT triangles) ---
  function traceIcebergPath() {
    ctx.beginPath();
    // Start at the rounded dome tip
    ctx.moveTo(centerX, tipY);
    // RIGHT side: tip -> waterline (gentle dome curve)
    ctx.bezierCurveTo(
      centerX + waterlineHalfW * 0.15, tipY + (waterY - tipY) * 0.2,
      centerX + waterlineHalfW * 0.8,  waterY - (waterY - tipY) * 0.15,
      centerX + waterlineHalfW, waterY
    );
    // RIGHT side: waterline -> mid-body (flares out with organic bulge)
    ctx.bezierCurveTo(
      centerX + waterlineHalfW * 1.15, waterY + (midY - waterY) * 0.3,
      centerX + midHalfW * 0.85,       midY - (midY - waterY) * 0.15,
      centerX + midHalfW, midY
    );
    // RIGHT side: mid-body -> bottom (continues widening, slight inward curve at base)
    ctx.bezierCurveTo(
      centerX + midHalfW * 1.06,  midY + (bottomY - midY) * 0.4,
      centerX + maxHalfW * 1.02,  bottomY - (bottomY - midY) * 0.25,
      centerX + maxHalfW * 0.92, bottomY
    );
    // BOTTOM: rounded base
    ctx.bezierCurveTo(
      centerX + maxHalfW * 0.5,  bottomY + 12,
      centerX - maxHalfW * 0.5,  bottomY + 12,
      centerX - maxHalfW * 0.92, bottomY
    );
    // LEFT side: bottom -> mid-body (slight asymmetry for realism)
    ctx.bezierCurveTo(
      centerX - maxHalfW * 1.0,    bottomY - (bottomY - midY) * 0.28,
      centerX - midHalfW * 1.04,   midY + (bottomY - midY) * 0.35,
      centerX - midHalfW * 0.97, midY
    );
    // LEFT side: mid-body -> waterline
    ctx.bezierCurveTo(
      centerX - midHalfW * 0.82,       midY - (midY - waterY) * 0.18,
      centerX - waterlineHalfW * 1.12,  waterY + (midY - waterY) * 0.25,
      centerX - waterlineHalfW, waterY
    );
    // LEFT side: waterline -> tip (dome)
    ctx.bezierCurveTo(
      centerX - waterlineHalfW * 0.75, waterY - (waterY - tipY) * 0.18,
      centerX - waterlineHalfW * 0.12, tipY + (waterY - tipY) * 0.15,
      centerX, tipY
    );
    ctx.closePath();
  }

  // Draw and fill the iceberg
  traceIcebergPath();

  // ICE GRADIENT: white/light-blue tip -> dark blue -> near-black bottom
  const iceGrad = ctx.createLinearGradient(0, tipY, 0, bottomY);
  iceGrad.addColorStop(0,    "rgba(210,235,255,0.95)");
  iceGrad.addColorStop(0.08, "rgba(170,210,245,0.90)");
  iceGrad.addColorStop(0.20, "rgba(100,170,220,0.75)");
  iceGrad.addColorStop(0.35, "rgba(50,100,170,0.65)");
  iceGrad.addColorStop(0.50, "rgba(30,60,120,0.55)");
  iceGrad.addColorStop(0.65, "rgba(20,35,70,0.50)");
  iceGrad.addColorStop(0.80, "rgba(12,18,40,0.48)");
  iceGrad.addColorStop(0.95, "rgba(8,8,15,0.45)");
  iceGrad.addColorStop(1,    "rgba(5,3,3,0.40)");
  ctx.fillStyle = iceGrad;
  ctx.fill();

  // Subtle edge highlight
  ctx.strokeStyle = "rgba(120,190,255,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // --- ICE TEXTURE: horizontal crack lines (clipped to iceberg) ---
  ctx.save();
  traceIcebergPath();
  ctx.clip();

  const crackSpacing = (bottomY - tipY) / 18;
  for (let i = 1; i < 18; i++) {
    const crackY = tipY + i * crackSpacing + (Math.sin(i * 7.3) * crackSpacing * 0.2);
    const depthT = i / 18;
    const alpha = 0.04 + depthT * 0.06;
    ctx.strokeStyle = `rgba(180,220,255,${alpha})`;
    ctx.lineWidth = 0.8 + depthT * 0.5;
    ctx.beginPath();
    const leftX = iceEdgeX(crackY, -1);
    const rightX = iceEdgeX(crackY, 1);
    const segments = 8 + Math.floor(Math.abs(Math.sin(i * 3.1)) * 6);
    for (let s = 0; s <= segments; s++) {
      const sx = leftX + (rightX - leftX) * (s / segments);
      const sy = crackY + (Math.sin(s * 4.7 + i * 2.3) * 2.5);
      s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // --- WATERLINE with wave pattern ---
  // Broad diffuse light band at water surface
  const waterGlow = ctx.createLinearGradient(0, waterY - 8, 0, waterY + 12);
  waterGlow.addColorStop(0,   "rgba(100,180,255,0.0)");
  waterGlow.addColorStop(0.4, "rgba(120,200,255,0.15)");
  waterGlow.addColorStop(0.6, "rgba(100,180,255,0.12)");
  waterGlow.addColorStop(1,   "rgba(60,120,200,0.0)");
  ctx.fillStyle = waterGlow;
  ctx.fillRect(0, waterY - 8, W, 20);

  // Primary wave line
  ctx.strokeStyle = "rgba(140,210,255,0.35)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 3) {
    const wy = waterY + Math.sin(x * 0.012) * 5 + Math.sin(x * 0.035) * 2.5 + Math.cos(x * 0.007) * 3;
    x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
  }
  ctx.stroke();

  // Second fainter wave for depth
  ctx.strokeStyle = "rgba(80,160,230,0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 3) {
    const wy = waterY + 4 + Math.sin(x * 0.018 + 1.5) * 3 + Math.sin(x * 0.045 + 0.8) * 1.5;
    x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
  }
  ctx.stroke();

  // Light reflections on water surface (small bright ellipses)
  for (let i = 0; i < 12; i++) {
    const rx = W * 0.05 + (W * 0.9) * (Math.sin(i * 5.7 + 0.3) * 0.5 + 0.5);
    const ry = waterY - 2 + Math.sin(i * 3.1) * 4;
    const rSize = 2 + Math.abs(Math.sin(i * 2.9)) * 4;
    const rAlpha = 0.08 + Math.abs(Math.sin(i * 1.7)) * 0.12;
    ctx.fillStyle = `rgba(200,230,255,${rAlpha})`;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rSize * 2.5, rSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- TIER LABELS on the LEFT side of the iceberg ---
  const tierCount = tiers.length;
  const LEFT_MARGIN = 20;

  for (let idx = 0; idx < tierCount; idx++) {
    const tier = tiers[idx];
    const depthRatio = idx / (tierCount - 1 || 1);

    // Font size: 24px top, 28px middle, 34px bottom
    let size;
    if (depthRatio < 0.35) {
      size = 24;
    } else if (depthRatio < 0.7) {
      size = 28;
    } else {
      size = 34;
    }

    // Color: light blue (#88bbdd) top -> transition -> red (#dd2222) bottom
    let color;
    if (depthRatio < 0.35) {
      color = "#88bbdd";
    } else if (depthRatio < 0.7) {
      const t = (depthRatio - 0.35) / 0.35;
      const r = Math.round(0x88 + (0xcc - 0x88) * t);
      const g = Math.round(0xbb - (0xbb - 0x55) * t);
      const b = Math.round(0xdd - (0xdd - 0x77) * t);
      color = `rgb(${r},${g},${b})`;
    } else {
      color = "#dd2222";
    }

    // Y position: evenly distribute tiers across iceberg height
    const ratio = (idx + 0.5) / tierCount;
    const labelY = tipY + ratio * (bottomY - tipY);

    // Iceberg LEFT edge at this Y for connector endpoint
    const iceLeftX = iceEdgeX(labelY, -1);

    // Warning triangle prefix for bottom 3 tiers
    const isBottomTier = idx >= tierCount - 3;
    const warningPrefix = isBottomTier ? "\u25B2 " : "";
    const labelText = warningPrefix + tier.label.toUpperCase();

    // Measure text and clamp position so label starts at >= LEFT_MARGIN
    ctx.font = `bold ${size}px ${fontFamily}`;
    const textWidth = ctx.measureText(labelText).width;
    const labelStartX = Math.max(LEFT_MARGIN, iceLeftX - 20 - textWidth);

    // Dashed connector line from label end rightward to iceberg left edge
    const connectorStartX = labelStartX + textWidth + 6;
    const connectorEndX = iceLeftX - 3;

    if (connectorEndX > connectorStartX + 8) {
      ctx.save();
      ctx.strokeStyle = color + "55";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(connectorStartX, labelY);
      ctx.lineTo(connectorEndX, labelY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Small dot at iceberg edge
      ctx.fillStyle = color + "80";
      ctx.beginPath();
      ctx.arc(connectorEndX + 2, labelY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw label text with drop shadow for readability
    ctx.font = `bold ${size}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(labelText, labelStartX, labelY + size * 0.35);
    ctx.restore();
  }

  // --- VIGNETTE ---
  const vig = ctx.createRadialGradient(centerX, H * 0.4, W * 0.22, centerX, H * 0.4, W * 0.68);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function renderIcebergLabels(ctx, plan) {
  const W = WIDTH, H = HEIGHT;
  const tiers = plan.iceberg_tiers || [
    { label: "Surface Web" }, { label: "Deep Web" }, { label: "Dark Web" },
    { label: "Marianas Web" }, { label: "Level 5" }, { label: "Level 6" }, { label: "Level 7" },
  ];
  const fontFamily = "Bebas Neue, Impact, Arial Black";
  const tierCount = tiers.length;

  // Waterline at ~20% — first tier is above, rest below
  const waterY = H * 0.20;
  const topY = H * 0.05;   // top of first tier
  const bottomY = H * 0.95; // bottom of last tier

  for (let i = 0; i < tierCount; i++) {
    const tierTop = topY + (i / tierCount) * (bottomY - topY);
    const tierBottom = topY + ((i + 1) / tierCount) * (bottomY - topY);
    const tierMidY = (tierTop + tierBottom) / 2;
    const depthRatio = i / (tierCount - 1 || 1);

    // Horizontal divider line between tiers (semi-transparent)
    if (i > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.15 - depthRatio * 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.1, tierTop);
      ctx.lineTo(W * 0.9, tierTop);
      ctx.stroke();
    }

    // Label — positioned LEFT side, centered vertically in tier band
    const isDeep = i >= tierCount - 3;
    const fontSize = Math.round(32 + depthRatio * 18); // 32px top → 50px bottom — must be readable at thumbnail scale
    const r = Math.round(0xdd * depthRatio + 0xcc * (1 - depthRatio));
    const g = Math.round(0x33 * depthRatio + 0xdd * (1 - depthRatio));
    const b = Math.round(0x33 * depthRatio + 0xee * (1 - depthRatio));
    const color = isDeep ? `rgb(${Math.min(255, r + 30)},${Math.max(0, g - 30)},${b})` : `rgb(${r},${g},${b})`;

    const prefix = isDeep ? "▲ " : "";
    const text = prefix + tiers[i].label.toUpperCase();

    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const textWidth = ctx.measureText(text).width;
    const labelX = 20;
    const labelY = tierMidY + fontSize / 3;

    // Background pill
    const pillPad = 6;
    ctx.fillStyle = `rgba(0,0,0,${0.35 + depthRatio * 0.25})`;
    roundRect(ctx, labelX - pillPad, tierMidY - fontSize / 2 - pillPad / 2, textWidth + pillPad * 2, fontSize + pillPad, 4);
    ctx.fill();

    // Text
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(text, labelX, labelY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function renderPyramid(ctx, plan) {
  const W = WIDTH, H = HEIGHT;
  const tiers = plan.pyramid_tiers || [
    { label: "Tier 1", color: "#cc2222" },
    { label: "Tier 2", color: "#cc6622" },
    { label: "Tier 3", color: "#ccaa22" },
    { label: "Tier 4", color: "#66aa22" },
    { label: "Tier 5", color: "#2266aa" },
  ];

  // White background
  ctx.fillStyle = plan.pyramid_bg || "#f5f5f5";
  ctx.fillRect(0, 0, W, H);

  const tierCount = tiers.length;
  const pyramidTop = 30;
  const pyramidBottom = H - 30;
  const pyramidHeight = pyramidBottom - pyramidTop;
  const centerX = W * 0.45;
  const maxWidth = W * 0.5;
  const fontFamily = "Bebas Neue, Impact, Arial Black";

  for (let i = 0; i < tierCount; i++) {
    const topRatio = i / tierCount;
    const bottomRatio = (i + 1) / tierCount;
    const y1 = pyramidTop + topRatio * pyramidHeight;
    const y2 = pyramidTop + bottomRatio * pyramidHeight;
    const w1 = maxWidth * topRatio * 0.9 + 20;
    const w2 = maxWidth * bottomRatio * 0.9 + 20;

    // Draw tier trapezoid
    ctx.fillStyle = tiers[i].color;
    ctx.beginPath();
    ctx.moveTo(centerX - w1 / 2, y1);
    ctx.lineTo(centerX + w1 / 2, y1);
    ctx.lineTo(centerX + w2 / 2, y2);
    ctx.lineTo(centerX - w2 / 2, y2);
    ctx.closePath();
    ctx.fill();

    // Tier border
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label — alternate left and right
    const labelY = (y1 + y2) / 2;
    const isRight = i % 2 === 0;
    const edgeX = isRight ? centerX + w2 / 2 : centerX - w2 / 2;
    const labelX = isRight ? edgeX + 30 : edgeX - 30;

    // Connecting line
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(edgeX + (isRight ? 5 : -5), labelY);
    ctx.lineTo(labelX + (isRight ? -5 : 5), labelY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label text
    const fontSize = 20;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = "#1a1a1a";
    ctx.textAlign = isRight ? "left" : "right";
    ctx.fillText(tiers[i].label.toUpperCase(), labelX, labelY + fontSize / 3);
  }
}

// ─── IMAGE PALETTE EXTRACTION ──────────────────────────────────────────────────
// Sample the rendered image and extract a small dominant palette so the text
// and banner colors can be derived from the image itself, not from random
// hardcoded niche defaults. Returns { dominant, accent, text, contrast_text }.
//
// Niels feedback: "Color palette feels random — red banner has no thematic
// connection to the story." This is because the renderer uses NICHES[].palettes
// which are generic preset palettes that don't relate to the actual image.
function extractImagePalette(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const stepX = Math.max(1, Math.floor(W / 80));
  const stepY = Math.max(1, Math.floor(H / 45));
  const buckets = new Map();
  let totalLum = 0;
  let n = 0;
  try {
    const data = ctx.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y += stepY) {
      for (let x = 0; x < W; x += stepX) {
        const i = (y * W + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // 4-bit-per-channel quantize for dominance counting
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const entry = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
        entry.count++;
        entry.r += r;
        entry.g += g;
        entry.b += b;
        buckets.set(key, entry);
        totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
        n++;
      }
    }
  } catch (e) {
    return null;
  }
  if (n === 0) return null;
  const avgLum = totalLum / n;
  // Sort buckets by count, take top dominants
  const sorted = [...buckets.values()]
    .map(e => ({ r: Math.round(e.r / e.count), g: Math.round(e.g / e.count), b: Math.round(e.b / e.count), count: e.count }))
    .sort((a, b) => b.count - a.count);
  const dominant = sorted[0];
  // Find a high-saturation accent (HSV saturation > 0.4) that contrasts with dominant
  const saturation = (c) => {
    const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
    return max === 0 ? 0 : (max - min) / max;
  };
  let accent = sorted.find(c => saturation(c) > 0.5 && Math.abs(c.r + c.g + c.b - (dominant.r + dominant.g + dominant.b)) > 100);
  if (!accent) accent = sorted.slice(1, 8).sort((a, b) => saturation(b) - saturation(a))[0];
  if (!accent) accent = dominant;
  const toHex = (c) => '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  // Text color: pure white if image is dark, near-black if image is bright
  const textColor = avgLum < 128 ? '#FFFFFF' : '#0A0A0A';
  return {
    dominant: toHex(dominant),
    accent: toHex(accent),
    text: textColor,
    avg_luminance: avgLum,
    is_dark: avgLum < 60,
  };
}

// Apply a brightness floor to a too-dark image so the rendered thumbnail
// is readable at 168x94. Operates on the canvas in-place. Niels: "two
// thumbnails are too dark to see at mobile size."
function applyBrightnessFloor(canvas, targetMinLum = 50) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  try {
    const img = ctx.getImageData(0, 0, W, H);
    const data = img.data;
    let totalLum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      n++;
    }
    const avgLum = totalLum / n;
    if (avgLum >= targetMinLum) return false;
    // Lift midtones using a gamma curve. gamma < 1 brightens.
    const gamma = Math.max(0.4, avgLum / targetMinLum);
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      lut[v] = Math.min(255, Math.round(255 * Math.pow(v / 255, gamma)));
    }
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
    ctx.putImageData(img, 0, 0);
    return { applied: true, original_lum: Math.round(avgLum), gamma: Math.round(gamma * 100) / 100 };
  } catch (e) {
    return false;
  }
}

// ─── SALIENCY: find calm zones to place text where it won't cover focal points ──
// Coarse busyness estimator: computes mean |Δlum| across a region. High values
// mean lots of detail/edges (faces, complex objects). Low values mean sky,
// dark background, blur — safe to overlay text. Uses subsampled imageData
// to keep cost bounded regardless of region size.
function regionBusyness(ctx, x, y, w, h) {
  if (w < 8 || h < 8) return 0;
  try {
    const sampleW = Math.min(64, Math.max(8, Math.floor(w / 8)));
    const sampleH = Math.min(64, Math.max(8, Math.floor(h / 8)));
    const sx = Math.max(0, Math.round(x));
    const sy = Math.max(0, Math.round(y));
    const sw = Math.min(ctx.canvas.width - sx, Math.round(w));
    const sh = Math.min(ctx.canvas.height - sy, Math.round(h));
    if (sw <= 0 || sh <= 0) return 0;
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    // Compute mean luminance and mean absolute deviation
    let mean = 0;
    let n = 0;
    const stride = Math.max(1, Math.floor(sw / sampleW)) * 4;
    for (let i = 0; i < data.length; i += stride) {
      mean += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      n++;
    }
    mean /= n;
    let dev = 0;
    for (let i = 0; i < data.length; i += stride) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      dev += Math.abs(lum - mean);
    }
    return dev / n; // 0 = perfectly flat, ~30+ = busy
  } catch (e) {
    return 0;
  }
}

// Search for a "calm zone" large enough to host the given text bbox.
// Tries the requested position first; if it's too busy AND there's something
// calmer nearby, returns the calmer position. Always preserves alignment intent.
// Returns { x, y, busyness, moved }.
function findCalmZone(ctx, requestedX, requestedY, w, h, align = "left") {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const margin = 24;
  const requestedBusy = regionBusyness(ctx, requestedX, requestedY, w, h);
  // If the requested zone is already calm, keep it.
  if (requestedBusy < 18) return { x: requestedX, y: requestedY, busyness: requestedBusy, moved: false };

  // Generate candidate positions on a 3x3 grid, biased toward edges and corners.
  const candidates = [];
  const xs = align === "center"
    ? [Math.round(W / 2 - w / 2)]
    : align === "right"
      ? [W - w - margin]
      : [margin, Math.round(W / 2 - w / 2), W - w - margin];
  const ys = [margin, Math.round(H * 0.35), Math.round(H * 0.6), H - h - margin];

  for (const cx of xs) {
    for (const cy of ys) {
      if (cx < 0 || cy < 0 || cx + w > W || cy + h > H) continue;
      candidates.push({ x: cx, y: cy, busyness: regionBusyness(ctx, cx, cy, w, h) });
    }
  }
  // Always include the requested position as a candidate
  candidates.push({ x: requestedX, y: requestedY, busyness: requestedBusy });

  candidates.sort((a, b) => a.busyness - b.busyness);
  const best = candidates[0];
  const moved = best.x !== requestedX || best.y !== requestedY;
  return { x: best.x, y: best.y, busyness: best.busyness, moved };
}

// ─── FREEFORM RENDERER ──────────────────────────────────────────────────────────
// Executes Claude's creative brief as a layered composition.
// Each element in the array is rendered in order (painter's algorithm).
// Positions are percentages (0-100) of canvas dimensions.

function renderFreeformComposition(ctx, elements, mainImage, suppImage, thirdImage, plan) {
  const W = WIDTH;
  const H = HEIGHT;
  const pct = (v, dim) => Math.round((v / 100) * dim);
  const images = { background: mainImage, supplementary: suppImage, third: thirdImage };
  const occupiedRegions = []; // Track placed text/banner regions for collision avoidance

  // TWO-PASS RENDERING: image layer first, then extract palette + lift
  // brightness, then text/banners/annotations using the extracted palette.
  // Niels feedback: "color palette feels random" + "too dark to see at mobile."
  // Both addressed by deriving colors from the image AFTER it's painted.
  const IMAGE_LAYER_TYPES = new Set(["image", "overlay_image", "fill", "gradient", "color_zone", "vignette", "divider", "desaturate", "warm_glow"]);
  const TEXT_LAYER_TYPES = new Set(["text", "banner", "arrow", "circle"]);
  const passes = [
    elements.filter(el => IMAGE_LAYER_TYPES.has(el.type)),
    elements.filter(el => TEXT_LAYER_TYPES.has(el.type)),
  ];

  for (let passIdx = 0; passIdx < 2; passIdx++) {
    if (passIdx === 1) {
      // Between image pass and text pass: lift brightness if needed and extract palette
      try {
        const lift = applyBrightnessFloor(ctx.canvas, 50);
        if (lift && lift.applied) {
          console.log("    [Brightness] Image too dark (avg lum " + lift.original_lum + ") — lifted with gamma " + lift.gamma);
        }
        const extracted = extractImagePalette(ctx.canvas);
        if (extracted) {
          console.log("    [Palette] dominant=" + extracted.dominant + " accent=" + extracted.accent + " text=" + extracted.text + " (lum " + Math.round(extracted.avg_luminance) + ")");
          plan._extracted_palette = extracted;
        }
      } catch (e) {
        console.log("    [Palette] failed: " + e.message);
      }
    }

  for (const el of passes[passIdx]) {
    const ex = pct(el.x || 0, W);
    const ey = pct(el.y || 0, H);
    const ew = pct(el.w || 100, W);
    const eh = pct(el.h || 100, H);

    switch (el.type) {
      case "image": {
        const img = images[el.role] || mainImage;
        if (!img) break;
        ctx.save();
        ctx.beginPath();
        ctx.rect(ex, ey, ew, eh);
        ctx.clip();
        if (el.face_crop) {
          // Face-focused crop: focus on upper-center of image where face typically is
          drawFaceCrop(ctx, img, ex, ey, ew, eh);
        } else {
          drawCover(ctx, img, ex, ey, ew, eh);
        }
        if (el.brightness != null && el.brightness < 1) {
          ctx.fillStyle = `rgba(0,0,0,${1 - el.brightness})`;
          ctx.fillRect(ex, ey, ew, eh);
        }
        ctx.restore();
        break;
      }

      case "overlay_image": {
        // Overlays supplementary/third image at specific position with optional opacity
        const img = images[el.role] || suppImage;
        if (!img) break;
        ctx.save();
        if (el.opacity != null && el.opacity < 1) {
          ctx.globalAlpha = el.opacity;
        }
        ctx.beginPath();
        ctx.rect(ex, ey, ew, eh);
        ctx.clip();
        drawCover(ctx, img, ex, ey, ew, eh);
        if (el.brightness != null && el.brightness < 1) {
          ctx.fillStyle = `rgba(0,0,0,${1 - el.brightness})`;
          ctx.fillRect(ex, ey, ew, eh);
        }
        ctx.restore();
        break;
      }

      case "fill": {
        ctx.fillStyle = el.color || "#000000";
        ctx.fillRect(ex, ey, ew, eh);
        break;
      }

      case "gradient": {
        let grad;
        const stops = el.stops || [];
        if (el.direction === "left_to_right") {
          grad = ctx.createLinearGradient(ex, ey, ex + ew, ey);
        } else if (el.direction === "right_to_left") {
          grad = ctx.createLinearGradient(ex + ew, ey, ex, ey);
        } else if (el.direction === "bottom_to_top") {
          grad = ctx.createLinearGradient(ex, ey + eh, ex, ey);
        } else if (el.direction === "radial_center") {
          const cx = ex + ew / 2, cy = ey + eh / 2;
          const radius = Math.max(ew, eh) / 2;
          grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        } else if (el.direction === "radial_corner") {
          grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, Math.max(ew, eh));
        } else {
          // Default: top_to_bottom
          grad = ctx.createLinearGradient(ex, ey, ex, ey + eh);
        }
        for (const stop of stops) {
          grad.addColorStop(stop.pos, stop.color);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(ex, ey, ew, eh);
        break;
      }

      case "text": {
        const content = el.content || "";
        // PALETTE-AWARE COLOR RESOLUTION: if the planner left text color as
        // the default white but the image is bright, switch to dark text for
        // contrast. If the emphasis color is the default red but doesn't
        // contrast with the image dominant, swap to the extracted accent.
        const ep = plan._extracted_palette;
        let color = el.color || (ep ? ep.text : "#FFFFFF");
        // If planner specified pure white over a bright image, override to dark
        if ((!el.color || el.color.toUpperCase() === "#FFFFFF") && ep && !ep.is_dark && ep.avg_luminance > 160) {
          color = "#0A0A0A";
          console.log("    [Palette] Text color flipped to dark for bright image (lum " + Math.round(ep.avg_luminance) + ")");
        }
        const useStroke = el.stroke !== false;
        const align = el.align || "left";
        const emphasisWord = el.emphasis_word || null;
        // Use extracted accent if planner used the default red and the accent
        // would actually pop against the image
        let emphasisColor = el.emphasis_color || "#cc2020";
        if ((!el.emphasis_color || el.emphasis_color.toLowerCase() === "#cc2020") && ep && ep.accent && ep.accent !== ep.dominant) {
          emphasisColor = ep.accent;
        }

        // BOUNDS CHECKING: clamp max width/height so text never extends past canvas edges
        const margin = 20; // minimum pixel margin from edge
        let textX = ex;
        let maxW = pct(el.max_w || el.w || 90, W);
        let maxH = pct(el.max_h || el.h || 40, H);
        let adjustedY = ey; // Mutable Y for collision nudging

        // For centered text, adjust x position and maxW to keep centered within canvas
        if (align === "center") {
          // Calculate available width centered at textX
          const leftSpace = textX;
          const rightSpace = W - textX;
          const availableWidth = Math.min(leftSpace, rightSpace) * 2 - margin * 2;
          maxW = Math.min(maxW, availableWidth);
          // Shift x left so text is centered at the intended position
          textX = textX - maxW / 2;
          if (textX < margin) textX = margin;
        } else {
          // For left/right aligned, ensure text + width fits within canvas
          const remainingWidth = W - textX - margin;
          maxW = Math.min(maxW, remainingWidth);
          if (textX < margin) textX = margin;
        }
        // Clamp vertical
        if (adjustedY + maxH > H - margin) maxH = H - adjustedY - margin;
        if (adjustedY < margin) { maxH -= (margin - adjustedY); textX = Math.max(textX, margin); }

        // Check for overlap with already-placed text/banners and group related text
        for (const region of occupiedRegions) {
          const overlapX = textX < region.x + region.w && textX + maxW > region.x;
          const overlapY = adjustedY < region.y + region.h && adjustedY + maxH > region.y;
          if (overlapX && overlapY) {
            // For related text elements (same quadrant), position adjacently instead of conflicting areas
            if (region.type === 'text' && isRelatedText(content, region.content)) {
              adjustedY = region.y + region.h + 5; // Tight spacing for grouped text
            } else {
              // Nudge unrelated text below the conflicting region
              adjustedY = region.y + region.h + 10;
            }
            if (adjustedY + maxH > H - 20) {
              maxH = H - adjustedY - 20; // Clamp to canvas
            }
            console.log(`    [Collision] Nudged text "${content}" ${isRelatedText(content, region.content) ? 'adjacent to' : 'below'} existing ${region.type}`);
          }
        }

        // SALIENCY-AWARE PLACEMENT: if the requested position is sitting on the
        // image's busy/focal region (face, helmet, complex object), relocate to
        // a calmer zone. This is the fix for "text covers warrior's helmet" —
        // the existing collision logic only checks against other text/banners,
        // not against the image content itself.
        const originalBusy = regionBusyness(ctx, textX, adjustedY, maxW, maxH);
        const calm = findCalmZone(ctx, textX, adjustedY, maxW, maxH, align);
        if (calm.moved) {
          console.log(`    [Saliency] Moved text "${content}" from busy=${originalBusy.toFixed(1)} to calmer zone at (${calm.x}, ${calm.y}, busy=${calm.busyness.toFixed(1)})`);
          textX = calm.x;
          adjustedY = calm.y;
        }

        // Helper function to detect related text elements that should be grouped
        function isRelatedText(text1, text2) {
          if (!text1 || !text2) return false;
          const keywords1 = text1.toLowerCase().split(/\W+/);
          const keywords2 = text2.toLowerCase().split(/\W+/);
          // Group if they share educational/series keywords
          const groupingWords = ['beginner', 'episode', 'part', 'chapter', 'lesson', 'tutorial', 'guide', 'step'];
          const hasGrouping1 = keywords1.some(w => groupingWords.includes(w));
          const hasGrouping2 = keywords2.some(w => groupingWords.includes(w));
          return hasGrouping1 && hasGrouping2;
        }

        // Map size names to pixel ranges — OPTIMIZED FOR MOBILE THUMBNAIL SCALE
        // These sizes are designed to survive YouTube's compression to 168x94px
        let startFontSize;
        switch (el.font_size) {
          case "massive": startFontSize = 420; break;  // Boosted for mobile readability at 168x94px
          case "large": startFontSize = 340; break;   // Must survive extreme YouTube compression
          case "medium": startFontSize = 260; break;  // Minimum readable at mobile scale
          case "small": startFontSize = 200; break;   // Even 'small' must be mobile-readable
          default: startFontSize = 380; break;       // Default assumes primary hook text
        }

        // Apply period finality
        let displayText = content;
        if (el.use_period === true && !displayText.endsWith(".")) {
          displayText += ".";
        }

        // CONTRAST DETECTION: If background is too dark for text readability, enhance contrast
        let enhancedUseStroke = useStroke;
        let enhancedEmphasisColor = emphasisColor;
        if (emphasisColor && emphasisColor.startsWith('#')) {
          // Sample background luminosity at text position
          try {
            const sampleData = ctx.getImageData(textX + maxW/4, adjustedY + maxH/4, Math.min(50, maxW/2), Math.min(20, maxH/2));
            let totalLum = 0;
            for (let i = 0; i < sampleData.data.length; i += 4) {
              const r = sampleData.data[i], g = sampleData.data[i+1], b = sampleData.data[i+2];
              totalLum += (0.299 * r + 0.587 * g + 0.114 * b) / 255; // Relative luminance
            }
            const avgLum = totalLum / (sampleData.data.length / 4);
            if (avgLum < 0.4) { // Dark background detected - switch to high-contrast color
              enhancedUseStroke = true; // Force stroke for readability
              // Replace red with bright yellow or cyan for dark backgrounds
              if (emphasisColor.toLowerCase().includes('cc2020') || emphasisColor.toLowerCase().includes('ff1744') || emphasisColor.toLowerCase().includes('dd2222')) {
                enhancedEmphasisColor = avgLum < 0.2 ? '#FFD700' : '#00E5FF'; // Gold for very dark, cyan for moderately dark
              }
              console.log(`    [Contrast] Dark bg detected (lum: ${avgLum.toFixed(2)}) - switching emphasis color from ${emphasisColor} to ${enhancedEmphasisColor}`);
            }
          } catch (e) { /* sampling failed, use defaults */ }
        }
        
        const textResult = drawTextBlock(ctx, displayText, textX, adjustedY, maxW, maxH, color, enhancedUseStroke, align, startFontSize, emphasisWord, enhancedEmphasisColor);
        occupiedRegions.push({ x: textX, y: adjustedY, w: maxW, h: maxH, type: 'text' });
        break;
      }

      case "banner": {
        const radius = el.radius || 0;
        // Palette-aware banner color: if planner used a generic default,
        // use the extracted accent so the banner relates to the image.
        let bannerColor = el.color || "rgba(0,0,0,0.7)";
        const ep2 = plan._extracted_palette;
        const isGenericDefault = !el.color
          || el.color === "rgba(0,0,0,0.7)"
          || /^rgba?\(204,32,32/.test(el.color)
          || el.color.toLowerCase() === "#cc2020";
        if (isGenericDefault && ep2 && ep2.accent) {
          // Convert accent hex to rgba with high opacity
          const m = ep2.accent.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
          if (m) {
            const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
            bannerColor = `rgba(${r},${g},${b},0.92)`;
          }
        }
        ctx.fillStyle = bannerColor;
        if (radius > 0) {
          roundRect(ctx, ex, ey, ew, eh, radius);
          ctx.fill();
        } else {
          ctx.fillRect(ex, ey, ew, eh);
        }
        if (el.banner_text) {
          const fontSize = Math.max(24, Math.min(eh * 0.65, 80));
          ctx.font = `bold ${fontSize}px Bebas Neue, Impact, Arial Black`;
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          // Add text shadow for better readability
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillText(el.banner_text.toUpperCase(), ex + ew / 2, ey + eh / 2);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
        occupiedRegions.push({ x: ex, y: ey, w: ew, h: eh, type: 'banner', content: el.banner_text });
        // VISUAL ANCHORING: If this banner is the first/primary banner, anchor subsequent elements to it
        if (el.banner_text && occupiedRegions.filter(r => r.type === 'banner').length === 1) {
          // Mark this as the primary banner for visual hierarchy
          occupiedRegions[occupiedRegions.length - 1].isPrimary = true;
        }
        break;
      }

      case "vignette": {
        const strength = el.strength || 0.5;
        const cx = pct(el.x || 50, W);
        const cy = pct(el.y || 50, H);
        const radius = Math.max(W, H) * 0.7;
        const vig = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, `rgba(0,0,0,${strength})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
        break;
      }

      case "divider": {
        ctx.fillStyle = el.color || "#FFFFFF";
        const lineWidth = el.width || 4;
        if (el.orientation === "horizontal") {
          const py = pct(el.position || 50, H);
          ctx.fillRect(0, py - lineWidth / 2, W, lineWidth);
        } else {
          const px = pct(el.position || 50, W);
          ctx.fillRect(px - lineWidth / 2, 0, lineWidth, H);
        }
        break;
      }

      case "color_zone": {
        // Colored panel region — used for split layouts, triptych panels, comparison zones
        ctx.save();
        if (el.opacity != null && el.opacity < 1) {
          ctx.globalAlpha = el.opacity;
        }
        // For color zones, use subtle gradient overlays instead of solid blocks
        // This preserves the underlying image while creating visual separation
        const isOverlayZone = el.overlay_style !== false; // default to overlay style
        if (isOverlayZone) {
          // Create subtle gradient overlay that preserves image detail
          const overlayGrad = ctx.createLinearGradient(ex, ey, ex, ey + eh);
          const baseColor = el.color || "#000000";
          const alpha = Math.min(0.4, el.opacity || 0.3); // cap opacity to preserve image
          overlayGrad.addColorStop(0, baseColor.replace('rgb', 'rgba').replace(')', `, ${alpha * 0.5})`));
          overlayGrad.addColorStop(0.5, baseColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`));
          overlayGrad.addColorStop(1, baseColor.replace('rgb', 'rgba').replace(')', `, ${alpha * 0.7})`));
          ctx.fillStyle = overlayGrad;
        } else {
          ctx.fillStyle = el.color || "#000000";
        }
        if (el.radius) {
          roundRect(ctx, ex, ey, ew, eh, el.radius);
          ctx.fill();
        } else {
          ctx.fillRect(ex, ey, ew, eh);
        }
        ctx.restore();
        break;
      }

      case "desaturate": {
        // "BEFORE" side — adds visible skin problems in NATURAL COLOR while preserving skin tone
        // Creates realistic blemish patterns: red spots, uneven patches, dullness
        // MAINTAINS natural flesh tones - never grayscale or monochrome
        const imageData = ctx.getImageData(ex, ey, ew, eh);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const px = (i / 4) % ew;
          const py = Math.floor((i / 4) / ew);
          // Acne/blemish pattern - realistic red inflamed spots
          const blemish1 = Math.sin(px * 0.23 + py * 0.47) * Math.cos(px * 0.31 + py * 0.19);
          const blemish2 = Math.sin(px * 0.17 + py * 0.29) * Math.cos(px * 0.41 + py * 0.13);
          if (blemish1 > 0.82 && blemish2 > 0.78) {
            // Red acne spots - increase red channel significantly
            data[i] = Math.min(255, data[i] + 45);     // strong red inflammation
            data[i + 1] = Math.max(0, data[i + 1] - 20); // reduce green (more red)
            data[i + 2] = Math.max(0, data[i + 2] - 25);  // reduce blue (more red)
          }
          // Patchy redness - uneven skin tone areas
          const patchiness = Math.sin(px * 0.08 + py * 0.12) * 0.5 + 0.5;
          if (patchiness > 0.65) {
            data[i] = Math.min(255, data[i] + 15);      // subtle red patches
            data[i + 1] = Math.max(0, data[i + 1] - 8);
            data[i + 2] = Math.max(0, data[i + 2] - 12);
          }
          // Overall dullness - reduce brightness but keep color balance
          const dimming = 0.85; // 15% darker but maintain ratios
          data[i] = Math.round(data[i] * dimming);
          data[i + 1] = Math.round(data[i + 1] * dimming);
          data[i + 2] = Math.round(data[i + 2] * dimming);
        }
        ctx.putImageData(imageData, ex, ey);
        break;
      }

      case "warm_glow": {
        // "AFTER" side: warm golden tones + brightness + saturation boost
        // Makes skin look healthy: glowing, even, warm, vibrant
        const imgData = ctx.getImageData(ex, ey, ew, eh);
        const d = imgData.data;
        const intensity = el.intensity || 0.5;
        for (let i = 0; i < d.length; i += 4) {
          // Warm golden shift
          d[i] = Math.min(255, d[i] + 25 * intensity);       // red warmth
          d[i + 1] = Math.min(255, d[i + 1] + 15 * intensity); // golden green
          d[i + 2] = Math.max(0, d[i + 2] - 15 * intensity);  // less blue = warm
          // Brightness boost
          d[i] = Math.min(255, d[i] + 20 * intensity);
          d[i + 1] = Math.min(255, d[i + 1] + 18 * intensity);
          d[i + 2] = Math.min(255, d[i + 2] + 8 * intensity);
          // Boost saturation — more vivid, alive
          const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
          const satBoost = 0.2 * intensity;
          d[i] = Math.min(255, Math.round(avg + (d[i] - avg) * (1 + satBoost)));
          d[i + 1] = Math.min(255, Math.round(avg + (d[i + 1] - avg) * (1 + satBoost)));
          d[i + 2] = Math.min(255, Math.round(avg + (d[i + 2] - avg) * (1 + satBoost)));
        }
        ctx.putImageData(imgData, ex, ey);
        break;
      }

      case "arrow": {
        // Draws an arrow from (x,y) to (x2,y2) — for annotations, callouts, comparisons
        const x2 = pct(el.x2 || el.x || 50, W);
        const y2 = pct(el.y2 || el.y || 50, H);
        const lineWidth = el.width || 4;
        const headSize = el.head_size || lineWidth * 4;
        ctx.save();
        ctx.strokeStyle = el.color || "#FFFFFF";
        ctx.fillStyle = el.color || "#FFFFFF";
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        // Draw line
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Draw arrowhead
        const angle = Math.atan2(y2 - ey, x2 - ex);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }

      case "circle": {
        // Draws a circle outline — for highlighting/annotating areas
        // ONLY render if target_element is specified and meaningful
        if (!el.target_element || el.target_element === "empty" || el.target_element === "none") {
          console.log(`    [Circle] Skipping annotation - no meaningful target specified`);
          break;
        }
        // CRITICAL: Check if circle position actually contains meaningful visual content
        // Sample the image at circle center to detect if there's actual content to highlight
        try {
          const centerX = ex + ew / 2;
          const centerY = ey + eh / 2;
          const sampleData = ctx.getImageData(centerX - 5, centerY - 5, 10, 10);
          const pixels = sampleData.data;
          let totalBrightness = 0;
          let colorVariance = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            totalBrightness += brightness;
            colorVariance += Math.abs(pixels[i] - pixels[i + 1]) + Math.abs(pixels[i + 1] - pixels[i + 2]);
          }
          const avgBrightness = totalBrightness / (pixels.length / 4);
          // Skip annotation if pointing at pure black/empty space (brightness < 20) or completely uniform area (no visual interest)
          if (avgBrightness < 20 || colorVariance < 100) {
            console.log(`    [Circle] Skipping annotation - pointing at empty/uniform area (brightness: ${Math.round(avgBrightness)}, variance: ${Math.round(colorVariance)})`);
            break;
          }
        } catch (e) {
          // If sampling fails, skip the annotation to be safe
          console.log(`    [Circle] Skipping annotation - could not sample image content`);
          break;
        }
        const radius = pct(el.radius_pct || 5, Math.min(W, H));
        const lineWidth = el.width || 3;
        ctx.save();
        ctx.strokeStyle = el.color || "#FF0000";
        ctx.lineWidth = lineWidth;
        if (el.dash) ctx.setLineDash(el.dash);
        ctx.beginPath();
        ctx.arc(ex + ew / 2, ey + eh / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
        if (el.fill_color) {
          ctx.fillStyle = el.fill_color;
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      default:
        console.log(`  [Render] Unknown element type: ${el.type}`);
    }
  }
  } // end pass loop
}

// ─── MAIN ENTRY POINT ──────────────────────────────────────────────────────────

import { scoreThumbnailStructure } from './thumbnail-structural-scorer.js';

const MAX_THUMBNAIL_ATTEMPTS = 3;
// PASS_THRESHOLD raised to 8: per Niels feedback that 7/10 outputs were
// "pretty bad", we now require the harsh critic to call it actually shippable.
const PASS_THRESHOLD = 8;
// Structural scorer is a HINT not a gate. It feeds into the retry context
// but doesn't block shipping. Reference distributions measure shape not soul.
const STRUCTURAL_HINT_FLOOR = 4;

export async function generateThumbnailV2(outputDir, title, topic, scriptText = "", niche = "", tone = "", _attempt = 1, _priorFeedback = null) {
  console.log("============================================================");
  console.log("VideoForge Thumbnail v2 (Context-Aware)" + (_attempt > 1 ? ` — RETRY ${_attempt}/${MAX_THUMBNAIL_ATTEMPTS}` : ""));
  console.log("============================================================");
  console.log("  Title: " + title);
  console.log("  Topic: " + topic);
  console.log("  Niche: " + (niche || "auto-detect"));
  console.log("  Script: " + (scriptText ? `${scriptText.length} chars` : "none"));
  if (_priorFeedback) {
    console.log("  Prior attempt scored: " + _priorFeedback.rating + "/10");
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: Claude analyzes the script and creates a thumbnail plan
  console.log("\n--- Step 1: Analyzing video context" + (_attempt > 1 ? ` (RETRY attempt ${_attempt})` : "") + " ---");
  const plan = await analyzeScript(title, scriptText, niche, tone, _priorFeedback);
  plan._attempt = _attempt;
  console.log("  Niche: " + plan.niche);
  // Extract text info from elements array if using freeform
  const textEls = (plan.elements || []).filter(e => e.type === "text");
  if (textEls.length > 0) {
    textEls.forEach((t, i) => console.log(`  Text ${i + 1}: "${t.content}" (${t.font_size || "auto"}) @ ${t.x}%,${t.y}%`));
  } else {
    console.log("  Hook: " + (plan.hook_text || "none"));
    if (plan.secondary_text) console.log("  Secondary: " + plan.secondary_text);
  }
  console.log("  Mood: " + plan.mood);
  console.log("  Elements: " + (plan.elements ? plan.elements.length + " layers (FREEFORM)" : "legacy template"));
  if (plan.click_triggers) console.log("  Click triggers: " + plan.click_triggers.join(", "));
  console.log("  Image: " + (plan.image_prompt || plan.photo_search_query || "").substring(0, 100) + "...");
  console.log("  Why: " + plan.why);

  // Step 2: Get images — route between REAL PHOTOS and AI GENERATION
  console.log("\n--- Step 2: Getting images ---");
  const nicheConfig = NICHES[plan.niche] || NICHES.education;
  // Env override for testing when fal.ai is down — bypasses AI generation entirely
  const forceRealPhoto = process.env.THUMBNAIL_FORCE_REAL_PHOTO === "1";
  const useRealPhoto = plan.use_real_photo === true || forceRealPhoto;
  if (forceRealPhoto && plan.use_real_photo !== true) {
    console.log("  [Override] THUMBNAIL_FORCE_REAL_PHOTO=1 — bypassing AI image generation");
  }

  let mainImageUrl = null;
  let suppImageUrl = null;
  let thirdImageUrl = null;

  // Helper to generate or search for an image
  const noTextSuffix = "IMPORTANT: absolutely no text, no words, no letters, no logos, no watermarks in the image. Pure visual only.";
  const imageStyle = plan.mood === "dark" || plan.mood === "mysterious" || plan.mood === "dramatic"
    ? "realistic_image"
    : "digital_illustration";

  async function getImage(prompt, label, preferReal = false) {
    if (!prompt) return null;
    if (preferReal) {
      const url = await searchRealPhoto(prompt, label);
      if (url) return url;
      console.log(`  [${label}] No real photo — falling back to AI`);
    }
    const safezone = plan.text_safe_zone ? ` Leave the ${plan.text_safe_zone} area darker/simpler for text overlay.` : '';
    const brightnessHint = plan.mood === "dark" || plan.mood === "mysterious" || plan.mood === "ominous" 
      ? "dramatic lighting with strong contrast, visible details even in shadows" 
      : "bright, well-lit, high contrast, vibrant colors";
    
    // Thumbnail optimization for complex 3D structures
    const thumbnailOpt = prompt.toLowerCase().includes('tesseract') || prompt.toLowerCase().includes('4th dimension') || prompt.toLowerCase().includes('hypercube')
      ? ' THUMBNAIL OPTIMIZED: maximum 6-8 visible structural elements, thick glowing edges, simplified geometry, no overlapping wireframes, bold clean lines readable at small scale.'
      : '';
    
    // Project coherence optimization for megaprojects/construction
    const projectCoherence = prompt.toLowerCase().includes('line city') || prompt.toLowerCase().includes('the line') || prompt.toLowerCase().includes('neom')
      ? ' Show distinctive linear mirror-clad architecture, long horizontal glass structures cutting through desert landscape, futuristic linear city design'
      : prompt.toLowerCase().includes('construction') || prompt.toLowerCase().includes('building') || prompt.toLowerCase().includes('expansion')
      ? ' Include recognizable architectural elements or project branding that identifies the specific development, not generic construction'
      : '';
    
    // Genre filtering to avoid overused visual tropes that trigger scroll-past behavior
    const genreFilter = plan.niche === 'history' 
      ? ' EDUCATIONAL DOCUMENTARY STYLE: historical photography, museum quality, archival imagery, classical paintings, archaeological documentation. AVOID: fantasy art, game aesthetics, horror mood, dark fantasy elements.'
      : plan.niche === 'tech' && (prompt.toLowerCase().includes('hack') || prompt.toLowerCase().includes('anonymous') || prompt.toLowerCase().includes('weapon') || prompt.toLowerCase().includes('astra') || prompt.toLowerCase().includes('cyber') || prompt.toLowerCase().includes('sold'))
      ? ' CYBER-SURVEILLANCE DOCUMENTARY STYLE: abstract digital surveillance networks, data interception visualization, network topology diagrams, code injection patterns, digital forensics imagery, dark web marketplace interfaces, encrypted communication channels. AVOID: server rooms, Guy Fawkes masks, hooded figures, generic computer labs, stock hacker photos, military weapons, physical armaments, gaming imagery.'
      : plan.niche === 'finance' && prompt.toLowerCase().includes('crash')
      ? ' FINANCIAL DATA VISUALIZATION: real market charts, trading floors, economic imagery, business photography. AVOID: generic explosion photos, stock disaster imagery.'
      : '';
    
    // SEMANTIC RELEVANCE FILTER: Match image content to title keywords
    const titleKeywords = title.toLowerCase();
    let semanticFilter = '';
    if (titleKeywords.includes('squeeze') || titleKeywords.includes('hole') || titleKeywords.includes('inch')) {
      semanticFilter = ' Show literal visual metaphors: tight spaces, narrow openings, cave entrances, small circular apertures with size comparison objects. Focus on scale demonstration and spatial constraints. AVOID: abstract tunnels, generic machinery, atmospheric backgrounds.';
    } else if (titleKeywords.includes('morning') || titleKeywords.includes('habits') || titleKeywords.includes('routine')) {
      semanticFilter = ' Show morning routine activities: meditation, exercise, journaling, healthy breakfast, sunrise, productivity setup. AVOID: random kitchen scenes, unrelated food prep, generic lifestyle imagery.';
    } else if (titleKeywords.includes('workout') || titleKeywords.includes('fitness') || titleKeywords.includes('exercise')) {
      semanticFilter = ' Show fitness and exercise activities directly related to the topic. AVOID: unrelated lifestyle scenes.';
    } else if (titleKeywords.includes('money') || titleKeywords.includes('income') || titleKeywords.includes('profit')) {
      semanticFilter = ' Show financial success imagery: money, investments, business success indicators. AVOID: unrelated lifestyle or kitchen scenes.';
    }
    // AUTHENTICITY FILTER: Avoid stock photo aesthetics that trigger scroll-past behavior
    const authenticityFilter = plan.niche === 'education' || plan.niche === 'health'
      ? ' AUTHENTIC DOCUMENTARY STYLE: candid real-world scenarios, natural lighting, unposed situations, documentary photography, genuine moments. AVOID: studio lighting, posed models, perfect staging, stock photo aesthetics, overly polished scenes.'
      : plan.niche === 'finance' || plan.niche === 'tech'
      ? ' CANDID PROFESSIONAL STYLE: real workplace scenarios, actual environments, natural professional settings. AVOID: staged corporate stock photos, posed business scenarios.'
      : ' NATURAL AUTHENTIC STYLE: real-world scenarios, candid moments, documentary approach. AVOID: staged stock photography, overly polished studio shots.';
    // SUBJECT IDENTITY ENFORCEMENT — every image query must contain the
    // title's primary subject so the resulting image cannot drift to a
    // tangential topic. This is the fix for "Roman Empire test produced
    // barbarian warrior images with no Rome anywhere."
    //
    // CAVEAT: when the subject is a named PERSON, do NOT inject the name —
    // stock photo libraries don't have celebrities. Pexels for "Bernie Madoff"
    // returns a random guy. Instead inject a scene/era anchor.
    const subj = (plan.primary_subject || "").trim();
    const subjectLower = subj.toLowerCase();
    const promptHasSubject = subjectLower && prompt.toLowerCase().includes(subjectLower);
    let subjectInjection = "";
    if (plan.subject_is_person) {
      // Don't inject the name; the planner should have anchored on a scene already
      subjectInjection = ` IMPORTANT: this is a faceless thumbnail — do NOT show any person's face. Show the place, era, artifact, or environment associated with the subject instead.`;
    } else if (subj && !promptHasSubject) {
      subjectInjection = ` MUST clearly depict ${subj} as the visual subject — ${subj} must be unmistakably present and recognizable.`;
    }
    const styledPrompt = `${prompt}.${subjectInjection}${safezone} ${brightnessHint}. Style: ${nicheConfig.imageStyle}. Mood: ${plan.mood}.${thumbnailOpt}${projectCoherence}${genreFilter}${semanticFilter}${authenticityFilter} ${noTextSuffix}`;
    let aiUrl = null;
    try { aiUrl = await generateRecraftImage(styledPrompt, imageStyle); } catch (_) {}
    if (aiUrl) return aiUrl;
    try { aiUrl = await generateFluxImage(styledPrompt); } catch (_) {}
    if (aiUrl) return aiUrl;
    // BOTH AI providers failed — fall through to Pexels rather than rendering
    // an empty gradient. The Pexels query MUST include the primary subject
    // or the fallback drifts off-topic (Roman Empire → barbarian warriors).
    console.log(`  [${label}] All AI providers failed — falling back to Pexels stock`);
    const baseQuery = plan.photo_search_query || prompt.split(/[,.]/)[0].substring(0, 80);
    let stockQuery;
    if (plan.subject_is_person) {
      // Strip the person's name — Pexels has no celebrities
      stockQuery = subj ? baseQuery.replace(new RegExp(subj, 'gi'), '').replace(/\s+/g, ' ').trim() : baseQuery;
    } else {
      stockQuery = (subj && !baseQuery.toLowerCase().includes(subjectLower))
        ? `${subj} ${baseQuery}`.substring(0, 100)
        : baseQuery;
    }
    console.log(`  [${label}/stock-fallback] Query: "${stockQuery}"`);
    try {
      const stock = await searchRealPhoto(stockQuery, label + "/stock-fallback");
      if (stock) return stock;
      // If subject-prefixed query found nothing, try the bare subject as a last resort
      if (subj && stockQuery !== subj) {
        console.log(`  [${label}/stock-fallback] Retrying with bare subject: "${subj}"`);
        const stock2 = await searchRealPhoto(subj, label + "/stock-fallback-subject");
        if (stock2) return stock2;
      }
    } catch (e) {
      console.log(`  [${label}] Pexels fallback also failed: ${e.message}`);
    }
    return null;
  }

  // BEFORE/AFTER PRIMITIVE: when archetype is before_after, run TWO separate
  // Pexels searches (one for problem state, one for result state). This kills
  // the desaturate/warm_glow filter hack and produces a real comparison.
  const isBeforeAfter = plan.archetype === "before_after" && plan.before_query && plan.after_query;
  if (isBeforeAfter) {
    console.log("  Mode: BEFORE/AFTER (two distinct Pexels searches)");
    console.log("  Before: " + plan.before_query);
    console.log("  After:  " + plan.after_query);
    [mainImageUrl, suppImageUrl] = await Promise.all([
      searchRealPhoto(plan.before_query, "Before"),
      searchRealPhoto(plan.after_query, "After"),
    ]);
    thirdImageUrl = null;
  } else if (useRealPhoto) {
    console.log("  Mode: REAL PHOTO (searching Pexels + Brave)");
    const subj = (plan.primary_subject || "").trim();
    const rawQuery = plan.photo_search_query || plan.image_prompt || topic;
    // Strip the named person from the search query — Pexels has no celebrities,
    // searching "Bernie Madoff" returns a random stock guy. Use the planner's
    // photo_search_query as-is (it should describe the scene), and never
    // prepend the person's name.
    let searchQuery;
    if (plan.subject_is_person) {
      // Strip the person name from the raw query if present
      const stripped = subj
        ? rawQuery.replace(new RegExp(subj, 'gi'), '').replace(/\s+/g, ' ').trim()
        : rawQuery;
      searchQuery = stripped || rawQuery;
      console.log("  [Person] Stripped name from search query — using scene-only");
    } else {
      searchQuery = (subj && !rawQuery.toLowerCase().includes(subj.toLowerCase()))
        ? `${subj} ${rawQuery}`.substring(0, 100)
        : rawQuery;
    }
    console.log("  Query: " + searchQuery);

    [mainImageUrl, suppImageUrl, thirdImageUrl] = await Promise.all([
      getImage(searchQuery, "Main", true),
      plan.supplementary_query ? getImage(plan.supplementary_query, "Supp", true) : Promise.resolve(null),
      plan.image_prompt_2 ? getImage(plan.image_prompt_2, "Third", true) : Promise.resolve(null),
    ]);
  } else {
    console.log("  Mode: AI GENERATION (Recraft V3 → Flux fallback)");

    [mainImageUrl, suppImageUrl, thirdImageUrl] = await Promise.all([
      getImage(plan.image_prompt, "Main"),
      plan.supplementary_query ? getImage(plan.supplementary_query, "Supp", true) : Promise.resolve(null),
      plan.image_prompt_2 ? getImage(plan.image_prompt_2, "Third") : Promise.resolve(null),
    ]);
  }

  console.log("  Main image: " + (mainImageUrl ? "✓" : "✗"));
  console.log("  Supplementary: " + (suppImageUrl ? "✓" : "—"));
  console.log("  Third image: " + (thirdImageUrl ? "✓" : "—"));

  // Step 3: Download images
  console.log("\n--- Step 3: Compositing thumbnail ---");
  let [mainImage, suppImage, thirdImage] = await Promise.all([
    mainImageUrl ? downloadImage(mainImageUrl) : Promise.resolve(null),
    suppImageUrl ? downloadImage(suppImageUrl) : Promise.resolve(null),
    thirdImageUrl ? downloadImage(thirdImageUrl) : Promise.resolve(null),
  ]);

  // BEFORE/AFTER FIX: If plan indicates duplicate_main_for_split, copy main image to supplementary
  // This ensures the SAME face appears on both sides of a before/after transformation
  if (plan.duplicate_main_for_split) {
    if (mainImage) {
      console.log("  [Split] Duplicating main image for before/after split");
      suppImage = mainImage;
    }
    // Also prevent secondary image generation when we want duplicates
    suppImageUrl = null;
  }

  // Step 4: Render with node-canvas
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Enable text anti-aliasing
  ctx.textDrawingMode = "path";
  ctx.antialias = "subpixel";

  // Route to the appropriate renderer based on category
  const renderMode = plan.render_mode;

  if (renderMode === "crash_chart" || renderMode === "iceberg" || renderMode === "pyramid") {
    // Category B — Programmatic structured visual
    console.log("  Renderer: PROGRAMMATIC (" + renderMode + ")");
    if (renderMode === "crash_chart") {
      renderCrashChart(ctx, plan);
    } else if (renderMode === "iceberg") {
      // Draw AI-generated iceberg image as background, then overlay labels
      if (mainImage) {
        drawCover(ctx, mainImage, 0, 0, WIDTH, HEIGHT);
      } else {
        // Fallback: draw programmatic iceberg base
        renderIceberg(ctx, plan);
      }
      // Always overlay the tier labels programmatically
      renderIcebergLabels(ctx, plan);
    } else if (renderMode === "pyramid") {
      renderPyramid(ctx, plan);
    }
    // Overlay any text/banner elements on top of the programmatic base
    if (plan.elements && Array.isArray(plan.elements)) {
      const textElements = plan.elements.filter(el => el.type === "text" || el.type === "banner");
      if (textElements.length > 0) {
        console.log("  Text overlay: " + textElements.length + " elements");
        renderFreeformComposition(ctx, textElements, mainImage, suppImage, thirdImage, plan);
      }
    }
  } else if (plan.elements && Array.isArray(plan.elements) && plan.elements.length > 0) {
    // Category A — Freeform composition with AI image background
    console.log("  Renderer: FREEFORM (" + plan.elements.length + " elements)");
    for (const el of plan.elements) {
      console.log("    → " + el.type + (el.content ? `: "${el.content}"` : "") + (el.role ? ` (${el.role})` : "") + ` @ ${el.x || 0}%,${el.y || 0}%`);
    }
    renderFreeformComposition(ctx, plan.elements, mainImage, suppImage, thirdImage, plan);
  } else {
    // Legacy fallback — use template layouts
    console.log("  Renderer: LEGACY TEMPLATE (no elements array)");
    const basePalette = plan.custom_palette && plan.custom_palette.bg
      ? { bg: plan.custom_palette.bg, text: plan.custom_palette.text || "#FFFFFF", accent: plan.custom_palette.accent || "#FF1744", highlight: plan.custom_palette.accent }
      : nicheConfig.palettes[plan.palette_index || 0] || nicheConfig.palettes[0];
    const palette = {
      ...basePalette,
      accent: plan.custom_palette?.accent || plan.accent_color || basePalette.accent,
      text: plan.text_color || basePalette.text || "#FFFFFF",
    };
    const layoutFn = LAYOUT_FUNCTIONS[plan.layout] || layoutFullBleedText;
    console.log("  Layout: " + plan.layout);
    layoutFn(ctx, mainImage, suppImage, plan.hook_text, palette, plan);
  }

  // Step 5: Save
  const pngPath = path.join(outputDir, "thumbnail-v2.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(pngPath, buffer);
  console.log("  Saved: " + pngPath + " (" + Math.round(buffer.length / 1024) + " KB)");

  // Save the plan for debugging/iteration
  const planPath = path.join(outputDir, "thumbnail-v2-plan.json");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log("  Plan: " + planPath);

  // Step 6a: Structural score — compares against the 140-reference distribution
  // for the thumbnail's niche. This is the primary quality gate that doesn't
  // share Claude's blind spots. Prefer the original reference-library niche
  // (e.g. "science") over the aliased rendering niche (e.g. "tech") so we
  // compare against the right distribution.
  console.log("\n--- Step 6a: Structural score (vs reference library) ---");
  let structuralScore = null;
  const scoringNiche = plan._reference_niche || plan.niche;
  try {
    structuralScore = scoreThumbnailStructure(plan, canvas, scoringNiche);
    console.log("  Structural: " + structuralScore.score + "/10 (n=" + structuralScore.niche_n + " refs in " + scoringNiche + ")");
    if (structuralScore.notes && structuralScore.notes.length > 0) {
      console.log("  Structural notes:");
      for (const n of structuralScore.notes) console.log("    - " + n);
    }
  } catch (e) {
    console.log("  [Structural] failed: " + e.message);
    structuralScore = { score: 5, deltas: {}, notes: ["scorer error: " + e.message] };
  }

  // Step 6b: MOBILE DOWNSCALE REVIEW — render the thumbnail at YouTube's
  // actual mobile feed size (168x94) and check whether it survives. Niels
  // feedback: "two thumbnails are too dark to see at mobile size — the 168x94
  // downscale review you should be doing would catch this."
  console.log("\n--- Step 6b: Mobile downscale review (168x94) ---");
  const mobileCanvas = createCanvas(168, 94);
  const mobileCtx = mobileCanvas.getContext("2d");
  mobileCtx.imageSmoothingEnabled = true;
  mobileCtx.imageSmoothingQuality = "high";
  mobileCtx.drawImage(canvas, 0, 0, 168, 94);
  const mobileBuffer = mobileCanvas.toBuffer("image/png");
  const mobilePath = path.join(outputDir, "thumbnail-v2-mobile.png");
  fs.writeFileSync(mobilePath, mobileBuffer);

  // Compute average luminance and dynamic range at mobile size — a hard
  // numeric check that catches "black rectangle" before we even ask Claude.
  let mobileLuminance = 0;
  let mobileMin = 255;
  let mobileMax = 0;
  try {
    const mdata = mobileCtx.getImageData(0, 0, 168, 94).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < mdata.length; i += 4) {
      const lum = 0.299 * mdata[i] + 0.587 * mdata[i + 1] + 0.114 * mdata[i + 2];
      sum += lum;
      if (lum < mobileMin) mobileMin = lum;
      if (lum > mobileMax) mobileMax = lum;
      n++;
    }
    mobileLuminance = sum / n;
  } catch (e) { /* noop */ }
  const mobileDynamicRange = mobileMax - mobileMin;
  console.log("  Mobile size: " + mobilePath);
  console.log("  Mobile luminance: avg=" + mobileLuminance.toFixed(0) + "/255, range=" + mobileDynamicRange.toFixed(0) + "/255");
  // Black-rectangle hard fail: very low average AND low dynamic range
  // means the thumbnail is essentially invisible at feed size.
  const isMobileBlackRect = mobileLuminance < 30 && mobileDynamicRange < 80;
  if (isMobileBlackRect) {
    console.log("  ✗ MOBILE BLACK RECTANGLE — too dark to see at 168x94, hard fail");
  }

  // Step 6c: Self-review — Claude critiques the FULL thumbnail
  console.log("\n--- Step 6c: Self-review (Claude critic) ---");
  const reviewResult = await selfReviewThumbnail(buffer, title, plan);
  console.log("  Critic rating: " + reviewResult.rating + "/10");
  if (reviewResult.problems && reviewResult.problems.length > 0) {
    console.log("  Problems found:");
    for (const p of reviewResult.problems) console.log("    - " + p);
  }
  // Apply mobile black-rectangle penalty
  if (isMobileBlackRect) {
    reviewResult.problems = [...(reviewResult.problems || []), "MOBILE BLACK RECTANGLE — at 168x94 the thumbnail is too dark to see (avg lum " + mobileLuminance.toFixed(0) + "/255, range " + mobileDynamicRange.toFixed(0) + "/255). Image needs more brightness or text needs a brighter contrasting backdrop."];
    reviewResult.rating = Math.min(reviewResult.rating, 3);
    reviewResult._mobile_black_rect = true;
  }
  reviewResult._mobile_luminance = Math.round(mobileLuminance);
  reviewResult._mobile_dynamic_range = Math.round(mobileDynamicRange);

  // The harsh critic is now the SOLE pass gate. Structural is a hint that
  // gets logged and fed into the retry context, but it doesn't block shipping.
  // Reference distributions measure structural shape, not "would a designer
  // ship this." Niels caught the scorer's blind spot when 7/10 / 9.26 outputs
  // were called "pretty bad" — we now trust the visual critic, not the math.
  reviewResult.structural_score = structuralScore.score;
  reviewResult.structural_notes = structuralScore.notes;
  reviewResult.structural_deltas = structuralScore.deltas;
  reviewResult.combined_rating = reviewResult.rating; // critic IS the rating
  if (reviewResult.designer_verdict) {
    console.log("  Designer verdict: " + reviewResult.designer_verdict);
  }

  // Save review
  const reviewPath = path.join(outputDir, "thumbnail-v2-review.json");
  fs.writeFileSync(reviewPath, JSON.stringify(reviewResult, null, 2));

  // Archetype contract violations also force a retry — a missing required
  // element is a hard failure even if the visual reviewer rates it high.
  // Hook context violations are also hard failures (numeric hooks need a "why").
  const archetypeViolations = plan._archetype_violations || [];
  const hookViolations = plan._hook_violations || [];
  const archetypeOk = archetypeViolations.length === 0;
  const hookOk = hookViolations.length === 0;

  if (reviewResult.rating >= PASS_THRESHOLD && archetypeOk && hookOk) {
    console.log("\n✅ Thumbnail v2 PASSED designer review! (" + reviewResult.rating + "/10) on attempt " + _attempt);
    return pngPath;
  }

  if (!archetypeOk) {
    console.log("\n⚠️  Archetype contract violations: " + archetypeViolations.join("; "));
  }
  if (!hookOk) {
    console.log("\n⚠️  Hook context violations: " + hookViolations.join("; "));
  }
  console.log("\n⚠️  Thumbnail v2 below pass threshold (" + reviewResult.rating + "/10, need " + PASS_THRESHOLD + ") on attempt " + _attempt);

  if (_attempt < MAX_THUMBNAIL_ATTEMPTS) {
    console.log(`   Retrying with reviewer feedback (attempt ${_attempt + 1}/${MAX_THUMBNAIL_ATTEMPTS})...`);
    // Preserve previous attempts for inspection
    try {
      const archiveDir = path.join(outputDir, `attempt-${_attempt}`);
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.copyFileSync(pngPath, path.join(archiveDir, 'thumbnail-v2.png'));
      fs.copyFileSync(planPath, path.join(archiveDir, 'thumbnail-v2-plan.json'));
      fs.copyFileSync(reviewPath, path.join(archiveDir, 'thumbnail-v2-review.json'));
    } catch (e) {
      console.log("   [archive] " + e.message);
    }
    return generateThumbnailV2(outputDir, title, topic, scriptText, niche, tone, _attempt + 1, reviewResult);
  }

  // Out of retries — keep the best of all attempts (current is the last; previous archived).
  console.log(`\n⚠️  Out of retries after ${MAX_THUMBNAIL_ATTEMPTS} attempts. Keeping best so far.`);
  try {
    let bestPath = pngPath;
    let bestRating = reviewResult.rating;
    for (let a = 1; a < _attempt; a++) {
      const arev = path.join(outputDir, `attempt-${a}`, 'thumbnail-v2-review.json');
      if (!fs.existsSync(arev)) continue;
      const r = JSON.parse(fs.readFileSync(arev, 'utf-8'));
      if ((r.rating || 0) > bestRating) {
        bestRating = r.rating;
        bestPath = path.join(outputDir, `attempt-${a}`, 'thumbnail-v2.png');
      }
    }
    if (bestPath !== pngPath) {
      console.log(`   Best attempt was ${bestRating}/10 — promoting it as final.`);
      fs.copyFileSync(bestPath, pngPath);
    }
  } catch (e) {
    console.log("   [best-of] " + e.message);
  }
  return pngPath;
}

// ─── SELF-REVIEW ────────────────────────────────────────────────────────────────
// After generating a thumbnail, send it to Claude for quality assessment.
// Claude sees the actual rendered image and rates it, flagging problems.
async function selfReviewThumbnail(imageBuffer, title, plan) {
  try {
    const base64 = imageBuffer.toString("base64");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: base64 }
          },
          {
            type: "text",
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
- Text covers the most interesting part of the image (face, focal subject, color contrast zone)
- Hook text is generic/disconnected from the title topic ("OVERDUE", "$847", "2030" with no clear subject anchor)
- Subject identity unclear (the title says "Yellowstone" but image could be any volcano)
- Banner labels that just restate the obvious ("ROME" on a colosseum image)
- Annotation circles/arrows pointing at nothing meaningful
- Visual hierarchy: two elements competing for the eye instead of ONE clear focal point
- Color palette feels random or uncoordinated
- Image looks like generic stock photography with no editorial intent
- Composition is "centered text + image background" with no design idea
- Designer's intentionality: does this LOOK like a person made a series of choices, or like an algorithm filled in slots?

Specific things that EARN higher ratings:
- A specific surprising visual hook that ties directly to the title's promise
- Text and image telling ONE coherent story together
- Restraint: 1-2 elements doing all the work, nothing extra
- A surprising image choice (unusual angle, unexpected subject framing)
- Color palette that supports the emotional tone with intent
- The viewer can tell what the video is about in 0.05 seconds without reading the title

Return ONLY valid JSON:
{
  "rating": 1-10,
  "would_use_on_real_channel": true/false,
  "designer_verdict": "one sentence — would a senior designer be proud or embarrassed and why",
  "specific_problems": ["concrete defects, not vague critiques"],
  "what_works": ["only list things that are genuinely good — empty array is fine"],
  "fix_instructions": "if rating < 8, the SINGLE most important thing to change. Not a list — the one thing."
}`
          }
        ]
      }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Normalize field names back to what the rest of the pipeline expects
      return {
        rating: parsed.rating,
        would_click: parsed.would_use_on_real_channel,
        designer_verdict: parsed.designer_verdict,
        problems: parsed.specific_problems || [],
        strengths: parsed.what_works || [],
        fix_instructions: parsed.fix_instructions || null,
      };
    }
    return { rating: 5, problems: ["Could not parse review"], strengths: [], fix_instructions: null };
  } catch (e) {
    console.log("  [Review] Failed: " + e.message);
    return { rating: 0, problems: ["Review failed: " + e.message], strengths: [], fix_instructions: null };
  }
}

// ─── CLI TEST ───────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].includes("thumbnail-v2")) {
  const title = process.argv[2] || "Top 10 Hidden Beaches in Portugal Nobody Knows About";
  const topic = process.argv[3] || "travel";
  const scriptFile = process.argv[4];
  const outDir = process.argv[5] || "./test-thumb-v2";
  let script = "";
  if (scriptFile && fs.existsSync(scriptFile)) {
    script = fs.readFileSync(scriptFile, "utf-8");
  }
  generateThumbnailV2(outDir, title, topic, script, topic)
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
}
