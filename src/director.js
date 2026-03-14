import axios from "axios";
import chalk from "chalk";

/**
 * Director v34c — Sentence-Synced + Pre-Flight Planning
 *
 * Two-pass system:
 * Pass 1 (pre-flight): Claude reads the full script and classifies every sentence
 *   — decides importance, visual category, and specific type for each clip window
 * Pass 2 (assignment): Claude assigns exact visual details using the classification plan
 *
 * Timing is always locked to actual word timestamps, never guessed.
 */

// ─── NICHE BUDGETS ───────────────────────────────────────────────────────────
const NICHE_BUDGETS = {
  finance:    { stock: 30, animation: 30, split: 20, infographic: 20, label: "data-heavy — charts, stats, money animations, financial imagery" },
  business:   { stock: 35, animation: 30, split: 20, infographic: 15, label: "motivational — bold animations, success imagery, key stats" },
  health:     { stock: 40, animation: 25, split: 20, infographic: 15, label: "lifestyle imagery mixed with health stats and motivational animations" },
  horror:     { stock: 55, animation: 30, split: 15, infographic: 0,  label: "atmospheric imagery — dark animations, reaction faces, warning sirens, no data charts" },
  true_crime: { stock: 50, animation: 25, split: 15, infographic: 10, label: "storytelling imagery, dramatic animations, minimal data" },
  travel:     { stock: 50, animation: 20, split: 25, infographic: 5,  label: "scenic imagery, destination splits, reaction faces" },
  history:    { stock: 45, animation: 20, split: 20, infographic: 15, label: "historical imagery with timelines and key date animations" },
  creator:    { stock: 35, animation: 35, split: 20, infographic: 10, label: "social-native — phone screens, tweet cards, youtube stats, reaction faces" },
  general:    { stock: 40, animation: 25, split: 20, infographic: 15, label: "balanced mix — keep variety high to maintain engagement" },
};

