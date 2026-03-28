import fs from 'fs';

const file = '/opt/videoforge/src/director.js';
let code = fs.readFileSync(file, 'utf8');
const original = code;

// ── FIX 1: Theme hints — full function replacement ────────────────────────────
const themeStart = code.indexOf('function getThemeAnimationHints(theme) {');
const themeEnd = code.indexOf('\n}', themeStart) + 2;

if (themeStart > -1) {
  const newTheme = `function getThemeAnimationHints(theme) {
  // Text-only animations removed — we have burned-in subtitles.
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
  code = code.slice(0, themeStart) + newTheme + code.slice(themeEnd);
  console.log('✅ Fix 1: Theme hints replaced');
} else {
  console.log('❌ Fix 1: theme function not found');
}

// ── FIX 2: Remove banned types from validTypes ONLY ──────────────────────────
// Only touch the validTypes array, not the whole file
const validStart = code.indexOf('  const validTypes = [');
const validEnd = code.indexOf('\n  ];', validStart) + 5;
if (validStart > -1) {
  let validSection = code.slice(validStart, validEnd);
  const banned = ['kinetic_text','typewriter_reveal','neon_sign','glitch_text',
    'news_breaking','word_scatter','news_headline','bold_claim','text_flash','overlay_caption'];
  for (const b of banned) {
    validSection = validSection.replace(new RegExp(`"${b}",?\\s*`, 'g'), '');
  }
  code = code.slice(0, validStart) + validSection + code.slice(validEnd);
  console.log('✅ Fix 2: Banned types removed from validTypes only');
} else {
  console.log('❌ Fix 2: validTypes not found');
}

// ── FIX 3: animRotation in enforcePlan — remove banned types ─────────────────
const animRotStart = code.indexOf('  const animRotation = [');
const animRotEnd = code.indexOf('\n  ];', animRotStart) + 5;
if (animRotStart > -1) {
  let animSection = code.slice(animRotStart, animRotEnd);
  const banned = ['kinetic_text','typewriter_reveal','neon_sign','glitch_text',
    'news_breaking','word_scatter','news_headline','bold_claim'];
  for (const b of banned) {
    animSection = animSection.replace(new RegExp(`"${b}",?\\s*`, 'g'), '');
  }
  code = code.slice(0, animRotStart) + animSection + code.slice(animRotEnd);
  console.log('✅ Fix 3: Banned types removed from animRotation');
} else {
  console.log('❌ Fix 3: animRotation not found');
}

// ── FIX 4: Pass 2 fallback — kinetic_text → stock ────────────────────────────
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
const newFallback = `      // Text animations banned — use stock
      return makeStockClip(w, nicheInfo);`;
if (code.includes(oldFallback)) {
  code = code.replace(oldFallback, newFallback);
  console.log('✅ Fix 4: Pass 2 fallback uses stock not kinetic_text');
} else {
  console.log('❌ Fix 4: fallback not found');
}

// ── FIX 5: Assignment prompt — add banned list ────────────────────────────────
const oldCritical = `CRITICAL: If a window says REQUIRED_TYPE: spotlight_stat, you MUST return visual_type: "spotlight_stat" with proper animation_data. NOT kinetic_text. NOT stock.
If a window says REQUIRED_TYPE: money_counter, return money_counter. If REQUIRED_TYPE: reaction_face, return reaction_face. Follow the type exactly.`;
const newCritical = `CRITICAL RULES:
1. PERMANENTLY BANNED — never use these under any circumstances:
   kinetic_text, typewriter_reveal, neon_sign, glitch_text, news_breaking,
   word_scatter, news_headline, bold_claim, text_flash, overlay_caption
   → If unsure what to show, use "stock" with a specific real-world search_query.

2. Follow REQUIRED_TYPE exactly for all other types.
   REQUIRED_TYPE: spotlight_stat → return spotlight_stat with animation_data.
   REQUIRED_TYPE: money_counter → return money_counter. Etc.

3. For stock clips: search_query = what a documentary camera would show right now.`;
if (code.includes(oldCritical)) {
  code = code.replace(oldCritical, newCritical);
  console.log('✅ Fix 5: Assignment prompt bans text animations');
} else {
  console.log('❌ Fix 5: critical section not found');
}

// ── FIX 6: Stock-run-breaker mappings — only the specific lines ───────────────
code = code.replace('"stock_ticker": "typewriter_reveal"', '"stock_ticker": "spotlight_stat"');
code = code.replace('"score_card": "typewriter_reveal"', '"score_card": "spotlight_stat"');
code = code.replace('"instagram_post": "typewriter_reveal"', '"instagram_post": "stock"');
code = code.replace('"youtube_card": "typewriter_reveal"', '"youtube_card": "stock"');
code = code.replace('"tweet_card": "typewriter_reveal"', '"tweet_card": "stock"');
code = code.replace('"phone_screen": "typewriter_reveal"', '"phone_screen": "stock"');
code = code.replace('"google_search": "typewriter_reveal"', '"google_search": "stock"');
code = code.replace('"alert_banner": "typewriter_reveal"', '"alert_banner": "spotlight_stat"');
code = code.replace('|| "typewriter_reveal"', '|| "stock"');
console.log('✅ Fix 6: Stock-run-breaker mappings fixed');

// ── FIX 7: Kinetic text post-processor — convert to stock not typewriter ──────
// Only patch the specific assignment lines, not globally
code = code.replace(
  `          allClips[i].visual_type = "typewriter_reveal";
          allClips[i].animation_data = { text: sentence.slice(0, 80), subtitle: "" };
        } else {
          // Too long or too short for any text animation — use stock
          fallbackToStock(allClips[i], i);`,
  `          fallbackToStock(allClips[i], i);
        } else {
          fallbackToStock(allClips[i], i);`
);
code = code.replace(
  `        if (sentence.length >= 15) {
          allClips[i].visual_type = "typewriter_reveal";
          allClips[i].animation_data = { text: sentence.slice(0, 80), subtitle: "" };
        } else {
          fallbackToStock(allClips[i], i);
        }`,
  `        fallbackToStock(allClips[i], i);`
);
// Cap overflow → stock not typewriter
code = code.replace(
  `            allClips[i].visual_type = "typewriter_reveal";
            allClips[i].animation_data = { text: sentence.slice(0, 80), subtitle: "" };`,
  `            fallbackToStock(allClips[i], i);`
);
console.log('✅ Fix 7: Kinetic text post-processor no longer converts to typewriter_reveal');

// ── FIX 8: Niche rules in Pass 1 — remove banned from prefer lists only ───────
// Only touch the prefer arrays inside niche rule strings
const niche429 = code.indexOf('nicheInfo.niche === "horror" ? "- HORROR: PRIORITIZE');
if (niche429 > -1) {
  const niche429End = code.indexOf('" : ""}', niche429) + 7;
  let nicheSection = code.slice(niche429, niche429End);
  nicheSection = nicheSection.replace(/,\s*typewriter_reveal/g, '');
  nicheSection = nicheSection.replace(/typewriter_reveal,\s*/g, '');
  nicheSection = nicheSection.replace(/,\s*kinetic_text/g, '');
  nicheSection = nicheSection.replace(/kinetic_text,\s*/g, '');
  nicheSection = nicheSection.replace(/,\s*neon_sign/g, '');
  nicheSection = nicheSection.replace(/neon_sign,\s*/g, '');
  nicheSection = nicheSection.replace(/,\s*glitch_text/g, '');
  nicheSection = nicheSection.replace(/glitch_text,\s*/g, '');
  nicheSection = nicheSection.replace(/,\s*news_breaking/g, '');
  nicheSection = nicheSection.replace(/news_breaking,\s*/g, '');
  nicheSection = nicheSection.replace(/,\s*bold_claim/g, '');
  nicheSection = nicheSection.replace(/bold_claim,\s*/g, '');
  nicheSection = nicheSection.replace(/,\s*word_by_word/g, '');
  code = code.slice(0, niche429) + nicheSection + code.slice(niche429End);
  console.log('✅ Fix 8: Niche rules cleaned of banned types');
}

// Check syntax before saving
fs.writeFileSync(file, code);
import { execSync } from 'child_process';
try {
  execSync('node --check /opt/videoforge/src/director.js', {stdio:'pipe'});
  console.log('\n✅ Syntax check PASSED');
  const twRemaining = (code.match(/"typewriter_reveal"/g)||[]).length;
  const ktRemaining = (code.match(/"kinetic_text"/g)||[]).length;
  console.log(`📊 typewriter_reveal: ${twRemaining} | kinetic_text: ${ktRemaining}`);
} catch(e) {
  console.log('\n❌ SYNTAX ERROR — restoring original');
  fs.writeFileSync(file, original);
  console.log(e.stderr?.toString() || e.message);
}
