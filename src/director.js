import axios from "axios";
import chalk from "chalk";

/**
 * Director v34 — Sentence-Synced Creative Director
 *
 * Core philosophy:
 * - Timing comes from the ACTUAL AUDIO (word timestamps), not guesswork
 * - Claude gets pre-computed sentence windows and decides WHAT to show, not WHEN
 * - Duration = sentence length × importance multiplier (1.0 normal, 1.5 key, 0.75 filler)
 * - Minimum 1.5s, maximum 8s per clip
 * - Text on screen = exact words being spoken at that moment
 * - Animations only for genuinely important statements
 */

// ─── SENTENCE PARSER ─────────────────────────────────────────────────────────
// Convert word timestamps into sentence-level windows with start/end times
function buildSentenceWindows(wordTimestamps, scriptText, totalDuration) {
  if (!wordTimestamps || wordTimestamps.length === 0) return [];

  // Split script into sentences
  const rawSentences = scriptText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  const sentences = [];
  let wordIdx = 0;

  for (const sentence of rawSentences) {
    // Find the words that belong to this sentence by matching cleaned text
    const sentenceWords = sentence
      .replace(/[^a-zA-Z0-9\s']/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (sentenceWords.length === 0) continue;

    // Find first word match in timestamps
    let startWordIdx = wordIdx;
    let found = false;
    const firstWord = sentenceWords[0].toLowerCase();

    for (let i = wordIdx; i < Math.min(wordIdx + 20, wordTimestamps.length); i++) {
      if (wordTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(
        firstWord.replace(/[^a-z0-9]/g, "").slice(0, 4)
      )) {
        startWordIdx = i;
        found = true;
        break;
      }
    }

    if (!found) startWordIdx = wordIdx;

    // Find end word (last word of sentence)
    const lastWord = sentenceWords[sentenceWords.length - 1].toLowerCase();
    let endWordIdx = startWordIdx;

    for (let i = startWordIdx; i < Math.min(startWordIdx + sentenceWords.length + 5, wordTimestamps.length); i++) {
      if (wordTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(
        lastWord.replace(/[^a-z0-9]/g, "").slice(0, 4)
      )) {
        endWordIdx = i;
      }
    }

    const startTime = wordTimestamps[startWordIdx]?.start ?? 0;
    const endTime = wordTimestamps[endWordIdx]?.end ?? startTime + 2;

    if (endTime > startTime + 0.3) {
      sentences.push({
        text: sentence,
        start: parseFloat(startTime.toFixed(2)),
        end: parseFloat(endTime.toFixed(2)),
        duration: parseFloat((endTime - startTime).toFixed(2)),
        wordCount: sentenceWords.length,
      });
    }

    wordIdx = endWordIdx + 1;
  }

  // Fill any gaps between sentences and ensure coverage to totalDuration
  const filled = [];
  for (let i = 0; i < sentences.length; i++) {
    const curr = sentences[i];
    const next = sentences[i + 1];
    filled.push(curr);
    // If there's a gap > 0.5s between sentences, extend current or add bridge
    if (next && next.start - curr.end > 0.5) {
      filled[filled.length - 1] = { ...curr, end: next.start };
    }
  }

  return filled;
}

// ─── GROUP SENTENCES INTO CLIPS ───────────────────────────────────────────────
// Short sentences get merged, very long ones get split
// This gives Claude "clip windows" of 2-8 seconds
function groupSentencesIntoClips(sentences, minDur = 2.0, maxDur = 8.0) {
  const clips = [];
  let buffer = null;

  for (const sent of sentences) {
    if (!buffer) {
      buffer = { ...sent, sentences: [sent.text] };
      continue;
    }

    const merged = buffer.end - buffer.start + (sent.end - sent.start);

    if (merged <= maxDur && buffer.end - buffer.start < minDur) {
      // Merge short sentence into buffer
      buffer = {
        ...buffer,
        end: sent.end,
        text: buffer.text + " " + sent.text,
        sentences: [...buffer.sentences, sent.text],
        wordCount: buffer.wordCount + sent.wordCount,
      };
    } else {
      clips.push(buffer);
      buffer = { ...sent, sentences: [sent.text] };
    }
  }
  if (buffer) clips.push(buffer);

  // Enforce max duration by splitting
  const result = [];
  for (const clip of clips) {
    if (clip.end - clip.start <= maxDur) {
      result.push(clip);
    } else {
      // Split at midpoint
      const mid = clip.start + (clip.end - clip.start) / 2;
      result.push({ ...clip, end: mid });
      result.push({ ...clip, start: mid });
    }
  }

  return result;
}

// ─── DETECT NICHE ─────────────────────────────────────────────────────────────
function detectNiche(topic, scriptText) {
  const text = (topic + " " + scriptText.slice(0, 500)).toLowerCase();
  if (/horror|scary|creepy|haunted|ghost|demon|paranormal|murder|serial killer|nightmare|terror/.test(text))
    return { niche: "horror", imageStyle: "dark atmospheric, eerie, suspenseful" };
  if (/true crime|crime|detective|investigation|cold case/.test(text))
    return { niche: "true_crime", imageStyle: "detective work, investigation, crime scene evidence" };
  if (/side hustle|passive income|make money|freelance|entrepreneur|ecommerce|dropship|affiliate/.test(text))
    return { niche: "business", imageStyle: "entrepreneur success, professional workspace, confident businessperson" };
  if (/invest|stock|dividend|portfolio|finance|wealth|market|trading|crypto/.test(text))
    return { niche: "finance", imageStyle: "financial charts, professional investor, business district, wealth" };
  if (/travel|destination|country|tourism|adventure|vacation|beach|island/.test(text))
    return { niche: "travel", imageStyle: "beautiful destination, scenic landscape, cultural experience" };
  if (/health|fitness|gym|workout|diet|nutrition|body|exercise/.test(text))
    return { niche: "health", imageStyle: "gym workout, healthy food, active lifestyle, sports" };
  if (/history|ancient|medieval|empire|war|civilization/.test(text))
    return { niche: "history", imageStyle: "historical ruins, ancient artifact, period architecture" };
  if (/personal brand|youtube|content creator|social media|influencer|audience/.test(text))
    return { niche: "creator", imageStyle: "content creator studio, camera recording, social media" };
  return { niche: "general", imageStyle: "professional modern, aspirational, person thinking, city skyline" };
}

function getThemeAnimationHints(theme) {
  const hints = {
    green_matrix:   { prefer: ["glitch_text", "stock_ticker", "typewriter_reveal", "neon_sign", "money_counter"], avoid: ["polaroid_stack", "reaction_face"] },
    blue_tech:      { prefer: ["stock_ticker", "typewriter_reveal", "count_up", "trend_arrow"], avoid: ["polaroid_stack", "reaction_face"] },
    cyber_purple:   { prefer: ["neon_sign", "glitch_text", "word_scatter", "kinetic_text"], avoid: ["polaroid_stack"] },
    gold_luxury:    { prefer: ["quote_overlay", "spotlight_stat", "money_counter", "overlay_caption"], avoid: ["glitch_text", "neon_sign", "reaction_face"] },
    dark_minimal:   { prefer: ["quote_overlay", "kinetic_text", "spotlight_stat", "neon_sign"], avoid: ["reaction_face", "polaroid_stack"] },
    orange_fire:    { prefer: ["kinetic_text", "rocket_launch", "reaction_face", "warning_siren", "count_up"], avoid: ["polaroid_stack"] },
    red_impact:     { prefer: ["warning_siren", "kinetic_text", "reaction_face", "news_breaking"], avoid: ["polaroid_stack"] },
    warm_sunset:    { prefer: ["reaction_face", "lightbulb_moment", "thumbs_up", "checkmark_build"], avoid: ["warning_siren", "glitch_text"] },
    blue_minimal:   { prefer: ["highlight_build", "checkmark_build", "count_up", "typewriter_reveal"], avoid: ["warning_siren", "glitch_text"] },
    creator_pink:   { prefer: ["phone_screen", "tweet_card", "social_counter", "youtube_progress", "reaction_face"], avoid: ["glitch_text"] },
    default:        { prefer: ["kinetic_text", "spotlight_stat", "count_up", "checkmark_build"], avoid: [] },
  };
  return hints[theme] || hints.default;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode = "visual", topic = "", theme = "blue_grid") {

  const nicheInfo = detectNiche(topic, scriptText);
  const themeHints = getThemeAnimationHints(theme);
  const isHorror = nicheInfo.niche === "horror" || nicheInfo.niche === "true_crime";

  // Build sentence windows from actual word timestamps
  const sentences = buildSentenceWindows(wordTimestamps, scriptText, totalDuration);
  const clipWindows = groupSentencesIntoClips(sentences, 2.0, 7.5);

  console.log(chalk.gray(`  Built ${clipWindows.length} clip windows from ${sentences.length} sentences`));

  // Process in chunks of ~40 clips to stay within token limits
  const CHUNK_SIZE = 40;
  const allClips = [];

  for (let ci = 0; ci < clipWindows.length; ci += CHUNK_SIZE) {
    const windowChunk = clipWindows.slice(ci, ci + CHUNK_SIZE);
    const isFirst = ci === 0;
    const isLast = ci + CHUNK_SIZE >= clipWindows.length;

    console.log(chalk.gray(`  Directing clips ${ci + 1}-${Math.min(ci + CHUNK_SIZE, clipWindows.length)} of ${clipWindows.length}...`));

    const chunkClips = await directClipWindows(
      windowChunk, scriptText, isFirst, isLast,
      nicheInfo, themeHints, contentMode, topic, theme, isHorror
    );
    allClips.push(...chunkClips);
  }

  // Post-processing
  let finalClips = applyPostProcessing(allClips, totalDuration, contentMode, scriptText, nicheInfo);

  console.log(chalk.gray(`  Storyboard: ${finalClips.length} clips`));
  return finalClips;
}

// ─── DIRECT A BATCH OF CLIP WINDOWS ──────────────────────────────────────────
async function directClipWindows(windows, scriptText, isFirst, isLast, nicheInfo, themeHints, contentMode, topic, theme, isHorror) {

  // Build the window reference - each window shows exactly what's being said
  const windowRef = windows.map((w, i) => {
    const dur = (w.end - w.start).toFixed(1);
    return `[${i}] ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s (${dur}s) | "${w.text}"`;
  }).join("\n");

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{
        role: "user",
        content: buildDirectorPrompt(windowRef, windows, scriptText, isFirst, isLast, nicheInfo, themeHints, contentMode, topic, theme, isHorror),
      }],
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 120000,
    }
  );

  const content = response.data.content[0].text;
  let clips = parseClipsJSON(content);
  clips = validateAndSyncClips(clips, windows, nicheInfo);
  return clips;
}