// ─── SENTENCE PARSER ─────────────────────────────────────────────────────────
function buildSentenceWindows(wordTimestamps, scriptText, totalDuration) {
  if (!wordTimestamps || wordTimestamps.length === 0) return [];

  const rawSentences = scriptText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  const sentences = [];
  let wordIdx = 0;

  for (const sentence of rawSentences) {
    const sentenceWords = sentence
      .replace(/[^a-zA-Z0-9\s']/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (sentenceWords.length === 0) continue;

    let startWordIdx = wordIdx;
    const firstWord = sentenceWords[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);

    for (let i = wordIdx; i < Math.min(wordIdx + 20, wordTimestamps.length); i++) {
      if (wordTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(firstWord)) {
        startWordIdx = i;
        break;
      }
    }

    const lastWord = sentenceWords[sentenceWords.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    let endWordIdx = startWordIdx;

    for (let i = startWordIdx; i < Math.min(startWordIdx + sentenceWords.length + 5, wordTimestamps.length); i++) {
      if (wordTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(lastWord)) {
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

  const filled = [];
  for (let i = 0; i < sentences.length; i++) {
    const curr = sentences[i];
    const next = sentences[i + 1];
    filled.push(curr);
    if (next && next.start - curr.end > 0.5) {
      filled[filled.length - 1] = { ...curr, end: next.start };
    }
  }

  return filled;
}

function groupSentencesIntoClips(sentences, minDur = 2.0, maxDur = 7.5) {
  const clips = [];
  let buffer = null;

  for (const sent of sentences) {
    if (!buffer) {
      buffer = { ...sent, sentences: [sent.text] };
      continue;
    }

    if (buffer.end - buffer.start < minDur) {
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

  const result = [];
  for (const clip of clips) {
    if (clip.end - clip.start <= maxDur) {
      result.push(clip);
    } else {
      const mid = clip.start + (clip.end - clip.start) / 2;
      result.push({ ...clip, end: mid });
      result.push({ ...clip, start: mid });
    }
  }
  return result;
}

// ─── NICHE + THEME DETECTION ─────────────────────────────────────────────────
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
    green_matrix:   { prefer: ["glitch_text","stock_ticker","typewriter_reveal","neon_sign","money_counter","warning_siren"], avoid: ["polaroid_stack","reaction_face","lightbulb_moment"] },
    blue_tech:      { prefer: ["stock_ticker","typewriter_reveal","count_up","trend_arrow","spotlight_stat"], avoid: ["polaroid_stack","reaction_face"] },
    cyber_purple:   { prefer: ["neon_sign","glitch_text","word_scatter","kinetic_text","warning_siren"], avoid: ["polaroid_stack"] },
    gold_luxury:    { prefer: ["quote_overlay","spotlight_stat","money_counter","overlay_caption","count_up"], avoid: ["glitch_text","neon_sign","reaction_face"] },
    dark_minimal:   { prefer: ["quote_overlay","kinetic_text","spotlight_stat","neon_sign","typewriter_reveal"], avoid: ["reaction_face","polaroid_stack"] },
    orange_fire:    { prefer: ["kinetic_text","rocket_launch","reaction_face","warning_siren","count_up","trend_arrow"], avoid: ["polaroid_stack"] },
    red_impact:     { prefer: ["warning_siren","kinetic_text","reaction_face","news_breaking","spotlight_stat"], avoid: ["polaroid_stack"] },
    warm_sunset:    { prefer: ["reaction_face","lightbulb_moment","thumbs_up","checkmark_build","highlight_build"], avoid: ["warning_siren","glitch_text"] },
    blue_minimal:   { prefer: ["highlight_build","checkmark_build","count_up","typewriter_reveal","compare_reveal"], avoid: ["warning_siren","glitch_text"] },
    creator_pink:   { prefer: ["phone_screen","tweet_card","social_counter","youtube_progress","reaction_face"], avoid: ["glitch_text"] },
    blood_red:      { prefer: ["warning_siren","kinetic_text","reaction_face","news_breaking","glitch_text"], avoid: ["polaroid_stack"] },
    midnight_blue:  { prefer: ["typewriter_reveal","neon_sign","spotlight_stat","quote_overlay","kinetic_text"], avoid: ["reaction_face"] },
    dark_horror:    { prefer: ["warning_siren","glitch_text","kinetic_text","neon_sign","reaction_face"], avoid: ["polaroid_stack","lightbulb_moment"] },
    default:        { prefer: ["kinetic_text","spotlight_stat","count_up","checkmark_build","reaction_face"], avoid: [] },
  };
  return hints[theme] || hints.default;
}

// ─── PASS 1: PRE-FLIGHT CLASSIFICATION ───────────────────────────────────────
// Claude reads the full script and assigns a visual category + type to each window
// This ensures the right mix BEFORE detailed clip assignment happens
async function classifyClipWindows(clipWindows, scriptText, nicheInfo, themeHints, budget, topic, theme, isHorror) {
  const total = clipWindows.length;
  const stockTarget   = Math.round(total * budget.stock / 100);
  const animTarget    = Math.round(total * budget.animation / 100);
  const splitTarget   = Math.round(total * budget.split / 100);
  const infraTarget   = Math.round(total * budget.infographic / 100);

  const windowList = clipWindows.map((w, i) => {
    const dur = (w.end - w.start).toFixed(1);
    return `[${i}] ${w.start.toFixed(1)}s (${dur}s): "${w.text}"`;
  }).join("\n");

  const prompt = `You are planning a YouTube video storyboard. Read this script and assign a visual category to each clip window.

VIDEO TOPIC: "${topic}"
NICHE: ${nicheInfo.niche} | THEME: "${theme}"
NICHE STYLE: ${budget.label}
THEME ANIMATIONS TO PREFER: ${themeHints.prefer.join(", ")}

TARGET MIX for ${total} total clips:
- ${stockTarget} clips → "stock" (framed images, fullscreen for hook only)
- ${animTarget} clips → "animation" (kinetic_text, reaction_face, count_up, neon_sign, etc.)
- ${splitTarget} clips → "split" (split_left or split_right with panel icon)
- ${infraTarget} clips → "infographic" (number_reveal, checklist, timeline, stat_card, etc.)

CLIP WINDOWS:
${windowList}

CLASSIFICATION RULES:
- "stock": narrator is telling a story, giving context, describing a scene
- "animation": narrator makes a KEY STATEMENT — shocking stat, pivotal insight, emotional peak, call to action
  → Choose the specific animation type that fits: kinetic_text (punchy words), count_up (numbers), money_counter (money), reaction_face (shock/humor), neon_sign (bold claim), warning_siren (danger/mistake), checkmark_build (list of steps), before_after (transformation), news_breaking (dramatic reveal), highlight_build (key benefits), typewriter_reveal (quote or phrase)
  → From theme preferred list use: ${themeHints.prefer.slice(0, 4).join(", ")}
- "split": narrator describes a person, place, or situation — good for storytelling clips
- "infographic": narrator cites specific data, statistics, or a list that benefits from visualization
  → Choose: number_reveal, stat_card, timeline, checklist, progress_bar, trend_arrow, percent_fill

Hit the target counts as closely as possible. Spread variety throughout — no 3+ same category in a row.
First clip should be dramatic (animation or fullscreen stock).
Last clip should be memorable (checkmark_build, quote_overlay, or strong stock image).

Return ONLY a JSON array of ${total} objects, one per clip, in order:
[{"i":0,"category":"stock","type":"stock","display":"framed"},{"i":1,"category":"animation","type":"kinetic_text","display":"framed"},...]

Categories: "stock", "animation", "split", "infographic"
Display options: "framed", "fullscreen", "split_left", "split_right"
For split category use display "split_left" or "split_right".
For stock category use "framed" (default) or "fullscreen" (hook only, max 2 total).`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        timeout: 60000,
      }
    );

    const text = response.data.content[0].text.trim()
      .replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
    const plan = JSON.parse(text);
    console.log(chalk.gray(`  Pre-flight: ${plan.filter(p => p.category === "stock").length} stock, ${plan.filter(p => p.category === "animation").length} animation, ${plan.filter(p => p.category === "split").length} split, ${plan.filter(p => p.category === "infographic").length} infographic`));
    return plan;
  } catch (e) {
    console.log(chalk.yellow(`  Pre-flight failed (${e.message}), using defaults`));
    // Fallback: distribute evenly
    return clipWindows.map((w, i) => {
      const cats = ["stock","stock","animation","split","stock","stock","infographic","split"];
      const cat = cats[i % cats.length];
      const types = { stock: "stock", animation: themeHints.prefer[i % themeHints.prefer.length] || "kinetic_text", split: "stock", infographic: "stat_card" };
      const display = cat === "split" ? (i % 2 === 0 ? "split_left" : "split_right") : (cat === "stock" && i === 0 ? "fullscreen" : "framed");
      return { i, category: cat, type: types[cat], display };
    });
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode = "visual", topic = "", theme = "blue_grid") {

  const nicheInfo = detectNiche(topic, scriptText);
  const themeHints = getThemeAnimationHints(theme);
  const isHorror = nicheInfo.niche === "horror" || nicheInfo.niche === "true_crime";
  const budget = NICHE_BUDGETS[nicheInfo.niche] || NICHE_BUDGETS.general;

  // Build sentence windows from actual word timestamps
  const sentences = buildSentenceWindows(wordTimestamps, scriptText, totalDuration);
  const clipWindows = groupSentencesIntoClips(sentences, 2.0, 7.5);

  console.log(chalk.gray(`  Built ${clipWindows.length} clip windows from ${sentences.length} sentences`));
  console.log(chalk.gray(`  Niche: ${nicheInfo.niche} | Budget: ${budget.stock}% stock, ${budget.animation}% anim, ${budget.split}% split, ${budget.infographic}% infographic`));

  // Pass 1: Pre-flight classification
  console.log(chalk.gray(`  Running pre-flight classification...`));
  const plan = await classifyClipWindows(clipWindows, scriptText, nicheInfo, themeHints, budget, topic, theme, isHorror);

  // Pass 2: Assign details in chunks of 40
  const CHUNK_SIZE = 40;
  const allClips = [];

  for (let ci = 0; ci < clipWindows.length; ci += CHUNK_SIZE) {
    const windowChunk = clipWindows.slice(ci, ci + CHUNK_SIZE);
    const planChunk = plan.slice(ci, ci + CHUNK_SIZE);
    const isFirst = ci === 0;
    const isLast = ci + CHUNK_SIZE >= clipWindows.length;

    console.log(chalk.gray(`  Directing clips ${ci + 1}-${Math.min(ci + CHUNK_SIZE, clipWindows.length)} of ${clipWindows.length}...`));

    const chunkClips = await directClipWindows(
      windowChunk, planChunk, scriptText, isFirst, isLast,
      nicheInfo, themeHints, budget, topic, theme, isHorror
    );
    allClips.push(...chunkClips);
  }

  // Post-processing
  let finalClips = applyPostProcessing(allClips, totalDuration, scriptText, nicheInfo);

  console.log(chalk.gray(`  Storyboard: ${finalClips.length} clips`));
  return finalClips;
}

// ─── PASS 2: ASSIGN VISUAL DETAILS ───────────────────────────────────────────
async function directClipWindows(windows, planChunk, scriptText, isFirst, isLast, nicheInfo, themeHints, budget, topic, theme, isHorror) {

  // Build window reference showing each window + its planned category and type
  const windowRef = windows.map((w, i) => {
    const plan = planChunk[i] || {};
    const dur = (w.end - w.start).toFixed(1);
    return `[${i}] ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s (${dur}s) | PLAN: ${plan.category || "stock"}→${plan.type || "stock"} | "${w.text}"`;
  }).join("\n");

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{
        role: "user",
        content: buildAssignmentPrompt(windowRef, windows, planChunk, scriptText, isFirst, isLast, nicheInfo, themeHints, topic, theme, isHorror),
      }],
    },
    {
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      timeout: 120000,
    }
  );

  const content = response.data.content[0].text;
  let clips = parseClipsJSON(content);
  clips = validateAndSyncClips(clips, windows, nicheInfo);
  return clips;
}

// ─── ASSIGNMENT PROMPT ───────────────────────────────────────────────────────
function buildAssignmentPrompt(windowRef, windows, planChunk, scriptText, isFirst, isLast, nicheInfo, themeHints, topic, theme, isHorror) {
  return `You are filling in the details for a pre-planned YouTube video storyboard.

VIDEO: "${topic}" | NICHE: ${nicheInfo.niche} | THEME: "${theme}"
IMAGE STYLE: ${nicheInfo.imageStyle}
THEME PREFERRED: ${themeHints.prefer.join(", ")}

Each clip window below has a PLANNED category and type. Your job is to fill in the exact details.
start_time and end_time are FIXED — do not change them.

CLIP WINDOWS WITH PLAN:
${windowRef}

SCRIPT CONTEXT:
${scriptText.slice(0, 2500)}

═══ HOW TO FILL EACH TYPE ═══

STOCK (category: stock):
- search_query: specific scene matching EXACTLY what narrator is saying — emotion + subject + context
- search_queries: if clip is 5s+, add 2-3 different angles as array ["query1","query2","query3"]
- display_style: use the PLAN display ("framed", "fullscreen", "split_left", "split_right")
- panel_icon: for split layouts — one emoji matching the moment (🚀💰🧠🔥⚡🎯💡📈🏆✅😤🎭💪😱) or null

ANIMATION (category: animation) — use the PLAN type:
- "kinetic_text" → animation_data: {lines:["EXACT","SPOKEN","WORDS"], style:"impact"} — max 3 lines, exact words narrator says
- "count_up" → animation_data: {value:NUMBER, prefix:"$", suffix:"", label:"what it is", decimals:0}
- "money_counter" → animation_data: {amount:NUMBER, currency:"$", label:"what the money is"}
- "spotlight_stat" → animation_data: {value:"92%", label:"exact stat description", context:"one sentence context"}
- "reaction_face" → animation_data: {emoji:"🤯", label:"exact words narrator says here", style:"slam"}
- "neon_sign" → animation_data: {text:"EXACT PHRASE", subtitle:"optional context"}
- "warning_siren" → animation_data: {headline:"WARNING", body:"the specific mistake/danger from script", icon:"⚠️"}
- "checkmark_build" → animation_data: {items:["step from script","step from script","step from script"], title:"optional"}
- "before_after" → animation_data: {before:"situation before", after:"situation after", label:"the transformation"}
- "news_breaking" → animation_data: {headline:"DRAMATIC FACT FROM SCRIPT", subtext:"one line context", ticker:"DEVELOPING"}
- "highlight_build" → animation_data: {lines:["key phrase","second phrase","third phrase"], delay:0.3}
- "typewriter_reveal" → animation_data: {text:"exact phrase narrator says", subtitle:"context"}
- "glitch_text" → animation_data: {text:"SHOCKING CLAIM FROM SCRIPT"}
- "trend_arrow" → animation_data: {direction:"up", value:"340%", label:"what is growing/declining"}
- "percent_fill" → animation_data: {percent:73, label:"what the percentage represents"}
- "tweet_card" → animation_data: {handle:"@relevant", text:"quote from script", likes:"24.3K", retweets:"8.1K"}
- "phone_screen" → animation_data: {app:"instagram", notification:"notification matching script", metric:"10.2K"}

SPLIT (category: split):
- visual_type: "stock"
- display_style: "split_left" or "split_right" (use from plan)
- search_query: scene matching what narrator is saying
- panel_type: "icon"
- panel_icon: ONE emoji that genuinely matches the narrator's words right now

INFOGRAPHIC (category: infographic) — use the PLAN type:
- "number_reveal" → number_data: {value:NUMBER, prefix:"$", suffix:"%", label:"short label", style:"counter"}
- "stat_card" → chart_data: {title:"title", stats:[{value:"clean number",label:"description"}]}
- "timeline" → chart_data: {title:"title", events:[{year:"year",label:"event"}]}
- "checklist" → chart_data: {title:"title", items:["item from script","item","item"], checked:true}
- "progress_bar" → chart_data: {title:"title", bars:[{label:"item",value:75,suffix:"%",color:""}]}
- "trend_arrow" → animation_data: {direction:"up|down", value:"X%", label:"what is changing"}
- "percent_fill" → animation_data: {percent:NUMBER, label:"description of the percentage"}

${isFirst ? `FIRST CLIP: Make it dramatic. Use kinetic_text with the most shocking words from the opening, or a fullscreen stock image.` : ""}
${isLast ? `LAST CLIP: Make it memorable. Use checkmark_build, thumbs_up, or quote_overlay.` : ""}

═══ RULES ═══
- NEVER change start_time or end_time
- NEVER invent animation text — only use exact words narrator speaks in that window
- NEVER set panel_text — always null
- NEVER web_image for logos, apps, brands
- BANNED in search_query: baby,infant,child,toddler,kid,subscribe,logo,brand${isHorror ? "" : ",knife,weapon,ghost,monster,blood,horror,killer"}

Return ONLY valid JSON array, one object per clip in order:
[{"start_time":${windows[0]?.start||0},"end_time":${windows[0]?.end||2},"visual_type":"stock","display_style":"framed","search_query":"","search_queries":null,"panel_text":null,"panel_type":"clean","panel_icon":null,"ai_prompt":"","number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null,"chart_data":null,"animation_data":null,"transition_speed":"fast","interrupt_data":null,"quote_data":null,"countdown_data":null,"subtitle_words":[]}]`;
}

// ─── PARSE JSON ───────────────────────────────────────────────────────────────
function parseClipsJSON(content) {
  let str = content.trim()
    .replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
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

  for (let i = 0; i < windows.length; i++) {
    const window = windows[i];
    const clip = clips[i];

    if (!clip) {
      result.push(makeStockClip(window, nicheInfo));
      continue;
    }

    // FORCE timing to match window exactly
    clip.start_time = window.start;
    clip.end_time = window.end;
    clip.subtitle_words = [];

    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";

    // Animation needs animation_data
    const animTypes = new Set(["kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow","stock_ticker","phone_screen","tweet_card","word_scatter","social_counter","before_after","lightbulb_moment","rocket_launch","news_breaking","percent_fill","compare_reveal","highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side","youtube_progress","warning_siren","quote_overlay","overlay_caption","polaroid_stack"]);
    if (animTypes.has(clip.visual_type) && !clip.animation_data) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }

    const validStyles = ["fullscreen","framed","fullscreen_zoom","split_left","split_right"];
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";

    clip.panel_text = null;
    if (clip.panel_type === "words") clip.panel_type = "clean";

    let q = (clip.search_query || "").toLowerCase();
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
    if (bannedVisuals.some(b => q.includes(b))) {
      q = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[Math.floor(Math.random() * 5)];
    }
    if (q.length < 3) {
      q = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[i % 5];
    }
    clip.search_query = q;

    if (clip.search_queries && Array.isArray(clip.search_queries)) {
      clip.search_queries = clip.search_queries.map(sq => {
        let c = (sq || "").toLowerCase();
        banned.forEach(b => { c = c.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
        if (bannedVisuals.some(b => c.includes(b))) c = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[0];
        return c.length >= 3 ? c : null;
      }).filter(Boolean);
      if (clip.search_queries.length === 0) clip.search_queries = null;
    }

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
    business: "confident entrepreneur professional workspace", finance: "financial growth professional business",
    health: "fitness active healthy lifestyle", travel: "scenic destination landscape travel",
    horror: "dark atmospheric mysterious", true_crime: "detective investigation professional",
    history: "ancient ruins historical", creator: "content creator studio camera",
    general: "professional aspirational confident person",
  };
  return {
    start_time: window.start, end_time: window.end, visual_type: "stock", display_style: "framed",
    search_query: fallbacks[niche] || fallbacks.general, search_queries: null,
    panel_text: null, panel_type: "clean", panel_icon: null, animation_data: null,
    chart_data: null, transition_speed: "fast", subtitle_words: [],
  };
}

// ─── POST-PROCESSING ──────────────────────────────────────────────────────────
function applyPostProcessing(allClips, totalDuration, scriptText, nicheInfo) {

  allClips.sort((a, b) => a.start_time - b.start_time);

  if (allClips.length > 0 && allClips[0].start_time > 0.5) {
    allClips.unshift(makeStockClip({ start: 0, end: allClips[0].start_time }, nicheInfo));
  }
  if (allClips.length > 0) {
    const last = allClips[allClips.length - 1];
    if (totalDuration - last.end_time > 0.5) last.end_time = totalDuration;
  }

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

  // No same type twice in a row
  let lastType = "";
  allClips.forEach(clip => {
    if (clip.visual_type !== "stock" && clip.visual_type === lastType) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }
    lastType = clip.visual_type;
  });

  // Hook protection: no data infographics in first 5s
  const infraTypes = new Set(["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","horizontal_bar","vertical_bar","growth_curve","ranking_cards","split_comparison","scale_comparison","funnel_chart","body_diagram","map_highlight","icon_grid","flow_diagram","checklist","quote_card"]);
  allClips.forEach(clip => {
    if (clip.start_time < 5 && infraTypes.has(clip.visual_type)) {
      clip.visual_type = "stock";
      clip.display_style = clip.start_time < 2 ? "fullscreen" : "framed";
      clip.search_query = clip.search_query || "dramatic cinematic opening";
    }
  });

  // Inject interrupt cards every 90s
  const facts = extractFacts(scriptText);
  if (facts.length > 0) {
    for (let t = 90; t < totalDuration - 15; t += 90) {
      const host = allClips.find(c => c.start_time <= t && c.end_time > t + 5 && (c.visual_type === "stock" || c.visual_type === "ai_image"));
      if (host) {
        const factIdx = Math.floor(t / 90) - 1;
        if (factIdx < facts.length) {
          allClips.push({
            start_time: t, end_time: t + 5, visual_type: "interrupt_card", display_style: "framed",
            search_query: "", subtitle_words: [], interrupt_data: { fact: facts[factIdx], label: "Did you know?" },
            panel_text: null, panel_type: "clean", animation_data: null, chart_data: null, transition_speed: "fast",
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
