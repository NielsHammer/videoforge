import fs from 'fs';

const directorFile = '/opt/videoforge/src/director.js';
const pipelineFile = '/opt/videoforge/src/pipeline.js';

let director = fs.readFileSync(directorFile, 'utf8');
let pipeline = fs.readFileSync(pipelineFile, 'utf8');

// ═══════════════════════════════════════════════════════════════════
// FIX 1: Remove all pure-text animation types from the system
// These create "double subtitle" effect now that we have real subtitles
// Banned: kinetic_text, typewriter_reveal, neon_sign, glitch_text,
//         news_breaking, bold_claim, word_scatter, news_headline
// When these are assigned, replace with stock/AI/infographic decision
// ═══════════════════════════════════════════════════════════════════

// Remove banned text types from animRotation pool in enforcePlan
const oldAnimRotation = `  const animRotation = [
    "kinetic_text","spotlight_stat","reaction_face","neon_sign",
    "money_counter","count_up","typewriter_reveal","news_breaking","glitch_text",
    "percent_fill","trend_arrow","before_after","compare_reveal","highlight_build",
    "checkmark_build","icon_burst","lightbulb_moment","rocket_launch","tweet_card",
    "phone_screen","word_scatter","side_by_side","thumbs_up","stock_ticker",
    // batch4
    "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
    "pro_con","score_card","mindset_shift","big_number","alert_banner",
    "three_points","rule_card","loading_bar","vote_bar","news_headline",
    "conversation_bubble","stacked_bar","countdown_timer",
  ];`;

const newAnimRotation = `  // Text-only animations REMOVED — we now have real subtitles burned in.
  // Pure text scenes (kinetic_text, typewriter_reveal, neon_sign, etc.) create
  // double-subtitle effect and don't add visual value.
  const animRotation = [
    "spotlight_stat","reaction_face",
    "money_counter","count_up","percent_fill","trend_arrow","before_after",
    "compare_reveal","highlight_build","checkmark_build","icon_burst",
    "lightbulb_moment","rocket_launch","tweet_card","phone_screen",
    "side_by_side","thumbs_up","stock_ticker",
    // batch4
    "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
    "pro_con","score_card","mindset_shift","big_number","alert_banner",
    "three_points","rule_card","loading_bar","vote_bar",
    "conversation_bubble","stacked_bar","countdown_timer",
  ];`;

if (director.includes(oldAnimRotation)) {
  director = director.replace(oldAnimRotation, newAnimRotation);
  console.log('✅ Fix 1a: Text animations removed from rotation pool');
} else {
  console.log('❌ Fix 1a: animRotation not found');
}

// Remove banned types from validTypes in validateAndSyncClips
// When a banned text type is detected, convert to stock
const bannedTextTypes = ['kinetic_text', 'typewriter_reveal', 'neon_sign', 'glitch_text', 
  'news_breaking', 'word_scatter', 'news_headline', 'bold_claim'];

// Add a post-processing step that converts banned text types to stock
const oldPostProcessing = `  let finalClips = applyPostProcessing(allClips, totalDuration, scriptText, nicheInfo, videoBible);`;
const newPostProcessing = `  // Convert any remaining text-only animations to stock/AI
  // These create double-subtitle effect with our burned-in subtitles
  const BANNED_TEXT_TYPES = new Set(['kinetic_text','typewriter_reveal','neon_sign','glitch_text','news_breaking','word_scatter','news_headline','bold_claim']);
  for (const clip of allClips) {
    if (BANNED_TEXT_TYPES.has(clip.visual_type)) {
      // Let director decide: use stock with the sentence as search query
      const sentence = clip.text || clip.sentence || '';
      const biblePrefix = videoBible?.image_search_prefix || '';
      // Extract 3-5 key nouns from sentence for search
      const stopWords = new Set(['the','and','but','for','with','this','that','have','from','they','their','you','was','are','were','has','not','can','will','just','very','also','more','most','when','where','what','how','who']);
      const keyWords = sentence.replace(/[^a-zA-Z\s]/g,' ').split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
        .slice(0, 4).join(' ');
      clip.visual_type = 'stock';
      clip.search_query = biblePrefix ? biblePrefix + ' ' + keyWords : keyWords || (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[0];
      clip.animation_data = null;
    }
  }
  let finalClips = applyPostProcessing(allClips, totalDuration, scriptText, nicheInfo, videoBible);`;

if (director.includes(oldPostProcessing)) {
  director = director.replace(oldPostProcessing, newPostProcessing);
  console.log('✅ Fix 1b: Post-processing converts banned text types to stock');
} else {
  console.log('❌ Fix 1b: post-processing line not found');
}

// Also remove from the kinetic text post-processing section
// The stock-run-breaker section that creates kinetic_text — remove it entirely
// by making the isPowerPhrase always return false for now
const oldKineticCheck = `    // Pass 1: Quality gate — validate each kinetic_text clip before counting toward cap
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type !== "kinetic_text") continue;`;
const newKineticCheck = `    // kinetic_text is now banned — convert all to stock immediately
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "kinetic_text" || allClips[i].visual_type === "typewriter_reveal") {
        fallbackToStock(allClips[i], i);
        continue;
      }
      // Skip old kinetic_text quality gate — type is banned
      if (false && allClips[i].visual_type !== "kinetic_text") continue;`;

