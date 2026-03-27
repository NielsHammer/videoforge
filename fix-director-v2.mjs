import fs from 'fs';

const file = '/opt/videoforge/src/director.js';
let code = fs.readFileSync(file, 'utf8');

const BANNED = ['kinetic_text','typewriter_reveal','neon_sign','glitch_text',
  'news_breaking','word_scatter','news_headline','bold_claim','text_flash','overlay_caption'];

// ── FIX 1: Theme hints — full replacement ─────────────────────────────────────
const oldThemeFunc = code.slice(
  code.indexOf('function getThemeAnimationHints(theme) {'),
  code.indexOf('\n}', code.indexOf('function getThemeAnimationHints(theme) {')) + 2
);

const newThemeFunc = `function getThemeAnimationHints(theme) {
  // Text-only animations removed — burned-in subtitles replace them.
  const hints = {
    green_matrix:   { prefer: ["stock_ticker","money_counter","alert_banner","count_up","trend_arrow","spotlight_stat"], avoid: ["polaroid_stack"] },
    blue_tech:      { prefer: ["stock_ticker","count_up","trend_arrow","spotlight_stat","compare_reveal","before_after"], avoid: ["polaroid_stack"] },
    cyber_purple:   { prefer: ["alert_banner","count_up","spotlight_stat","compare_reveal","before_after","highlight_build"], avoid: ["polaroid_stack"] },
    gold_luxury:    { prefer: ["spotlight_stat","money_counter","count_up","before_after","compare_reveal","percent_fill"], avoid: ["reaction_face"] },
    dark_minimal:   { prefer: ["spotlight_stat","count_up","before_after","compare_reveal","highlight_build","checkmark_build"], avoid: ["reaction_face"] },
    orange_fire:    { prefer: ["rocket_launch","reaction_face","count_up","trend_arrow","alert_banner","spotlight_stat"], avoid: ["polaroid_stack"] },
    red_impact:     { prefer: ["reaction_face","spotlight_stat","alert_banner","count_up","before_after","trend_arrow"], avoid: ["polaroid_stack"] },
    warm_sunset:    { prefer: ["reaction_face","lightbulb_moment","thumbs_up","checkmark_build","highlight_build","before_after"], avoid: [] },
    blue_minimal:   { prefer: ["highlight_build","checkmark_build","count_up","compare_reveal","before_after","spotlight_stat"], avoid: [] },
    creator_pink:   { prefer: ["phone_screen","tweet_card","social_counter","youtube_progress","reaction_face","before_after"], avoid: [] },
    blood_red:      { prefer: ["reaction_face","alert_banner","count_up","spotlight_stat","before_after","trend_arrow"], avoid: ["polaroid_stack"] },
    midnight_blue:  { prefer: ["spotlight_stat","count_up","compare_reveal","before_after","highlight_build","checkmark_build"], avoid: ["reaction_face"] },
    dark_horror:    { prefer: ["reaction_face","alert_banner","before_after","count_up","highlight_build","percent_fill"], avoid: ["polaroid_stack"] },
    default:        { prefer: ["spotlight_stat","count_up","checkmark_build","reaction_face","before_after","compare_reveal"], avoid: [] },
  };
  return hints[theme] || hints.default;
}`;

if (oldThemeFunc.length > 50) {
  code = code.replace(oldThemeFunc, newThemeFunc);
  console.log('✅ Fix 1: Theme hints completely replaced');
} else {
  console.log('❌ Fix 1: could not find theme function boundary');
}

// ── FIX 2: Remove banned types from validTypes ────────────────────────────────
for (const b of BANNED) {
  code = code.replace(new RegExp(`"${b}",?\\s*`, 'g'), '');
}
console.log('✅ Fix 2: Banned types removed from validTypes and all lists');

// ── FIX 3: Replace entire kinetic text post-processor ────────────────────────
// This section (lines ~1920-2055) is a typewriter_reveal factory
// Replace it entirely with a simple stock converter
const kineticStart = code.indexOf('  // ── KINETIC TEXT');
const kineticEnd = code.indexOf('\n  // Inject interrupt cards', kineticStart);

