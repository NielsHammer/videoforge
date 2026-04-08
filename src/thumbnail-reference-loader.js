/**
 * Reference blueprint loader and selector for the thumbnail planner.
 *
 * Loads all 140 thumbnail-references/<niche>/*.json blueprints once at
 * startup and exposes selectRelevantReferences() which picks the top N
 * blueprints most similar to the current video by:
 *   - Niche match (with alias resolution)
 *   - Topic keyword overlap with the reference's title_reference
 *   - Emotional trigger overlap (when planner provides target emotion)
 *
 * Then formatReferenceContext() extracts the actual design_reasoning,
 * text_hierarchy reasoning, color reasoning, and design_patterns from
 * each picked blueprint and formats them into a prompt block for Claude.
 *
 * Niels: "we need human design quality... we rely mainly on claude api
 * to really explain and put it together with human accuracy and human
 * intelligence... it's context based, society based, it's human thinking
 * designing we need."
 *
 * The structural scorer was using these blueprints as numerical distance
 * metrics. That throws away the actual intelligence. This module surfaces
 * the *reasoning* the human designers used so the planner can think the
 * same way, not just match the same distributions.
 */
import fs from 'fs';
import path from 'path';

const REFERENCES_DIR = '/opt/videoforge/thumbnail-references';
const VIDEO_LIBRARY_DIR = '/opt/videoforge/video-library';

let _allRefs = null;

// Map niches that exist as reference dirs but not as direct planner niches.
// These also map to the inferTitleNiche tags so the video-library can be
// filtered by visual-style proximity. Tight matches only — broader bleeds
// produce wrong-vibe references (dropshipping for a Yellowstone thumbnail).
const NICHE_NEIGHBORS = {
  science: ['science', 'space', 'disaster_science'],
  finance: ['finance'],
  tech: ['tech', 'mystery'],
  health: ['health', 'self_improvement'],
  history: ['history', 'mystery'],
  horror: ['mystery', 'history'],
  space: ['space', 'science'],
  nature: ['nature', 'disaster_science', 'science'],
  travel: ['nature', 'history'],
  entertainment: ['entertainment'],
  education: ['science', 'self_improvement'],
  self_improvement: ['self_improvement', 'health'],
  military: ['history', 'tech'],
  retirement: ['finance'],
};

function loadAll() {
  if (_allRefs) return _allRefs;
  _allRefs = [];
  if (!fs.existsSync(REFERENCES_DIR)) return _allRefs;
  for (const niche of fs.readdirSync(REFERENCES_DIR)) {
    if (niche.startsWith('_')) continue;
    const nicheDir = path.join(REFERENCES_DIR, niche);
    let stat;
    try { stat = fs.statSync(nicheDir); } catch (e) { continue; }
    if (!stat.isDirectory()) continue;
    for (const f of fs.readdirSync(nicheDir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const bp = JSON.parse(fs.readFileSync(path.join(nicheDir, f), 'utf-8'));
        if (!bp.meta || !bp.design_reasoning) continue;
        _allRefs.push({ niche, file: f, ...bp });
      } catch (e) {
        // skip malformed
      }
    }
  }
  return _allRefs;
}

// Score a reference's relevance to the current video.
// Higher = more relevant. Hard floor: must be from a neighbor niche.
function scoreRelevance(ref, title, niche, targetEmotion) {
  const neighbors = NICHE_NEIGHBORS[niche] || [niche];
  if (!neighbors.includes(ref.niche)) return -1;

  let score = 0;
  // Niche exact-match bonus
  if (ref.niche === niche) score += 10;

  // Topic keyword overlap with the reference's title_reference
  const titleWords = new Set(
    title.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  );
  const refTitleWords = new Set(
    (ref.meta?.title_reference || '').toLowerCase().split(/\W+/).filter(w => w.length > 3)
  );
  let overlap = 0;
  for (const w of titleWords) if (refTitleWords.has(w)) overlap++;
  score += overlap * 8;

  // Emotional trigger match (when planner specifies target)
  if (targetEmotion && ref.emotional_triggers?.primary_trigger) {
    const trig = ref.emotional_triggers.primary_trigger.toLowerCase();
    if (trig.includes(targetEmotion.toLowerCase())) score += 6;
  }

  // Mood proximity (if both reference and intended mood share a vibe word)
  const vibes = ['dread', 'awe', 'curious', 'aspir', 'shock', 'mystery', 'urgent', 'forbidden', 'reveal'];
  for (const v of vibes) {
    if ((ref.meta?.mood || '').toLowerCase().includes(v)) score += 0.5;
  }

  return score;
}