if (director.includes(oldKineticCheck)) {
  director = director.replace(oldKineticCheck, newKineticCheck);
  console.log('✅ Fix 1c: kinetic_text quality gate bypassed — all convert to stock');
} else {
  console.log('❌ Fix 1c: kinetic check not found');
}

fs.writeFileSync(directorFile, director);

// ═══════════════════════════════════════════════════════════════════
// FIX 2: Subtitle position — single fixed line, never moves
// Problem: \kf karaoke wraps to new line for long phrases, causing
// subtitles to jump up/down. Fix: force single line with overflow
// protection, absolute Y position, no wrapping.
// ═══════════════════════════════════════════════════════════════════

// Fix the ASS style to prevent line jumping
const oldASSStyle = `Style: Default,Arial,56,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,3,1,2,80,80,100,1`;
const newASSStyle = `Style: Default,Arial,48,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,120,1`;
// Key changes:
// - FontSize 56->48: slightly smaller so phrases fit on one line
// - Spacing 1->0: tighter letter spacing to fit more on one line  
// - MarginV 100->120: higher up from bottom = more consistent position
// - WrapStyle handled by keeping phrases short (4 words max)

if (pipeline.includes(oldASSStyle)) {
  pipeline = pipeline.replace(oldASSStyle, newASSStyle);
  console.log('✅ Fix 2a: ASS style updated for fixed single-line position');
} else {
  console.log('❌ Fix 2a: ASS style not found');
}

// Reduce phrase size from 5 to 4 words to prevent line wrapping
const oldPhraseSize = `  const PHRASE_SIZE = 5;`;
const newPhraseSize = `  const PHRASE_SIZE = 4; // 4 words max — prevents line wrapping on narrow screens`;

if (pipeline.includes(oldPhraseSize)) {
  pipeline = pipeline.replace(oldPhraseSize, newPhraseSize);
  console.log('✅ Fix 2b: Phrase size reduced to 4 words to prevent wrapping');
} else {
  console.log('❌ Fix 2b: PHRASE_SIZE not found');
}

// Add WrapStyle=1 (no wrap) to script info
const oldScriptInfo = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes`;
const newScriptInfo = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes
WrapStyle: 1`;
// WrapStyle: 1 = end-of-line word wrapping (but we'll prevent it with short phrases)

if (pipeline.includes(oldScriptInfo)) {
  pipeline = pipeline.replace(oldScriptInfo, newScriptInfo);
  console.log('✅ Fix 2c: WrapStyle added to prevent subtitle jumping');
} else {
  console.log('❌ Fix 2c: script info not found');
}

// ═══════════════════════════════════════════════════════════════════
// FIX 3: Image prompts — realistic not clickbaity
// Problem: "cinematic + gym" generates overdone bodybuilder imagery
// Fix: explicit instructions for realistic, relatable, documentary-style
// images that match the EXACT action/exercise/scene in the script
// ═══════════════════════════════════════════════════════════════════

const oldRealisticRules = `Rules:
- The image MUST match the VIDEO TOPIC setting and era
- Lead with the specific subject the narrator is describing
- Add camera angle (close-up / wide / low angle / aerial / eye-level)
- Add lighting that fits the mood (harsh gym lighting / golden hour / dramatic shadows)
- Add emotional tone (determined / intense / calm / triumphant)
\${styleGuide}
- 35-55 words total
- NO text, watermarks, or UI elements in the image

Return ONLY the prompt, nothing else.`;

const newRealisticRules = `Rules:
- The image MUST match the VIDEO TOPIC setting and era
- Show the SPECIFIC action, exercise, object, or scene the narrator is describing — not a generic version
- Use REALISTIC, documentary-style photography. NOT clickbait. NOT stock photo perfection.
- Show ORDINARY, RELATABLE people — not fitness models or overdone bodybuilders for gym content
- For exercises: show the actual exercise being performed with correct form — squats = squats, pull-ups = pull-ups
- For historical content: show real struggle, hardship, and humanity — not just heroic epic shots
- For finance: show real people in real situations — not luxury lifestyle imagery
- Style: photojournalism, documentary, candid. Real lighting. Real people. Real moments.
- Camera: natural angles — eye-level, slight above, candid. Not dramatic low-angle hero shots.
- Avoid: perfect lighting, overdone muscles, glamour photography, stock photo aesthetics
\${styleGuide}
- 35-55 words total  
- NO text, watermarks, or UI elements

Return ONLY the prompt, nothing else.`;

if (pipeline.includes(oldRealisticRules)) {
  pipeline = pipeline.replace(oldRealisticRules, newRealisticRules);
  console.log('✅ Fix 3: Image prompt rules updated — realistic, relatable, documentary style');
} else {
  console.log('❌ Fix 3: rules section not found');
}

fs.writeFileSync(pipelineFile, pipeline);
console.log('\n✅ All files saved');