// ─── THE DIRECTOR PROMPT ─────────────────────────────────────────────────────
function buildDirectorPrompt(windowRef, windows, scriptText, isFirst, isLast, nicheInfo, themeHints, contentMode, topic, theme, isHorror) {
  const totalDur = windows[windows.length - 1]?.end - windows[0]?.start || 0;

  return `You are a creative director for YouTube videos. You will assign ONE visual to each clip window below.

VIDEO TOPIC: "${topic}"
NICHE: ${nicheInfo.niche} | THEME: "${theme}"
IMAGE STYLE: ${nicheInfo.imageStyle}
THEME PREFERRED ANIMATIONS: ${themeHints.prefer.join(", ")}
THEME AVOID: ${themeHints.avoid.join(", ")}

═══ YOUR JOB ═══
Each line below is a CLIP WINDOW — the exact time and words the narrator speaks.
You must assign ONE visual per window. The start_time and end_time are FIXED — do not change them.
Your only decision is WHAT appears on screen during those seconds.

CLIP WINDOWS (${windows.length} total):
${windowRef}

FULL SCRIPT CONTEXT:
${scriptText.slice(0, 3000)}

═══ PACING RULES — VARIETY IS ESSENTIAL ═══
Target mix for a great YouTube video:
- 50% stock images (mix of framed, split_left, split_right — NOT all the same)
- 25% animations (kinetic_text, count_up, reaction_face, neon_sign, money_counter, etc.)
- 15% split screens with panel icons (split_left/right with panel_icon emoji)
- 10% full infographics or overlay types (when data genuinely exists)

PACING:
- Vary clip types constantly — never 3 stock images in a row
- Use split screens for storytelling moments (narrator describes a person or situation)
- Use animations for shocking facts, pivotal lines, calls to action, emotional peaks
- Use framed images for context-setting and transitions
- Animation text MUST be exact words being spoken — not invented phrases
- If narrator says "she made $4,000 in month one" → animation: {value:"$4,000", label:"month one"}

═══ VISUAL TYPES ═══

IMAGES:
"stock" — search for a photo matching what's being said RIGHT NOW
  display_style: "framed" (shows theme background) | "split_left" | "split_right" | "fullscreen" (hook only)
  search_query: specific scene matching narrator's words — emotion + subject
  search_queries: for clips 5s+, add 2-3 different angles as array for crossfade variety
  panel_type: "icon" or "clean" — NEVER "words"
  panel_icon: one emoji if it genuinely fits the moment (🚀💰🧠🔥⚡🎯💡📈🏆✅😤)

"web_image" — ONLY for famous real people or iconic landmarks. NEVER brand logos or apps.

TEXT ANIMATIONS (use sparingly — key moments only):
"kinetic_text" — animation_data: {lines:["WORD1","WORD2"], style:"impact"} — exact spoken words slam in
"spotlight_stat" — animation_data: {value:"$4,000", label:"in month one", context:"Her first result"} — dramatic stat
"count_up" — animation_data: {value:10000, prefix:"$", label:"first month income", decimals:0}
"money_counter" — animation_data: {amount:4000, currency:"$", label:"month one income"}
"neon_sign" — animation_data: {text:"THE TRUTH"} — bold statement, smooth glow, no flicker
"typewriter_reveal" — animation_data: {text:"exact phrase narrator says", subtitle:"context"}
"glitch_text" — animation_data: {text:"SHOCKING FACT"} — good for ${theme.includes("matrix") || theme.includes("cyber") || theme.includes("tech") ? "this tech theme" : "tech themes only"}
"warning_siren" — animation_data: {headline:"WARNING", body:"the mistake most people make", icon:"⚠️"}
"reaction_face" — animation_data: {emoji:"🤯", label:"exact words narrator says", style:"slam"}
"before_after" — animation_data: {before:"$2,000/mo", after:"$12,000/mo", label:"the transformation"}
"checkmark_build" — animation_data: {items:["Step one from script","Step two from script","Step three"]}
"highlight_build" — animation_data: {lines:["Key phrase","Second phrase","Third phrase"]}
"news_breaking" — animation_data: {headline:"SHOCKING FACT FROM SCRIPT", subtext:"context", ticker:"MORE DEVELOPING"}
"tweet_card" — animation_data: {handle:"@narrator", text:"exact quote from script", likes:"24.3K"}

OVERLAY (needs search_query for background image):
"quote_overlay" — search_query:"scene", animation_data: {quote:"exact spoken quote", attribution:""}
"overlay_caption" — search_query:"scene", animation_data: {caption:"exact words", position:"bottom", style:"bold"}

${isFirst ? `OPENING (first clip must be dramatic):
- Use kinetic_text with the most shocking/intriguing words from the first sentence
- Or a fullscreen stock image if the opening is storytelling` : ""}
${isLast ? "CLOSING: end with checkmark_build, thumbs_up, or a strong quote_overlay" : ""}

═══ STRICT RULES ═══
- start_time and end_time MUST match the window exactly — do not change them
- NEVER invent text — all animation text comes directly from what narrator says in that window
- NEVER set panel_text — always null
- NEVER use web_image for brand logos, apps, or company screenshots
- BANNED search terms: baby,infant,child,toddler,kid,subscribe,logo,brand${isHorror ? "" : ",knife,weapon,ghost,monster,blood,horror,killer"}
- For split layouts: panel_type is "icon" or "clean" only

Return ONLY a valid JSON array, no markdown. One object per clip window, in order:
[{"start_time":${windows[0]?.start || 0},"end_time":${windows[0]?.end || 2},"visual_type":"stock","display_style":"framed","search_query":"","search_queries":null,"panel_text":null,"panel_type":"clean","panel_icon":null,"ai_prompt":"","number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null,"chart_data":null,"animation_data":null,"transition_speed":"fast","interrupt_data":null,"quote_data":null,"countdown_data":null,"subtitle_words":[]}]`;
}