if (kineticStart > -1 && kineticEnd > -1) {
  const newKineticSection = `  // ── TEXT ANIMATION REMOVAL ─────────────────────────────────────────────────
  // kinetic_text and typewriter_reveal are banned — we have burned-in subtitles.
  // Convert any remaining text animations to stock using the clip's sentence.
  {
    const BANNED_TEXT = new Set(['kinetic_text','typewriter_reveal','neon_sign','glitch_text',
      'news_breaking','word_scatter','news_headline','bold_claim','text_flash','overlay_caption']);
    const biblePrefix = videoBible?.image_search_prefix || '';
    const stopWords = new Set(['the','and','but','for','with','this','that','have','from',
      'they','their','you','was','are','were','has','not','can','will','just','very','also']);
    for (let i = 0; i < allClips.length; i++) {
      if (!BANNED_TEXT.has(allClips[i].visual_type)) continue;
      const sentence = allClips[i].text || allClips[i].sentence || '';
      const keyWords = sentence.replace(/[^a-zA-Z\\s]/g,' ').split(/\\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
        .slice(0, 4).join(' ');
      const query = biblePrefix
        ? biblePrefix + ' ' + keyWords
        : keyWords || (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[i % 5];
      allClips[i].visual_type = 'stock';
      allClips[i].search_query = query;
      allClips[i].animation_data = null;
      allClips[i].chart_data = null;
    }
  }

`;
  code = code.slice(0, kineticStart) + newKineticSection + code.slice(kineticEnd);
  console.log('✅ Fix 3: Kinetic text factory replaced with stock converter');
} else {
  console.log('❌ Fix 3: could not find kinetic text section boundaries');
  // Fallback: patch the specific converter lines
  code = code.replace(/allClips\[i\]\.visual_type = "typewriter_reveal";/g,
    'allClips[i].visual_type = "stock"; allClips[i].animation_data = null;');
  code = code.replace(/clip\.visual_type = "typewriter_reveal";/g,
    'clip.visual_type = "stock"; clip.animation_data = null;');
  console.log('✅ Fix 3 (fallback): direct typewriter_reveal assignments patched');
}

// ── FIX 4: Stock-run-breaker — replace ALL typewriter_reveal mappings ─────────
code = code.replace(/"stock_ticker":\s*"typewriter_reveal"/g, '"stock_ticker": "spotlight_stat"');
code = code.replace(/"score_card":\s*"typewriter_reveal"/g, '"score_card": "spotlight_stat"');
code = code.replace(/"instagram_post":\s*"typewriter_reveal"/g, '"instagram_post": "stock"');
code = code.replace(/"youtube_card":\s*"typewriter_reveal"/g, '"youtube_card": "stock"');
code = code.replace(/"tweet_card":\s*"typewriter_reveal"/g, '"tweet_card": "stock"');
code = code.replace(/"phone_screen":\s*"typewriter_reveal"/g, '"phone_screen": "stock"');
code = code.replace(/"google_search":\s*"typewriter_reveal"/g, '"google_search": "stock"');
code = code.replace(/"alert_banner":\s*"typewriter_reveal"/g, '"alert_banner": "spotlight_stat"');
// Catch-all for any remaining typewriter_reveal in history replacements
code = code.replace(/\|\| "typewriter_reveal"/g, '|| "stock"');
code = code.replace(/: "typewriter_reveal"/g, ': "stock"');
console.log('✅ Fix 4: All stock-run-breaker mappings to typewriter_reveal replaced');