// Pick the top N actual thumbnail.jpg files from video-library most relevant
// to the current title+niche. Returns [{path, title, channel, views, niche}].
// These are loaded as vision attachments in the planner so Claude can SEE
// what good thumbnails look like, not just read JSON descriptions.
let _videoLib = null;
function loadVideoLibrary() {
  if (_videoLib) return _videoLib;
  _videoLib = [];
  if (!fs.existsSync(VIDEO_LIBRARY_DIR)) return _videoLib;
  for (const id of fs.readdirSync(VIDEO_LIBRARY_DIR)) {
    const dir = path.join(VIDEO_LIBRARY_DIR, id);
    let stat;
    try { stat = fs.statSync(dir); } catch (e) { continue; }
    if (!stat.isDirectory()) continue;
    const metaFile = path.join(dir, 'metadata.json');
    const thumbFile = path.join(dir, 'thumbnail.jpg');
    if (!fs.existsSync(metaFile) || !fs.existsSync(thumbFile)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
      if (!m.title || !m.viewCount) continue;
      _videoLib.push({
        id,
        title: m.title,
        channel: m.channel,
        views: m.viewCount,
        path: thumbFile,
        thumbBytes: stat.isFile() ? fs.statSync(thumbFile).size : 0,
      });
    } catch (e) {}
  }
  return _videoLib;
}

// Heuristic niche tags from title keywords — used to score relevance when
// the video-library doesn't store niche directly. A title can match multiple
// tags so we get broader matches and better fallback options.
function inferTitleNiche(title) {
  const t = (title || '').toLowerCase();
  const tags = new Set();
  if (/\b(rocket|space|nasa|planet|galaxy|cosmos|star|stars|black hole|moon|mars|jupiter|saturn|venus|mercury|pluto|alien|universe|dimension|astronomy|astronomical|orbit|cosmic|astrophysics)\b/.test(t)) tags.add('space');
  if (/\b(ai|artificial intelligence|robot|hack|hacker|hacking|cyber|crypto|computer|machine learning|neural|tech|software|hardware|program|coding|algorithm|silicon|chip)\b/.test(t)) tags.add('tech');
  if (/\b(invest|investing|stock|stocks|crypto|bitcoin|money|millionaire|million|billion|trillion|wealth|finance|broke|rich|profit|loss|crash|market|economy|recession|inflation|debt|tax|salary|pension|fund|hedge|portfolio|trading|trader|trade|ponzi|fraud|madoff)\b/.test(t)) tags.add('finance');
  if (/\b(volcano|earthquake|trench|ocean|deep sea|mariana|marianas|yellowstone|caldera|tsunami|hurricane|tornado|asteroid|meteor|extinction|disaster|geology|geological|magma|tectonic|fault|seismic)\b/.test(t)) tags.add('disaster_science');
  if (/\b(animal|wildlife|jungle|forest|species|amazon|reef|coral|whale|shark|wolf|bear|tiger|lion|elephant|extinct|biology|ecosystem)\b/.test(t)) tags.add('nature');
  if (/\b(history|ancient|empire|war|world war|king|queen|battle|rome|roman|medieval|civilization|dynasty|century|bc|ad|pharaoh|emperor|knight|viking|nazi|soviet|cold war)\b/.test(t)) tags.add('history');
  if (/\b(diet|health|food|nutrition|brain|sleep|exercise|fitness|mental|workout|body|muscle|fat|weight|sugar|hormone|insulin|cancer|heart|disease|cholesterol|protein|avocado|carb|keto|vegan|vitamin)\b/.test(t)) tags.add('health');
  if (/\b(physics|chemistry|biology|science|scientific|experiment|theory|quantum|atom|particle|relativity|entropy|antimatter|laser|fusion|fission|gravity|magnetism|electron|proton|neutron|dna|gene|cell)\b/.test(t)) tags.add('science');
  if (/\b(country|countries|china|chinese|russia|russian|north korea|south korea|america|american|usa|europe|european|africa|asian|geopolitics|politics|political|election|leader|president|prime minister|government|nation|nations)\b/.test(t)) tags.add('geopolitics');
  if (/\b(motivation|motivational|discipline|habit|habits|routine|success|mindset|productivity|stoic|stoicism|wisdom|self help|self improvement|focus|goals|achievement)\b/.test(t)) tags.add('self_improvement');
  if (/\b(mystery|mysterious|secret|secrets|conspiracy|hidden|forbidden|dark|cult|paranormal|unsolved|cold case|crime|murder|killer|haunted|disappear|vanish|vanished|missing)\b/.test(t)) tags.add('mystery');
  return tags;
}