// ─── PARSE JSON ───────────────────────────────────────────────────────────────
function parseClipsJSON(content) {
  let str = content.trim()
    .replace(/^```(?:json)?\s*/gm, "")
    .replace(/```\s*$/gm, "")
    .trim();
  try { return JSON.parse(str); } catch {}
  const m = str.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  const lastBrace = str.lastIndexOf("}");
  if (lastBrace > 0) {
    let truncated = str.slice(0, lastBrace + 1);
    if (!truncated.trim().endsWith("]")) truncated += "]";
    const arrStart = truncated.indexOf("[");
    if (arrStart >= 0) truncated = truncated.slice(arrStart);
    try { return JSON.parse(truncated); } catch {}
  }
  throw new Error("Could not parse director storyboard JSON");
}

// ─── VALIDATE AND SYNC CLIPS TO WINDOWS ──────────────────────────────────────
function validateAndSyncClips(clips, windows, nicheInfo) {
  if (!Array.isArray(clips)) return windows.map(w => makeStockClip(w, nicheInfo));

  const isHorror = nicheInfo?.niche === "horror" || nicheInfo?.niche === "true_crime";

  const validTypes = [
    "stock","ai_image","web_image",
    "number_reveal","comparison","section_break","text_flash","line_chart","donut_chart",
    "progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card",
    "checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight",
    "body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison",
    "icon_grid","flow_diagram","interrupt_card","quote_pull","countdown_corner",
    "kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter",
    "glitch_text","checkmark_build","trend_arrow","stock_ticker","phone_screen",
    "tweet_card","word_scatter","social_counter","before_after","lightbulb_moment",
    "rocket_launch","news_breaking","percent_fill","compare_reveal","highlight_build",
    "count_up","neon_sign","reaction_face","thumbs_up","side_by_side","youtube_progress",
    "warning_siren","quote_overlay","overlay_caption","polaroid_stack",
  ];

  const graphicTypes = new Set([
    "number_reveal","section_break","comparison","text_flash","line_chart","donut_chart",
    "progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card",
    "checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight",
    "body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison",
    "icon_grid","flow_diagram","interrupt_card","quote_pull","countdown_corner",
    "kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter",
    "glitch_text","checkmark_build","trend_arrow","stock_ticker","phone_screen",
    "tweet_card","word_scatter","social_counter","before_after","lightbulb_moment",
    "rocket_launch","news_breaking","percent_fill","compare_reveal","highlight_build",
    "count_up","neon_sign","reaction_face","thumbs_up","side_by_side","youtube_progress",
    "warning_siren",
  ]);

  const banned = ["baby","infant","child","toddler","kid","kids","children","subscribe","button","icon","logo","brand","coursera","udemy","fiverr","upwork","amazon","facebook","instagram","tiktok"];
  const bannedVisuals = isHorror ? [] : ["knife","weapon","mask","ghost","monster","blood","horror","scary","creepy","ghostface","scream","killer"];

  const nicheSafeQueries = {
    business: ["entrepreneur success workspace","confident professional achieving","startup team modern office","freelancer productive focused","business growth momentum"],
    finance: ["financial growth chart professional","investor confident modern","wealth success lifestyle","stock market professional","business executive confident"],
    health: ["gym fitness workout motivated","healthy lifestyle active","sports performance athletic","wellness outdoor nature","fit person exercising"],
    travel: ["scenic destination landscape","travel adventure culture","beautiful nature photography","landmark iconic","travel exploration freedom"],
    horror: ["dark atmospheric night","mysterious shadowy","abandoned eerie","foggy dark","suspenseful shadow"],
    true_crime: ["detective investigation","evidence analysis","courtroom justice","newspaper headline","investigation board"],
    history: ["ancient ruins architecture","historical artifact","medieval castle","period historical","ancient civilization"],
    creator: ["content creator studio","filming camera","social media engagement","online audience","creator workspace desk"],
    general: ["professional modern aspirational","person thoughtful confident","city skyline panoramic","nature peaceful","team collaboration success"],
  };

  const result = [];

  // Match Claude's output to windows by index, not by time
  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    const clip = clips[i];

    if (!clip) {
      result.push(makeStockClip(window, nicheInfo));
      continue;
    }

    // FORCE start_time and end_time to match the window exactly
    clip.start_time = window.start;
    clip.end_time = window.end;
    clip.subtitle_words = [];

    // Validate visual type
    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";

    // Animation types need animation_data
    const animTypes = new Set(["kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow","stock_ticker","phone_screen","tweet_card","word_scatter","social_counter","before_after","lightbulb_moment","rocket_launch","news_breaking","percent_fill","compare_reveal","highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side","youtube_progress","warning_siren","quote_overlay","overlay_caption","polaroid_stack"]);
    if (animTypes.has(clip.visual_type) && !clip.animation_data) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }

    // Validate display style
    const validStyles = ["fullscreen","framed","fullscreen_zoom","split_left","split_right"];
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";

    // Remove panel_text always
    clip.panel_text = null;
    if (clip.panel_type === "words") clip.panel_type = "clean";

    // Clean search query
    let q = (clip.search_query || "").toLowerCase();
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
    if (bannedVisuals.some(b => q.includes(b))) {
      const niche = nicheInfo?.niche || "general";
      q = (nicheSafeQueries[niche] || nicheSafeQueries.general)[Math.floor(Math.random() * 5)];
    }
    if (q.length < 3) {
      const niche = nicheInfo?.niche || "general";
      q = (nicheSafeQueries[niche] || nicheSafeQueries.general)[i % 5];
    }
    clip.search_query = q;

    // Clean search_queries array
    if (clip.search_queries && Array.isArray(clip.search_queries)) {
      clip.search_queries = clip.search_queries
        .map(sq => {
          let c = (sq || "").toLowerCase();
          banned.forEach(b => { c = c.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
          if (bannedVisuals.some(b => c.includes(b))) {
            const niche = nicheInfo?.niche || "general";
            c = (nicheSafeQueries[niche] || nicheSafeQueries.general)[0];
          }
          return c.length >= 3 ? c : null;
        })
        .filter(Boolean);
      if (clip.search_queries.length === 0) clip.search_queries = null;
    }

    // Null imagePath for graphic types
    if (graphicTypes.has(clip.visual_type)) {
      clip.imagePath = null;
      clip.isCutout = false;
    }

    if (!clip.transition_speed) clip.transition_speed = "fast";

    result.push(clip);
  }

  return result;
}