// ── FIX 5: Pass 2 fallback ────────────────────────────────────────────────────
const oldFallback = `      // For animation/infographic slots: build a kinetic_text from the sentence
      const words = (w.text || "").replace(/[^a-zA-Z0-9\\s]/g," ").split(/\\s+/)
        .filter(w => w.length > 3 && !/^(the|and|but|for|with|this|that|from|they|your|you|was|are|were|has|just|also|more|very)$/i.test(w));
      const lines = words.slice(0, 2).map(w => w.toUpperCase());
      if (lines.length >= 1) {
        return { start_time: w.start, end_time: w.end, visual_type: "kinetic_text",
          display_style: "framed", animation_data: { lines, style: "impact" },
          search_query: "", search_queries: null, subtitle_words: [] };
      }
      return makeStockClip(w, nicheInfo);`;
const newFallback = `      // All text animations banned — fall back to stock
      return makeStockClip(w, nicheInfo);`;

if (code.includes(oldFallback)) {
  code = code.replace(oldFallback, newFallback);
  console.log('✅ Fix 5: Pass 2 fallback no longer creates kinetic_text');
} else {
  console.log('❌ Fix 5: fallback not found');
}

// ── FIX 6: Assignment prompt — explicit ban ───────────────────────────────────
const oldCritical = `CRITICAL: If a window says REQUIRED_TYPE: spotlight_stat, you MUST return visual_type: "spotlight_stat" with proper animation_data. NOT kinetic_text. NOT stock.
If a window says REQUIRED_TYPE: money_counter, return money_counter. If REQUIRED_TYPE: reaction_face, return reaction_face. Follow the type exactly.`;

const newCritical = `CRITICAL RULES:
1. PERMANENTLY BANNED — never use these types under any circumstances:
   kinetic_text, typewriter_reveal, neon_sign, glitch_text, news_breaking,
   word_scatter, news_headline, bold_claim, text_flash, overlay_caption
   → If you were about to use any of these, use "stock" with a descriptive search_query instead.

2. Follow REQUIRED_TYPE exactly for all other types.
   REQUIRED_TYPE: spotlight_stat → return spotlight_stat with animation_data.
   REQUIRED_TYPE: money_counter → return money_counter. Etc.

3. When uncertain what to show, choose "stock" with a specific real-world search_query.
   Ask: what would a documentary camera show right now while the narrator says this?`;

if (code.includes(oldCritical)) {
  code = code.replace(oldCritical, newCritical);
  console.log('✅ Fix 6: Assignment prompt bans text animations explicitly');
} else {
  console.log('❌ Fix 6: critical section not found');
}

// ── FIX 7: Remove from niche rules in Pass 1 prompt ──────────────────────────
// Horror/true_crime/history still mention typewriter_reveal in niche rules
code = code.replace(/,\s*typewriter_reveal/g, '');
code = code.replace(/typewriter_reveal,\s*/g, '');
code = code.replace(/typewriter_reveal/g, 'stock');
code = code.replace(/,\s*kinetic_text/g, '');
code = code.replace(/kinetic_text,\s*/g, '');
code = code.replace(/kinetic_text/g, 'stock');
code = code.replace(/,\s*neon_sign/g, '');
code = code.replace(/neon_sign,\s*/g, '');
code = code.replace(/,\s*glitch_text/g, '');
code = code.replace(/glitch_text,\s*/g, '');
code = code.replace(/,\s*news_breaking/g, '');
code = code.replace(/news_breaking,\s*/g, '');
code = code.replace(/,\s*bold_claim/g, '');
code = code.replace(/bold_claim,\s*/g, '');
code = code.replace(/,\s*word_scatter/g, '');
code = code.replace(/word_scatter,\s*/g, '');
code = code.replace(/,\s*news_headline/g, '');
code = code.replace(/news_headline,\s*/g, '');
console.log('✅ Fix 7: All remaining banned type references purged');

fs.writeFileSync(file, code);

// Verify
const remaining = (code.match(/typewriter_reveal/g) || []).length;
const kineticLeft = (code.match(/kinetic_text/g) || []).length;
console.log(`\n📊 Remaining references: typewriter_reveal=${remaining}, kinetic_text=${kineticLeft}`);
console.log('✅ director.js saved');
