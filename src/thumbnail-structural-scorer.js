/**
 * Structural similarity scorer for thumbnail-v2.
 *
 * Loads the 140 reference blueprints once on import, indexes them by niche,
 * computes per-niche distributions of structural features (text area ratio,
 * focal point Y position, color count, contrast), and exposes a single
 * `scoreThumbnailStructure` function that takes a generated plan + canvas
 * and returns a 0-10 structural score plus per-feature deltas.
 *
 * This exists because Claude-reviews-Claude collapses into the same blind
 * spots as Claude-generates. The reference library is real ground truth:
 * 140 hand-analyzed top-performing thumbnails. Structural distance to that
 * distribution is a much harder signal to gaslight.
 */
import fs from 'fs';
import path from 'path';

const REFERENCES_DIR = '/opt/videoforge/thumbnail-references';

let _refsByNiche = null;
let _statsByNiche = null;

function loadReferences() {
  if (_refsByNiche) return _refsByNiche;
  _refsByNiche = {};
  const niches = fs.readdirSync(REFERENCES_DIR).filter(d => {
    const full = path.join(REFERENCES_DIR, d);
    return fs.statSync(full).isDirectory() && !d.startsWith('_');
  });
  for (const niche of niches) {
    const dir = path.join(REFERENCES_DIR, niche);
    const refs = [];
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const blueprint = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        const features = extractRefFeatures(blueprint);
        if (features) refs.push({ file: f, ...features });
      } catch (e) {
        // skip malformed
      }
    }
    if (refs.length > 0) _refsByNiche[niche] = refs;
  }
  return _refsByNiche;
}

// Pull a feature vector out of a reference blueprint
function extractRefFeatures(bp) {
  if (!bp || !bp.composition) return null;
  const comp = bp.composition;
  const palette = bp.color_palette || {};
  const text = (bp.text_hierarchy && bp.text_hierarchy[0]) || {};
  const focal = (comp.focal_points && comp.focal_points[0]) || {};

  return {
    text_area_ratio: typeof comp.text_area_ratio === 'number' ? comp.text_area_ratio : null,
    image_area_ratio: typeof comp.image_area_ratio === 'number' ? comp.image_area_ratio : null,
    focal_x: typeof focal.x_ratio === 'number' ? focal.x_ratio : null,
    focal_y: typeof focal.y_ratio === 'number' ? focal.y_ratio : null,
    color_count: Array.isArray(palette.hex_list) ? palette.hex_list.length : null,
    text_size_ratio: typeof text.size_ratio === 'number' ? text.size_ratio : null,
    text_word_count: typeof text.content === 'string' ? text.content.split(/\s+/).filter(Boolean).length : null,
    composition_rule: comp.rule || null,
  };
}

function computeStats() {
  if (_statsByNiche) return _statsByNiche;
  const refs = loadReferences();
  _statsByNiche = {};
  for (const [niche, items] of Object.entries(refs)) {
    const stats = {};
    for (const key of ['text_area_ratio', 'focal_y', 'color_count', 'text_size_ratio', 'text_word_count']) {
      const vals = items.map(i => i[key]).filter(v => typeof v === 'number');
      if (vals.length === 0) continue;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      const stddev = Math.sqrt(variance);
      vals.sort((a, b) => a - b);
      stats[key] = {
        mean,
        stddev,
        min: vals[0],
        max: vals[vals.length - 1],
        p10: vals[Math.floor(vals.length * 0.1)],
        p90: vals[Math.floor(vals.length * 0.9)],
        n: vals.length,
      };
    }
    _statsByNiche[niche] = stats;
  }
  return _statsByNiche;
}