export function selectReferenceThumbnailImages(title, niche, n = 4) {
  const lib = loadVideoLibrary();
  if (lib.length === 0) return [];
  const titleWords = new Set((title || '').toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const nicheTagSet = new Set([niche, ...(NICHE_NEIGHBORS[niche] || [])]);
  const titleTags = inferTitleNiche(title);

  const scored = lib.map(v => {
    let score = 0;
    const vTags = inferTitleNiche(v.title);
    // Hard niche match — must share at least one tag with the title or niche
    let hasNicheMatch = false;
    for (const tag of titleTags) if (vTags.has(tag)) { score += 10; hasNicheMatch = true; }
    for (const tag of nicheTagSet) if (vTags.has(tag)) { score += 5; hasNicheMatch = true; }
    // Title keyword overlap (exact word match)
    const vWords = (v.title || '').toLowerCase().split(/\W+/);
    for (const w of vWords) if (titleWords.has(w)) score += 6;
    // Tiny view tiebreaker — log10 / 4 so a 10M-view video only gets +1.75
    score += Math.log10(Math.max(1, v.views)) / 4;
    return { ...v, _score: score, _hasNicheMatch: hasNicheMatch };
  });
  // Prefer niche-matched candidates; fall back to others only if needed
  const matched = scored.filter(s => s._hasNicheMatch).sort((a, b) => b._score - a._score);
  const unmatched = scored.filter(s => !s._hasNicheMatch).sort((a, b) => b._score - a._score);
  const out = matched.slice(0, n);
  // Pad from unmatched only if we don't have enough niche-matched references
  while (out.length < n && unmatched.length > 0) out.push(unmatched.shift());
  return out;
}

export function selectRelevantReferences(title, niche, n = 4, targetEmotion = null) {
  const all = loadAll();
  const scored = all
    .map(r => ({ ref: r, score: scoreRelevance(r, title, niche, targetEmotion) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(x => x.ref);
}

// Build the reference context block injected into the planner prompt.
// Surfaces the actual design reasoning the human designers used.
export function formatReferenceContext(references) {
  if (!references || references.length === 0) return '';
  const lines = [
    '═══ REAL DESIGNER EXAMPLES — STUDY THEIR THINKING, DO NOT COPY THEIR ELEMENTS ═══',
    '',
    'Below are ' + references.length + ' real high-performing YouTube thumbnails that real designers made for similar videos. For each one, you will see WHAT they did and WHY they made each choice. Your job is NOT to copy their layout or their text — your job is to think like they thought. A senior designer adapts thinking, not templates.',
    '',
    'Read each example carefully. Notice how every design decision (the hook word, the color, the position, the layout) is justified by an emotional or psychological reason — not by a template. Then make YOUR design with that same level of intentionality.',
    '',
  ];
  references.forEach((ref, i) => {
    lines.push(`──── Reference ${i + 1}/${references.length} (${ref.niche}) ────`);
    if (ref.meta?.title_reference) lines.push(`Original video: "${ref.meta.title_reference}"`);
    if (ref.meta?.layout_type) lines.push(`Layout type: ${ref.meta.layout_type}`);
    if (ref.meta?.mood) lines.push(`Mood: ${ref.meta.mood}`);

    // Hook text + why
    const t = ref.text_hierarchy?.[0];
    if (t) {
      lines.push('');
      lines.push(`HOOK TEXT: "${t.content}"`);
      if (t.why_this_text) lines.push(`  why this hook works: ${t.why_this_text}`);
      if (t.why_this_size) lines.push(`  why this size: ${t.why_this_size}`);
      if (t.why_this_position) lines.push(`  why this position: ${t.why_this_position}`);
    }

    // Layout reasoning
    if (ref.design_reasoning?.why_this_layout) {
      lines.push('');
      lines.push(`WHY THIS LAYOUT: ${ref.design_reasoning.why_this_layout}`);
    }
    if (ref.design_reasoning?.why_these_colors) {
      lines.push(`WHY THESE COLORS: ${ref.design_reasoning.why_these_colors}`);
    }
    if (ref.design_reasoning?.what_makes_someone_click) {
      lines.push(`WHAT MAKES SOMEONE CLICK: ${ref.design_reasoning.what_makes_someone_click}`);
    }

    // Composition
    if (ref.composition?.why_this_composition) {
      lines.push(`COMPOSITION REASONING: ${ref.composition.why_this_composition}`);
    }

    // Emotional trigger
    if (ref.emotional_triggers?.primary_trigger) {
      lines.push(`PRIMARY EMOTIONAL TRIGGER: ${ref.emotional_triggers.primary_trigger}`);
    }
    if (ref.emotional_triggers?.curiosity_gap) {
      lines.push(`CURIOSITY GAP: ${ref.emotional_triggers.curiosity_gap}`);
    }

    // Pattern technique
    if (ref.design_patterns?.technique) {
      lines.push(`DESIGN TECHNIQUE: ${ref.design_patterns.technique}`);
    }
    if (ref.design_patterns?.why_it_works && Array.isArray(ref.design_patterns.why_it_works)) {
      lines.push(`WHY IT WORKS:`);
      for (const w of ref.design_patterns.why_it_works.slice(0, 4)) lines.push(`  - ${w}`);
    }

    // Color palette
    if (ref.color_palette?.palette_reasoning) {
      lines.push(`PALETTE REASONING: ${ref.color_palette.palette_reasoning}`);
    }
    if (Array.isArray(ref.color_palette?.hex_list)) {
      lines.push(`PALETTE: ${ref.color_palette.hex_list.join(' ')}`);
    }

    // Anti-patterns: things to avoid that the reference designer explicitly identified
    if (Array.isArray(ref.design_patterns?.anti_patterns) && ref.design_patterns.anti_patterns.length > 0) {
      lines.push(`AVOID (per this designer):`);
      for (const a of ref.design_patterns.anti_patterns.slice(0, 3)) lines.push(`  ✗ ${a}`);
    }

    lines.push('');
  });

  lines.push('═══ END REFERENCES ═══');
  lines.push('');
  lines.push('Now design YOUR thumbnail with the same level of human intentionality these designers showed. Every choice you make — the hook word, the color, the position, the image scene — must have a specific psychological reason behind it that you can articulate in your "why" field. If you cannot articulate WHY a choice was made, do not make it.');
  lines.push('');
  return lines.join('\n');
}