function makeStockClip(window, nicheInfo) {
  const niche = nicheInfo?.niche || "general";
  const fallbacks = {
    business: "confident entrepreneur professional workspace",
    finance: "financial growth professional business",
    health: "fitness active healthy lifestyle",
    travel: "scenic destination landscape travel",
    horror: "dark atmospheric mysterious",
    true_crime: "detective investigation professional",
    history: "ancient ruins historical",
    creator: "content creator studio camera",
    general: "professional aspirational confident person",
  };
  return {
    start_time: window.start,
    end_time: window.end,
    visual_type: "stock",
    display_style: "framed",
    search_query: fallbacks[niche] || fallbacks.general,
    search_queries: null,
    panel_text: null,
    panel_type: "clean",
    panel_icon: null,
    animation_data: null,
    chart_data: null,
    transition_speed: "fast",
    subtitle_words: [],
  };
}

// ─── POST-PROCESSING ──────────────────────────────────────────────────────────
function applyPostProcessing(allClips, totalDuration, contentMode, scriptText, nicheInfo) {
  const isHorror = nicheInfo?.niche === "horror" || nicheInfo?.niche === "true_crime";

  // Sort by start time
  allClips.sort((a, b) => a.start_time - b.start_time);

  // Fill any gaps at start
  if (allClips.length > 0 && allClips[0].start_time > 0.5) {
    allClips.unshift(makeStockClip({ start: 0, end: allClips[0].start_time }, nicheInfo));
  }

  // Fill any gaps at end
  if (allClips.length > 0) {
    const last = allClips[allClips.length - 1];
    if (totalDuration - last.end > 0.5) {
      last.end_time = totalDuration;
    }
  }

  // Fix overlaps
  for (let i = 1; i < allClips.length; i++) {
    if (allClips[i].start_time < allClips[i - 1].end_time) {
      allClips[i].start_time = allClips[i - 1].end_time;
    }
    if (allClips[i].end_time <= allClips[i].start_time) {
      allClips[i].end_time = allClips[i].start_time + 1.5;
    }
  }

  // Fullscreen cap: max 4 per minute
  const maxFullscreen = Math.max(2, Math.ceil((totalDuration / 60) * 4));
  let fullscreenCount = 0;
  allClips.forEach(clip => {
    if (clip.display_style === "fullscreen" || clip.display_style === "fullscreen_zoom") {
      fullscreenCount++;
      if (fullscreenCount > maxFullscreen) clip.display_style = "framed";
    }
  });

  // Combined non-image cap: max 40% animations+infographics
  const nonImageTypes = new Set([
    "number_reveal","section_break","comparison","text_flash","line_chart","donut_chart",
    "progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card",
    "checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight",
    "body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison",
    "icon_grid","flow_diagram","kinetic_text","spotlight_stat","icon_burst",
    "typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow",
    "stock_ticker","phone_screen","tweet_card","word_scatter","social_counter",
    "before_after","lightbulb_moment","rocket_launch","news_breaking","percent_fill",
    "compare_reveal","highlight_build","count_up","neon_sign","reaction_face",
    "thumbs_up","side_by_side","youtube_progress","warning_siren",
  ]);

  const maxNonImage = Math.ceil(allClips.length * 0.50);
  let nonImageCount = 0;
  allClips.forEach(clip => {
    if (nonImageTypes.has(clip.visual_type)) {
      nonImageCount++;
      if (nonImageCount > maxNonImage) {
        clip.visual_type = "stock";
        clip.display_style = "framed";
      }
    }
  });

  // No same type twice in a row
  let lastType = "";
  allClips.forEach(clip => {
    if (clip.visual_type !== "stock" && clip.visual_type === lastType) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }
    lastType = clip.visual_type;
  });

  // Hook protection: no infographics in first 5s
  const infraTypes = new Set(["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","horizontal_bar","vertical_bar","growth_curve","ranking_cards","split_comparison","scale_comparison","funnel_chart","body_diagram","map_highlight","icon_grid","flow_diagram","checklist","quote_card"]);
  allClips.forEach(clip => {
    if (clip.start_time < 5 && infraTypes.has(clip.visual_type)) {
      clip.visual_type = "stock";
      clip.display_style = clip.start_time < 2 ? "fullscreen" : "framed";
      clip.search_query = clip.search_query || "dramatic cinematic opening";
    }
  });

  // Inject one interrupt card per 90s if script has numbers
  const facts = extractFacts(scriptText);
  if (facts.length > 0) {
    for (let t = 90; t < totalDuration - 15; t += 90) {
      const host = allClips.find(c =>
        c.start_time <= t && c.end_time > t + 5 &&
        (c.visual_type === "stock" || c.visual_type === "ai_image")
      );
      if (host) {
        const factIdx = Math.floor(t / 90) - 1;
        if (factIdx < facts.length) {
          allClips.push({
            start_time: t, end_time: t + 5,
            visual_type: "interrupt_card", display_style: "framed",
            search_query: "", subtitle_words: [],
            interrupt_data: { fact: facts[factIdx], label: "Did you know?" },
            panel_text: null, panel_type: "clean", animation_data: null,
            chart_data: null, transition_speed: "fast",
          });
        }
      }
    }
    allClips.sort((a, b) => a.start_time - b.start_time);
  }

  return allClips;
}

function extractFacts(scriptText) {
  const sentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 120);
  const withNumbers = sentences.filter(s => /\d+|percent|million|billion|thousand/.test(s));
  const pool = withNumbers.length >= 3 ? withNumbers : sentences;
  const step = Math.floor(pool.length / 4) || 1;
  const facts = [];
  for (let i = 0; i < pool.length && facts.length < 4; i += step) facts.push(pool[i]);
  return facts;
}
