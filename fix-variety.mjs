import fs from 'fs';
import { execSync } from 'child_process';

const file = '/opt/videoforge/src/director.js';
let code = fs.readFileSync(file, 'utf8');
const original = code;

// ── FIX 1: Add variety enforcement to assignment prompt ───────────────────────
// Claude needs explicit rules: no type more than 2x per chunk
const oldCritical = `CRITICAL RULES:
1. PERMANENTLY BANNED — never use these under any circumstances:
   kinetic_text, typewriter_reveal, neon_sign, glitch_text, news_breaking,
   word_scatter, news_headline, bold_claim, text_flash, overlay_caption
   → If unsure what to show, use "stock" with a specific real-world search_query.

2. Follow REQUIRED_TYPE exactly for all other types.
   REQUIRED_TYPE: spotlight_stat → return spotlight_stat with animation_data.
   REQUIRED_TYPE: money_counter → return money_counter. Etc.

3. For stock clips: search_query = what a documentary camera would show right now.`;

const newCritical = `CRITICAL RULES:
1. PERMANENTLY BANNED — never use these under any circumstances:
   kinetic_text, typewriter_reveal, neon_sign, glitch_text, news_breaking,
   word_scatter, news_headline, bold_claim, text_flash, overlay_caption
   → If unsure what to show, use "stock" with a specific real-world search_query.

2. Follow REQUIRED_TYPE exactly for all other types.
   REQUIRED_TYPE: spotlight_stat → return spotlight_stat with animation_data.
   REQUIRED_TYPE: money_counter → return money_counter. Etc.

3. For stock clips: search_query = what a documentary camera would show right now.

4. VARIETY IS MANDATORY — no animation type may appear more than 2 times in your response.
   You have 30+ animation types available. Use them. Every animation clip must use a DIFFERENT type.
   Look at what types you've already used and pick something you haven't used yet.
   WRONG: spotlight_stat, spotlight_stat, spotlight_stat, count_up, spotlight_stat
   RIGHT: spotlight_stat, count_up, before_after, trend_arrow, icon_burst, compare_reveal

5. CHOOSE THE BEST MATCH — pick the animation type that most naturally represents what the 
   narrator is saying. Ask: what visual format would make this specific fact/claim most clear?
   - A percentage stat → percent_fill or count_up
   - A comparison → before_after or compare_reveal  
   - A list of items → bullet_list or checkmark_build
   - An emotional reaction → reaction_face or lightbulb_moment
   - A trend over time → trend_arrow or growth_curve
   - A specific exercise or action → stock with exact description
   - A ranking → leaderboard or ranking_cards
   - A process → step_reveal or process_flow`;

if (code.includes(oldCritical)) {
  code = code.replace(oldCritical, newCritical);
  console.log('✅ Fix 1: Variety enforcement + best-match rules added to assignment prompt');
} else {
  console.log('❌ Fix 1: critical section not found');
}

// ── FIX 2: Fix nicheSafeQueries — remove generic clickbait fallbacks ──────────
const oldHealthQueries = `  health:     ["gym fitness workout motivated","healthy lifestyle active","sports performance athletic","wellness outdoor nature","fit person exercising"],`;
const newHealthQueries = `  health:     ["person exercising local gym natural lighting","ordinary person jogging outdoor park","real person doing pushups home","people stretching yoga class candid","average person healthy meal preparation"],`;

if (code.includes(oldHealthQueries)) {
  code = code.replace(oldHealthQueries, newHealthQueries);
  console.log('✅ Fix 2a: Health nicheSafeQueries updated to realistic/documentary style');
} else {
  console.log('❌ Fix 2a not found');
}

const oldFinanceQueries = `  finance:    ["financial growth chart professional","investor confident modern","wealth success lifestyle","stock market professional","business executive confident"],`;
const newFinanceQueries = `  finance:    ["person reviewing budget spreadsheet home","ordinary person checking bank account phone","stressed person looking at bills kitchen","person researching investments laptop coffee shop","real person managing money notebook"],`;

if (code.includes(oldFinanceQueries)) {
  code = code.replace(oldFinanceQueries, newFinanceQueries);
  console.log('✅ Fix 2b: Finance nicheSafeQueries updated to realistic style');
} else {
  console.log('❌ Fix 2b not found');
}

const oldGeneralQueries = `  general:    ["professional modern aspirational","person thoughtful confident","city skyline panoramic","nature peaceful","team collaboration success"],`;
const newGeneralQueries = `  general:    ["candid person thinking natural light","real people conversation outdoor","ordinary person working focused","documentary style human moment","person reading learning quiet space"],`;

if (code.includes(oldGeneralQueries)) {
  code = code.replace(oldGeneralQueries, newGeneralQueries);
  console.log('✅ Fix 2c: General nicheSafeQueries updated to documentary style');
} else {
  console.log('❌ Fix 2c not found');
}

// ── FIX 3: Add variety tracking to Pass 2 directClipWindows ──────────────────
// After parseClipsJSON, count types used and warn if any type appears 3+ times
const oldParseClips = `    let clips = parseClipsJSON(content);
    clips = validateAndSyncClips(clips, windows, nicheInfo, videoBible);
    return clips;`;

const newParseClips = `    let clips = parseClipsJSON(content);
    
    // Variety check — if any single animation type dominates, convert excess to stock
    const typeCounts = {};
    for (const clip of clips) {
      const t = clip.visual_type;
      if (t !== 'stock' && t !== 'ai_image' && t !== 'web_image') {
        typeCounts[t] = (typeCounts[t] || 0) + 1;
        // If same animation type appears 3+ times in one chunk, convert excess to stock
        if (typeCounts[t] > 3) {
          clip.visual_type = 'stock';
          clip.search_query = clip.search_query || clip.text?.slice(0, 50) || '';
          clip.animation_data = null;
        }
      }
    }
    
    clips = validateAndSyncClips(clips, windows, nicheInfo, videoBible);
    return clips;`;

if (code.includes(oldParseClips)) {
  code = code.replace(oldParseClips, newParseClips);
  console.log('✅ Fix 3: Post-parse variety enforcement — max 3 of same type per chunk');
} else {
  console.log('❌ Fix 3: parseClips section not found');
}

// Syntax check before saving
try {
  fs.writeFileSync(file, code);
  execSync('node --check ' + file, {stdio:'pipe'});
  console.log('\n✅ Syntax check PASSED');
} catch(e) {
  console.log('\n❌ SYNTAX ERROR — restoring original');
  fs.writeFileSync(file, original);
  console.log(e.stderr?.toString()?.slice(0,200));
}