// Extract features from a generated thumbnail's plan + rendered canvas
export function extractGeneratedFeatures(plan, canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');

  // Text area: sum of bbox areas of text + banner elements
  let textArea = 0;
  let textWordCount = 0;
  let primaryTextSizeRatio = 0;
  if (Array.isArray(plan.elements)) {
    for (const el of plan.elements) {
      if (el.type === 'text' || el.type === 'banner') {
        const w = (el.max_w || el.w || 0) / 100;
        const h = (el.max_h || el.h || 0) / 100;
        textArea += w * h;
        if (el.type === 'text' && el.content) {
          const wc = String(el.content).split(/\s+/).filter(Boolean).length;
          textWordCount += wc;
          // Approximate text size ratio: ratio of text BLOCK HEIGHT to canvas height.
          // References measure this as size_ratio (e.g. 0.18 for "DO NOT JOIN" at 18% of canvas height).
          // The renderer's font categories don't map 1:1 — a "massive" hook on one line is ~0.18-0.22
          // of canvas height, not 0.45 (which was the bbox MAX, not the actual rendered size).
          const sizeMap = { massive: 0.18, large: 0.14, medium: 0.10, small: 0.07 };
          const r = sizeMap[el.font_size] || 0.14;
          primaryTextSizeRatio = Math.max(primaryTextSizeRatio, r);
        }
      }
    }
  }

  // Dominant color count: quantize aggressively and count only colors that
  // occupy ≥2% of the canvas. This matches how reference blueprints count
  // dominant colors (typically 5-7 entries in color_palette.hex_list), NOT
  // the raw distinct color count which is always in the dozens for any
  // photographic image. The previous version was comparing apples to oranges
  // and producing 50-100σ deviations on every thumbnail.
  let colorCount = null;
  try {
    const tmp = ctx.getImageData(0, 0, W, H);
    const buckets = new Map();
    const stepX = Math.max(1, Math.floor(W / 80));
    const stepY = Math.max(1, Math.floor(H / 45));
    let total = 0;
    for (let y = 0; y < H; y += stepY) {
      for (let x = 0; x < W; x += stepX) {
        const i = (y * W + x) * 4;
        // Quantize to 3-bit per channel (8 values per channel = 512 buckets)
        const r = tmp.data[i] >> 5;
        const g = tmp.data[i + 1] >> 5;
        const b = tmp.data[i + 2] >> 5;
        const key = (r << 6) | (g << 3) | b;
        buckets.set(key, (buckets.get(key) || 0) + 1);
        total++;
      }
    }
    // Count only buckets that occupy ≥2% of sampled pixels
    const threshold = Math.max(1, total * 0.02);
    let dominant = 0;
    for (const count of buckets.values()) {
      if (count >= threshold) dominant++;
    }
    colorCount = dominant;
  } catch (e) {
    colorCount = null;
  }

  // Focal Y: weighted center of the busiest 1/9 region in the canvas.
  // Approximated by finding which 3x3 cell has the highest variance.
  let focalY = null;
  try {
    let maxVar = -1;
    let bestRow = 1;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cellW = Math.floor(W / 3);
        const cellH = Math.floor(H / 3);
        const data = ctx.getImageData(col * cellW, row * cellH, cellW, cellH).data;
        let mean = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 16) {
          mean += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          n++;
        }
        mean /= n;
        let dev = 0;
        for (let i = 0; i < data.length; i += 16) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          dev += Math.abs(lum - mean);
        }
        dev /= n;
        if (dev > maxVar) {
          maxVar = dev;
          bestRow = row;
        }
      }
    }
    focalY = (bestRow + 0.5) / 3;
  } catch (e) {
    focalY = null;
  }

  return {
    text_area_ratio: textArea,
    focal_y: focalY,
    color_count: colorCount,
    text_size_ratio: primaryTextSizeRatio,
    text_word_count: textWordCount,
  };
}

// Compare a generated thumbnail's features against the niche's reference
// distribution. Returns { score: 0-10, deltas: {...}, notes: [] }.
export function scoreThumbnailStructure(plan, canvas, niche) {
  const stats = computeStats();
  const ref = stats[niche] || stats.education;
  if (!ref) return { score: 5, deltas: {}, notes: ['no reference stats available'] };

  const gen = extractGeneratedFeatures(plan, canvas);
  const deltas = {};
  const notes = [];
  let totalPenalty = 0;
  let weighted = 0;

  // Per-feature z-score penalty
  const weights = {
    text_area_ratio: 1.5,
    color_count: 1.0,
    focal_y: 0.8,
    text_size_ratio: 1.2,
    text_word_count: 1.0,
  };

  for (const [key, weight] of Object.entries(weights)) {
    if (!ref[key] || typeof gen[key] !== 'number') continue;
    const z = ref[key].stddev > 0 ? Math.abs(gen[key] - ref[key].mean) / ref[key].stddev : 0;
    deltas[key] = {
      generated: round(gen[key]),
      ref_mean: round(ref[key].mean),
      ref_stddev: round(ref[key].stddev),
      z_score: round(z),
    };
    // Penalty grows quadratically beyond 1 stddev, capped at 3
    const clipped = Math.min(z, 3);
    const penalty = clipped > 1 ? (clipped - 1) ** 2 : 0;
    totalPenalty += penalty * weight;
    weighted += weight;

    // Human-readable note when significantly off
    if (z > 2) {
      const dir = gen[key] > ref[key].mean ? 'above' : 'below';
      notes.push(`${key} is ${z.toFixed(1)}σ ${dir} the ${niche} reference range (gen=${round(gen[key])}, ref mean=${round(ref[key].mean)})`);
    }
  }

  // Convert total penalty to a 0-10 score. 0 penalty = 10, 8+ penalty ≈ 0.
  const normalized = weighted > 0 ? totalPenalty / weighted : 0;
  const score = Math.max(0, Math.min(10, 10 - normalized * 4));

  return {
    score: round(score),
    deltas,
    notes,
    niche_n: ref.text_area_ratio?.n || 0,
  };
}

function round(v) {
  if (typeof v !== 'number') return v;
  return Math.round(v * 100) / 100;
}

// Initialize on import so the first call is cheap
loadReferences();
computeStats();
