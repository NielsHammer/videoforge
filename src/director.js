import axios from "axios";
import chalk from "chalk";

/**
 * Director v33 — Creative Director Mode
 *
 * Claude reads the script like a human editor, understands emotional arc,
 * and makes intentional moment-by-moment decisions. No more template filling.
 * Every visual matches what the narrator is SAYING right now.
 * 
 * v33: 27 animation components, fullscreen cap per-minute, theme-matched animations
 */
export async function createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode = "visual", topic = "", theme = "blue_grid") {
  const CHUNK_SECONDS = 120;
  let allClips;

  if (totalDuration <= 180) {
    allClips = await processChunk(scriptText, wordTimestamps, 0, totalDuration, 0, 1, contentMode, topic, theme);
  } else {
    const chunks = [];
    let chunkStart = 0;
    while (chunkStart < totalDuration) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SECONDS, totalDuration);
      const chunkWords = wordTimestamps
        .map((w, i) => ({ ...w, originalIndex: i }))
        .filter(w => w.start >= chunkStart - 0.1 && w.start < chunkEnd);
      if (chunkWords.length > 0) chunks.push({ words: chunkWords, startTime: chunkStart, endTime: chunkEnd });
      chunkStart = chunkEnd;
    }
    console.log(chalk.gray(`  Splitting into ${chunks.length} chunks for director...`));
    allClips = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(chalk.gray(`  Directing chunk ${i + 1}/${chunks.length} (${chunk.startTime.toFixed(0)}s-${chunk.endTime.toFixed(0)}s)...`));
      const chunkClips = await processChunk(scriptText, chunk.words, chunk.startTime, chunk.endTime, i, chunks.length, contentMode, topic, theme);
      allClips.push(...chunkClips);
    }
  }

  // Hook protection: first 5s = image only
  const infraTypes = ["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","horizontal_bar","vertical_bar","growth_curve","ranking_cards","split_comparison","scale_comparison","funnel_chart","body_diagram","map_highlight","icon_grid","flow_diagram","checklist","quote_card"];
  allClips.forEach(clip => {
    if (clip.start_time < 5 && infraTypes.includes(clip.visual_type)) {
      clip.visual_type = "stock";
      clip.search_query = clip.search_query || "dramatic cinematic opening";
      clip.display_style = "fullscreen";
    }
  });

  // Visual mode: cap infographics at 15%
  if (contentMode === "visual") {
    let infraCount = 0;
    const maxInfra = Math.max(2, Math.floor(allClips.length * 0.15));
    allClips.forEach(clip => {
      if (infraTypes.includes(clip.visual_type)) {
        infraCount++;
        if (infraCount > maxInfra) { clip.visual_type = "stock"; clip.search_query = clip.search_query || "cinematic scene"; clip.display_style = "framed"; }
      }
    });
  }

  // Text flash limit: max 3
  let textFlashCount = 0;
  allClips.forEach(clip => {
    if (clip.visual_type === "text_flash") {
      textFlashCount++;
      if (textFlashCount > 3) { clip.visual_type = "stock"; clip.search_query = "cinematic scene"; clip.display_style = "framed"; }
    }
  });

  // Inject engagement elements BEFORE fullscreen cap so injected clips are counted
  allClips = injectInterruptCards(allClips, scriptText, totalDuration);
  allClips = injectQuotePulls(allClips, scriptText);
  if (detectListVideo(scriptText)) allClips = injectCountdownHooks(allClips);

  // Fullscreen cap: max 4 per minute — runs AFTER injections so all clips are counted
  // Injected graphic types (interrupt_card, quote_pull, countdown_corner) use "framed"
  // since display_style doesn't affect rendering for graphic-only types anyway
  const maxFullscreen = Math.max(2, Math.ceil((totalDuration / 60) * 4));
  let fullscreenCount = 0;
  allClips.forEach(clip => {
    if (clip.display_style === "fullscreen" || clip.display_style === "fullscreen_zoom") {
      fullscreenCount++;
      if (fullscreenCount > maxFullscreen) {
        clip.display_style = "framed";
      }
    }
  });

  // Sort and fix overlaps
  allClips.sort((a, b) => a.start_time - b.start_time);
  for (let i = 1; i < allClips.length; i++) {
    if (allClips[i].start_time < allClips[i - 1].end_time) {
      allClips[i].start_time = allClips[i - 1].end_time;
      if (allClips[i].end_time <= allClips[i].start_time) allClips[i].end_time = allClips[i].start_time + 2;
    }
  }

  // Max clip duration cap — long clips look boring, force b-roll variety
  // Stock/ai/web images: max 8s. Animation types: max 7s. Graphics: no cap (they're designed length).
  const imageTypes = new Set(["stock","ai_image","web_image","web_screenshot"]);
  const animSet = new Set([
    "kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter","glitch_text",
    "checkmark_build","trend_arrow","stock_ticker","phone_screen","tweet_card","word_scatter",
    "social_counter","before_after","lightbulb_moment","rocket_launch","news_breaking","percent_fill",
    "compare_reveal","highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side",
    "youtube_progress","warning_siren","quote_overlay","overlay_caption","polaroid_stack",
  ]);
  allClips.forEach(clip => {
    const dur = clip.end_time - clip.start_time;
    if (imageTypes.has(clip.visual_type) && dur > 8) clip.end_time = clip.start_time + 8;
    if (animSet.has(clip.visual_type) && dur > 7) clip.end_time = clip.start_time + 7;
  });

  // Combined non-image cap: animations + infographics together max 45% of clips
  // Prevents videos that are mostly graphics with barely any real imagery
  const allNonImageTypes = new Set([...animSet, ...infraTypes]);
  const maxNonImage = Math.ceil(allClips.length * 0.45);
  let nonImageCount = 0;
  allClips.forEach(clip => {
    if (allNonImageTypes.has(clip.visual_type)) {
      nonImageCount++;
      if (nonImageCount > maxNonImage) {
        clip.visual_type = "stock";
        clip.display_style = "framed";
      }
    }
  });

  console.log(chalk.gray(`  Storyboard: ${allClips.length} clips`));
  return allClips;
}

function injectInterruptCards(clips, scriptText, totalDuration) {
  const INTERVAL = 90, CARD_DURATION = 5;
  const facts = extractFacts(scriptText);
  if (!facts.length) return clips;
  const injected = [...clips];
  let factIndex = 0;
  for (let t = INTERVAL; t < totalDuration - 10; t += INTERVAL) {
    if (factIndex >= facts.length) break;
    const hostClipIdx = injected.findIndex(c => c.start_time <= t && c.end_time > t + CARD_DURATION && (c.visual_type === "stock" || c.visual_type === "ai_image" || c.visual_type === "web_image"));
    if (hostClipIdx === -1) { factIndex++; continue; }
    injected.push({ start_time: t, end_time: t + CARD_DURATION, visual_type: "interrupt_card", display_style: "fullscreen", search_query: "", subtitle_words: [], interrupt_data: { fact: facts[factIndex], label: "Did you know?" } });
    factIndex++;
  }
  return injected;
}

function extractFacts(scriptText) {
  const sentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 120);
  const withNumbers = sentences.filter(s => /\d+|percent|million|billion|thousand/.test(s));
  const pool = withNumbers.length >= 3 ? withNumbers : sentences;
  const step = Math.floor(pool.length / 5) || 1;
  const facts = [];
  for (let i = 0; i < pool.length && facts.length < 5; i += step) facts.push(pool[i]);
  return facts;
}

function injectQuotePulls(clips, scriptText) {
  const sectionBreaks = clips.filter(c => c.visual_type === "section_break");
  if (!sectionBreaks.length) return clips;
  const powerSentences = extractPowerSentences(scriptText);
  if (!powerSentences.length) return clips;
  const injected = [...clips];
  sectionBreaks.forEach((breakClip, idx) => {
    if (idx >= powerSentences.length) return;
    const afterBreakIdx = injected.findIndex(c => c.start_time >= breakClip.end_time && (c.visual_type === "stock" || c.visual_type === "ai_image"));
    if (afterBreakIdx === -1) return;
    const afterClip = injected[afterBreakIdx];
    if (afterClip.end_time - afterClip.start_time < 6) return;
    const quoteDuration = 4.5;
    injected.push({ start_time: afterClip.start_time, end_time: afterClip.start_time + quoteDuration, visual_type: "quote_pull", display_style: "fullscreen", search_query: "", subtitle_words: [], quote_data: { quote: powerSentences[idx], attribution: "" } });
    afterClip.start_time += quoteDuration;
  });
  return injected;
}

function extractPowerSentences(scriptText) {
  const sentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30 && s.length < 150);
  const dramatic = sentences.filter(s => /never|always|most|every|secret|truth|real|nobody|everybody|worst|best|only|first|last/i.test(s));
  const pool = dramatic.length >= 2 ? dramatic : sentences;
  const step = Math.floor(pool.length / 5) || 1;
  const picks = [];
  for (let i = 0; i < pool.length && picks.length < 5; i += step) picks.push(pool[i]);
  return picks;
}

function detectListVideo(scriptText) {
  return /\b(top \d+|the \d+ best|the \d+ worst|\d+ reasons why|\d+ ways to|\d+ things (you|that)|ranked:)\b/i.test(scriptText);
}

function injectCountdownHooks(clips) {
  const sectionBreaks = clips.filter(c => c.visual_type === "section_break");
  if (sectionBreaks.length < 2) return clips;
  const total = sectionBreaks.length;
  const injected = [...clips];
  sectionBreaks.forEach((breakClip, idx) => {
    breakClip.countdown_data = { current: idx + 1, total };
    injected.push({ start_time: breakClip.end_time, end_time: breakClip.end_time + 4, visual_type: "countdown_corner", display_style: "fullscreen", search_query: "", subtitle_words: [], countdown_data: { current: idx + 1, total } });
  });
  return injected;
}

function detectNiche(topic, scriptText) {
  const text = (topic + " " + scriptText.slice(0, 500)).toLowerCase();
  if (/horror|scary|creepy|haunted|ghost|demon|paranormal|murder|serial killer|nightmare|terror/.test(text))
    return { niche: "horror", imageStyle: "dark atmospheric, eerie, suspenseful, horror" };
  if (/true crime|crime|detective|investigation|cold case/.test(text))
    return { niche: "true_crime", imageStyle: "detective work, investigation, crime scene evidence, courtroom" };
  if (/side hustle|passive income|make money|freelance|entrepreneur|ecommerce|dropship|affiliate/.test(text))
    return { niche: "business", imageStyle: "entrepreneur laptop success, professional workspace, confident businessperson, startup office, freelancer working" };
  if (/invest|stock|dividend|portfolio|finance|wealth|market|trading|crypto/.test(text))
    return { niche: "finance", imageStyle: "financial charts growth, professional investor, business district, wealth success, confident executive" };
  if (/travel|destination|country|tourism|adventure|vacation|beach|island/.test(text))
    return { niche: "travel", imageStyle: "beautiful destination, scenic landscape, cultural experience, travel adventure, landmark photography" };
  if (/health|fitness|gym|workout|diet|nutrition|body|exercise/.test(text))
    return { niche: "health", imageStyle: "gym workout, healthy food, active lifestyle, sports performance, fit person exercising" };
  if (/history|ancient|medieval|empire|war|civilization/.test(text))
    return { niche: "history", imageStyle: "historical ruins, ancient artifact, period architecture, museum piece, historical scene" };
  if (/personal brand|youtube|content creator|social media|influencer|audience/.test(text))
    return { niche: "creator", imageStyle: "content creator studio, YouTube setup, camera recording, social media phone, online audience" };
  return { niche: "general", imageStyle: "professional modern, clean aspirational, person thinking, city skyline, team collaboration" };
}

// Which animation types feel right for each theme personality
function getThemeAnimationHints(theme) {
  const hints = {
    // Tech / data themes → glitchy, data-driven, digital
    green_matrix:    { prefer: ["glitch_text","stock_ticker","typewriter_reveal","neon_sign","word_scatter"], avoid: ["polaroid_stack","lightbulb_moment","reaction_face"] },
    blue_tech:       { prefer: ["stock_ticker","typewriter_reveal","count_up","trend_arrow","glitch_text"], avoid: ["polaroid_stack","neon_sign","reaction_face"] },
    cyber_purple:    { prefer: ["neon_sign","glitch_text","stock_ticker","word_scatter","kinetic_text"], avoid: ["polaroid_stack","lightbulb_moment"] },
    // Luxury / elegant themes → smooth, sleek, cinematic
    gold_luxury:     { prefer: ["quote_overlay","spotlight_stat","money_counter","compare_reveal","overlay_caption"], avoid: ["glitch_text","neon_sign","reaction_face","stock_ticker"] },
    dark_minimal:    { prefer: ["quote_overlay","kinetic_text","spotlight_stat","overlay_caption","neon_sign"], avoid: ["reaction_face","polaroid_stack","lightbulb_moment"] },
    // Energetic / bold themes → fast, impact, emoji
    orange_fire:     { prefer: ["kinetic_text","rocket_launch","reaction_face","warning_siren","trend_arrow","count_up"], avoid: ["quote_overlay","polaroid_stack"] },
    red_impact:      { prefer: ["warning_siren","kinetic_text","reaction_face","news_breaking","spotlight_stat"], avoid: ["polaroid_stack","lightbulb_moment","phone_screen"] },
    // Friendly / warm themes → emojis, personality, approachable
    warm_sunset:     { prefer: ["reaction_face","lightbulb_moment","thumbs_up","checkmark_build","highlight_build"], avoid: ["warning_siren","glitch_text","stock_ticker"] },
    blue_minimal:    { prefer: ["highlight_build","checkmark_build","count_up","compare_reveal","typewriter_reveal"], avoid: ["warning_siren","glitch_text","neon_sign"] },
    // Social / creator themes → phone, tweet, social, youtube
    creator_pink:    { prefer: ["phone_screen","tweet_card","social_counter","youtube_progress","reaction_face","polaroid_stack"], avoid: ["stock_ticker","glitch_text"] },
    // Default fallback
    default:         { prefer: ["kinetic_text","spotlight_stat","highlight_build","count_up","checkmark_build"], avoid: [] },
  };
  return hints[theme] || hints.default;
}

async function processChunk(scriptText, chunkWords, startTime, endTime, chunkIndex, totalChunks, contentMode, topic, theme = "blue_grid") {
  const wordRef = chunkWords.map((w) => {
    const idx = w.originalIndex !== undefined ? w.originalIndex : chunkWords.indexOf(w);
    return `[${idx}] "${w.word}" ${w.start.toFixed(2)}s`;
  }).join("\n");

  const duration = endTime - startTime;
  const isFirstChunk = chunkIndex === 0;
  const isLastChunk = chunkIndex === totalChunks - 1;
  const nicheInfo = detectNiche(topic, scriptText);
  const isHorror = nicheInfo.niche === "horror" || nicheInfo.niche === "true_crime";
  const themeHints = getThemeAnimationHints(theme);

  // Determine niche-aware infographic budget
  const nicheBudgets = {
    finance:    { maxPct: 50, label: "data-heavy — charts and numbers tell the story" },
    business:   { maxPct: 30, label: "motivational — mix of inspiration and key stats only" },
    health:     { maxPct: 35, label: "mix of lifestyle imagery and key health stats" },
    horror:     { maxPct: 5,  label: "almost no infographics — pure atmosphere and imagery" },
    true_crime: { maxPct: 10, label: "minimal infographics — storytelling through images" },
    travel:     { maxPct: 10, label: "almost no infographics — scenery and culture" },
    history:    { maxPct: 20, label: "mostly imagery with occasional timeline/dates" },
    creator:    { maxPct: 15, label: "social-native — phone screens, tweet cards, youtube stats" },
    general:    { maxPct: 25, label: "light mix — use infographics sparingly" },
  };
  const budget = nicheBudgets[nicheInfo.niche] || nicheBudgets.general;

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{
        role: "user",
        content: `You are an award-winning creative director for YouTube. You have complete creative control.

VIDEO TOPIC: "${topic}"
NICHE: ${nicheInfo.niche}
IMAGE STYLE: ${nicheInfo.imageStyle}
CONTENT MODE: ${contentMode.toUpperCase()}
VISUAL THEME: "${theme}"
SEGMENT: ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s (${duration.toFixed(0)}s total)

═══ THEME PERSONALITY — MATCH ANIMATIONS TO THIS ═══
The video uses the "${theme}" visual theme. Pick animations that match its personality.
PREFERRED for this theme: ${themeHints.prefer.join(", ")}
AVOID for this theme: ${themeHints.avoid.join(", ")}
All animation colors auto-match the theme — you just pick the right TYPE for the mood.

═══ INFOGRAPHIC BUDGET ═══
This is a ${nicheInfo.niche} video: ${budget.label}
Maximum infographics: ${budget.maxPct}% of clips (≈${Math.round(duration/4 * budget.maxPct/100)} clips max)
The rest MUST be stock images, creative animations, or text_flash.

═══ YOUR JOB ═══
Read what the narrator is saying at each moment. Choose visuals that REINFORCE that exact moment.

CRITICAL RULES:
1. Images match the SPECIFIC MOMENT — not just the topic
2. ${isHorror ? "Dark imagery is appropriate for this niche." : "NEVER horror/dark/violent imagery. Use: " + nicheInfo.imageStyle}
3. search_query describes EMOTION + SPECIFIC MOMENT, not just the topic
4. Vary pacing: shocking moment = 5-7s, transition = 2-3s, animation = 3-6s
5. PREFER framed layout over fullscreen — max ${Math.ceil(duration/60*4)} fullscreen clips for this ${duration.toFixed(0)}s segment
6. NO same visual_type twice in a row

WORD TIMESTAMPS:
${wordRef}

SCRIPT:
${scriptText.slice(0, 4000)}

═══ CREATIVE ANIMATIONS — use these liberally, they make videos unique ═══

TEXT/WORD ANIMATIONS:
"kinetic_text": animation_data: {lines:["WORD1","WORD2","WORD3"], style:"impact|stack|typewriter"} — words slam onto screen dramatically. Best for: hook moments, key revelations, transitions. 3-5s.
"typewriter_reveal": animation_data: {text:"FULL PHRASE HERE", subtitle:"optional context"} — text types out character by character. Best for: builds, reveals, quotes. 4-6s.
"highlight_build": animation_data: {lines:["Key Phrase","Second Point","Third Point"], delay:0.35} — phrases appear with highlighter swipe. Best for: lists of benefits, key takeaways. 5-8s.
"glitch_text": animation_data: {text:"SHOCKING CLAIM", subtitle:"optional"} — digital glitch effect. Best for: tech topics, shocking stats, green_matrix/cyber themes. 3-5s.
"neon_sign": animation_data: {text:"THE TRUTH", subtitle:"nobody talks about", flicker:true} — glowing neon with flicker. Best for: dramatic emphasis, bold claims, night/urban topics. 4-6s.
"word_scatter": animation_data: {words:["word1","word2","word3","word4","word5"]} — words fly in from random directions. Best for: listing many concepts, brainstorm moments. 4-6s.

STAT/DATA ANIMATIONS:
"spotlight_stat": animation_data: {value:"92%", label:"never take action", context:"Don't be a statistic"} — single dramatic stat with spotlight. Best for: shocking numbers. 4-6s.
"count_up": animation_data: {value:10000000, prefix:"$", suffix:"", label:"in revenue", decimals:0, duration:2.5} — number counts up in a glowing ring. Best for: any numeric stat. 4-6s.
"money_counter": animation_data: {amount:50000, currency:"$", label:"average salary", duration:2} — dollar amount spinning up. Best for: finance/money moments. 4-6s.
"trend_arrow": animation_data: {direction:"up|down", value:"340%", label:"growth in 12 months", context:"optional"} — animated arrow showing direction. Best for: growth/decline stats. 4-6s.
"percent_fill": animation_data: {percent:73, label:"of people fail", color:"#ef4444"} — circle fills to percentage. Best for: proportion stats. 4-6s.
"before_after": animation_data: {before:"$2,000/mo", after:"$12,000/mo", label:"income transformation", duration:12} — before/after reveal. Best for: transformations, results. 5-7s.
"compare_reveal": animation_data: {items:[{label:"Option A",value:"$500"},{label:"Option B",value:"$5,000"}], title:"The Difference"} — side by side comparison. Best for: contrasts. 5-7s.
"side_by_side": animation_data: {left:"BEFORE", right:"AFTER", leftSub:"2020", rightSub:"2024", vs:true, leftColor:"#ef4444", rightColor:"#22c55e"} — two concepts side by side. Best for: comparisons, then/now. 5-7s.

CHARACTER/REACTION ANIMATIONS:
"icon_burst": animation_data: {icons:["🚀","💰","🎯","⚡","🔥"], label:"What you'll learn", style:"burst|grid|orbit"} — icons burst onto screen. Best for: list reveals, benefits. 4-6s.
"reaction_face": animation_data: {emoji:"🤯", label:"Mind = Blown", style:"slam|bounce|spin|float"} — large emoji reacts dramatically. Best for: shocking moments, humor, emotional beats. 3-5s.
"lightbulb_moment": animation_data: {headline:"The Key Insight", subtext:"optional supporting text"} — lightbulb flickers on. Best for: ideas, aha moments, tips. 4-6s.
"thumbs_up": animation_data: {type:"up|down|both", items:["it works","it's fast"], verdict:"DO THIS"} — thumbs up/down with verdict. Best for: pros/cons, recommendations. 5-7s.
"checkmark_build": animation_data: {items:["Step one","Step two","Step three"], title:"optional"} — checkmarks appear one by one. Best for: lists, steps, how-tos. 5-8s.
"rocket_launch": animation_data: {headline:"GROWTH", subtext:"optional", stage:"launch|orbit"} — rocket launches for growth moments. Best for: growth, success, momentum topics. 4-6s.
"warning_siren": animation_data: {headline:"WARNING", body:"90% of people make this mistake", icon:"⚠️", color:"#ef4444"} — flashing alert card. Best for: dangers, mistakes, shocking negatives. 4-6s.

SOCIAL/PLATFORM ANIMATIONS:
"tweet_card": animation_data: {handle:"@realexample", text:"This strategy made me $50k in 90 days", likes:"24.3K", retweets:"8.1K"} — tweet-style card. Best for: social proof, quotes, creator topics. 4-6s.
"phone_screen": animation_data: {app:"instagram|youtube|tiktok|messages", notification:"You have 10,000 new followers", metric:"10.2K"} — phone with app notification. Best for: creator/social topics. 4-6s.
"social_counter": animation_data: {platform:"YouTube", metric:"subscribers", value:1000000, duration:2.5} — follower count spinning up. Best for: growth milestones, social proof. 4-6s.
"youtube_progress": animation_data: {views:"10.2M", subs:"500K", title:"This video changed everything", views_bar:0.82, revenue:"$8,400"} — YouTube analytics card. Best for: creator topics, YouTube growth. 5-7s.
"news_breaking": animation_data: {headline:"LOCAL MAN MAKES $50K", subtext:"from laptop in bedroom", ticker:"MARKETS RESPOND • STORY DEVELOPING"} — breaking news card. Best for: dramatic reveals, shocking facts. 4-6s.

SCENE OVERLAYS — these REQUIRE a search_query (they render text/animation ON TOP of a fetched image):
"quote_overlay": search_query:"REQUIRED — cinematic background image", animation_data: {quote:"The greatest risk is not taking one.", attribution:"—Mark Zuckerberg"} — quote overlaid on an image. Best for: inspirational moments. 4-6s.
"overlay_caption": search_query:"REQUIRED — dramatic scene matching the caption mood", animation_data: {caption:"This changes everything", position:"bottom|top|center", style:"bold|subtitle"} — bold caption on a full image, documentary style. 4-7s.
"polaroid_stack": search_query:"REQUIRED — lifestyle scene", search_queries:["scene1","scene2","scene3"], animation_data: {captions:["caption1","caption2","caption3"]} — b-roll images displayed as falling polaroids. Best for: personal brand, lifestyle, story. 5-7s.
"stock_ticker": animation_data: {items:[{symbol:"HUSTLE",price:"$247.50",change:"+18.4%"},{symbol:"EFFORT",price:"$891.20",change:"+12.1%"}], title:"optional"} — scrolling stock ticker. Best for: finance, business, ironic emphasis. 5-7s.

LEGACY INFOGRAPHICS — only when data genuinely needs visualizing:
"number_reveal": number_data: {value: NUMBER only, prefix: "$", suffix: "%", label: "short label", style: "counter|gauge|bars|spotlight|ticker|impact"}
"line_chart": chart_data: {title, points:[{label,value}], suffix, color}
"donut_chart": chart_data: {title, centerLabel, segments:[{label,value,color}]}
"progress_bar": chart_data: {title, bars:[{label,value,suffix,color}]}
"timeline": chart_data: {title, events:[{year,label}]}
"leaderboard": chart_data: {title, items:[{label,value,suffix}]}
"stat_card": chart_data: {title, stats:[{value,label,prefix,change,changeColor}]} — value must be clean number or short string
"checklist": chart_data: {title, items:[...], checked:true}
"horizontal_bar": chart_data: {title, items:[{label,value,color}], suffix} — value must be NUMBER
"comparison": comparison_data: {items:[{label,value,display,color}]} — value must be NUMBER
"section_break": section_data: {number:"#1", title:"TITLE", hook_line:"Most provocative sentence from NEXT section"}
"text_flash": text_flash_text: "2-4 WORDS" — words narrator is literally saying right now
"quote_card": chart_data: {quote:"exact quote", attribution:"", style:"bold"}

IMAGES — your primary tool:
"stock": search_query = specific emotion/moment RIGHT NOW
  display_style:
    "framed" — DEFAULT. Image in cinematic moving frame, animated background visible. Use 60%+ of the time.
    "split_left" or "split_right" — image one side, content other. 20-30% of clips.
    "fullscreen" — ONLY opening hook or max ${Math.ceil(duration/60*4)} total for this segment.
    "fullscreen_zoom" — same restriction.
  search_queries: ["q1","q2","q3"] for b-roll on clips 6+ seconds
  transition_speed: "fast"|"slow"
  panel_text: for split layouts — punchy 2-3 words. E.g. "92% FAIL". Omit if nothing fits.
  panel_type: "words"|"icon"|"clean"
  panel_icon: emoji for panel_type "icon". E.g. "🚀" growth, "💰" money, "🧠" mindset
"ai_image": ai_prompt: 20-40 words ultra-specific cinematic
"web_image": ONLY for specific named real people/brands/landmarks

${isFirstChunk ? `HOOK — first 5 seconds:
Clip 1 (0-1.5s): number_reveal OR kinetic_text — shocking opening stat or bold hook words, style "impact"
Clip 2 (1.5-3.5s): stock — emotional reality of that stat, display_style "framed"
Clip 3 (3.5-5s): reaction_face OR text_flash — emotional reaction or 2-3 words narrator is saying` : ""}
${isLastChunk ? "CLOSE: end with checklist, quote_card, or thumbs_up." : ""}

═══ STRICT RULES ═══
- DISPLAY STYLE: "framed" for 60%+ of stock clips. Max ${Math.ceil(duration/60*4)} fullscreen for this segment.
- INFOGRAPHIC BUDGET: max ${budget.maxPct}% of clips
- NEVER same visual_type twice in a row
- NEVER stat_card more than 2 times total
- NEVER any infographic type more than 2 times total
- After every infographic, next clip MUST be stock, animation, or text_flash
- stat_card and number_reveal values must be clean numbers — never ranges like "$1K-$5K"
- Cover ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s with no gaps
- BANNED in search_query: baby,infant,child,toddler,kid,subscribe,button,logo${isHorror ? "" : ",knife,weapon,mask,ghost,monster,blood,horror,scary,creepy,ghostface,scream,killer"}

Return ONLY valid JSON array, no markdown:
[{"start_time":${startTime.toFixed(1)},"end_time":0,"visual_type":"","display_style":"framed","search_query":"","search_queries":null,"ai_prompt":"","panel_text":null,"panel_type":"clean","panel_icon":null,"subtitle_words":[],"number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null,"chart_data":null,"animation_data":null,"transition_speed":"fast","interrupt_data":null,"quote_data":null,"countdown_data":null}]`
      }]
    },
    { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, timeout: 120000 }
  );

  const content = response.data.content[0].text;
  let clips = parseClipsJSON(content);
  clips = validateClips(clips, startTime, endTime, nicheInfo);
  return clips;
}

function parseClipsJSON(content) {
  let str = content.trim();
  str = str.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
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

function validateClips(clips, startTime, endTime, nicheInfo) {
  if (!Array.isArray(clips) || !clips.length) throw new Error("Empty storyboard");

  const isHorror = nicheInfo?.niche === "horror" || nicheInfo?.niche === "true_crime";
  const banned = ["baby","infant","child","toddler","kid","kids","children","subscribe","button","icon","logo"];
  const bannedVisuals = isHorror ? [] : ["knife","weapon","mask","ghost","monster","blood","horror","scary","creepy","death","murder","serial","killer","ghostface","scream","terror","haunted","demon","paranormal"];

  const validStyles = ["fullscreen","framed","fullscreen_zoom","split_left","split_right"];

  // All valid visual types including batch2 + batch3
  const validTypes = [
    "stock","number_reveal","comparison","section_break","text_flash","ai_image","web_image","web_screenshot",
    "line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card",
    "checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart",
    "growth_curve","ranking_cards","split_comparison","icon_grid","flow_diagram",
    "interrupt_card","quote_pull","countdown_corner",
    // batch1
    "kinetic_text","spotlight_stat","icon_burst",
    // batch2
    "typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow","stock_ticker",
    "phone_screen","tweet_card","word_scatter","social_counter","before_after","lightbulb_moment",
    "rocket_launch","news_breaking","percent_fill","quote_overlay","compare_reveal",
    // batch3
    "highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side",
    "youtube_progress","polaroid_stack","warning_siren","overlay_caption",
  ];

  // Graphic-only types (no imagePath needed)
  const graphicTypes = [
    "number_reveal","section_break","comparison","text_flash","line_chart","donut_chart","progress_bar",
    "timeline","leaderboard","process_flow","stat_card","quote_card","checklist","horizontal_bar",
    "vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart","growth_curve",
    "ranking_cards","split_comparison","icon_grid","flow_diagram","interrupt_card","quote_pull",
    "countdown_corner",
    "kinetic_text","spotlight_stat","icon_burst",
    "typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow","stock_ticker",
    "phone_screen","tweet_card","word_scatter","social_counter","before_after","lightbulb_moment",
    "rocket_launch","news_breaking","percent_fill","compare_reveal",
    "highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side",
    "youtube_progress","warning_siren",
    // NOTE: quote_overlay, overlay_caption, polaroid_stack CAN use imagePath — don't include them here
  ];

  // Minimum durations for each type
  const minDurations = {
    number_reveal: 5, line_chart: 5, donut_chart: 5, progress_bar: 5, timeline: 5,
    leaderboard: 5, process_flow: 5, stat_card: 5, checklist: 5, horizontal_bar: 5,
    vertical_bar: 5, scale_comparison: 5, growth_curve: 5, ranking_cards: 5,
    split_comparison: 5, kinetic_text: 3, spotlight_stat: 4, icon_burst: 4,
    typewriter_reveal: 4, money_counter: 4, glitch_text: 3, checkmark_build: 5,
    trend_arrow: 4, stock_ticker: 5, phone_screen: 4, tweet_card: 4, word_scatter: 4,
    social_counter: 4, before_after: 5, lightbulb_moment: 4, rocket_launch: 4,
    news_breaking: 4, percent_fill: 4, quote_overlay: 4, compare_reveal: 5,
    highlight_build: 5, count_up: 4, neon_sign: 4, reaction_face: 3, thumbs_up: 5,
    side_by_side: 5, youtube_progress: 5, polaroid_stack: 5, warning_siren: 4,
    overlay_caption: 4, section_break: 2, quote_pull: 4.5, interrupt_card: 5,
    countdown_corner: 4,
  };

  const nicheSafeQueries = {
    business: ["entrepreneur success laptop","professional workspace modern","business confidence achievement","freelancer productive","startup team collaboration"],
    finance: ["financial growth chart","confident investor professional","business district modern","wealth success lifestyle","stock market professional"],
    health: ["gym fitness workout","healthy lifestyle nutrition","active sports performance","wellness outdoor exercise","fit person training"],
    travel: ["scenic destination landscape","travel adventure culture","beautiful nature photography","landmark tourism","travel exploration"],
    horror: ["dark atmospheric night","mysterious shadowy scene","abandoned building eerie","foggy forest dark","suspenseful shadow"],
    true_crime: ["detective investigation office","evidence forensic analysis","courtroom justice","newspaper crime headline","investigation board"],
    history: ["ancient ruins architecture","historical artifact museum","medieval castle","period scene historical","civilization ancient"],
    creator: ["content creator studio setup","youtube filming camera","social media phone screen","online audience engagement","creator workspace desk"],
    general: ["professional modern office","person thoughtful planning","city skyline panoramic","nature peaceful landscape","team working together"],
  };

  let lastStyle = "";
  let lastNumberStyle = "";
  let lastType = "";
  const usedQueries = new Map();

  clips.forEach((clip) => {
    clip.subtitle_words = [];

    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";
    if (!clip.search_query) clip.search_query = "professional scene";

    // If an animation type has no animation_data, convert to stock so it doesn't render blank
    const animationTypes = [
      "kinetic_text","spotlight_stat","icon_burst",
      "typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow",
      "stock_ticker","phone_screen","tweet_card","word_scatter","social_counter","before_after",
      "lightbulb_moment","rocket_launch","news_breaking","percent_fill","compare_reveal",
      "highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side",
      "youtube_progress","warning_siren","quote_overlay","overlay_caption","polaroid_stack",
    ];
    if (animationTypes.includes(clip.visual_type) && !clip.animation_data) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }

    // Enforce no same visual_type twice in a row — convert duplicate to stock
    // Exception: stock can repeat (it's the default fallback type)
    if (clip.visual_type !== "stock" && clip.visual_type === lastType) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }
    lastType = clip.visual_type;

    let q = (clip.search_query || "").toLowerCase();
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });

    const hasBanned = bannedVisuals.some(b => q.includes(b));
    if (hasBanned) {
      const niche = nicheInfo?.niche || "general";
      const fallbacks = nicheSafeQueries[niche] || nicheSafeQueries.general;
      q = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    if (q.length < 3) {
      const niche = nicheInfo?.niche || "general";
      const fallbacks = nicheSafeQueries[niche] || nicheSafeQueries.general;
      q = fallbacks[usedQueries.size % fallbacks.length];
    }

    // Clean search_queries array
    if (clip.search_queries && Array.isArray(clip.search_queries)) {
      clip.search_queries = clip.search_queries.map(sq => {
        let cleaned = (sq || "").toLowerCase();
        banned.forEach(b => { cleaned = cleaned.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
        const hasBannedInSq = bannedVisuals.some(b => cleaned.includes(b));
        if (hasBannedInSq) {
          const niche = nicheInfo?.niche || "general";
          const fallbacks = nicheSafeQueries[niche] || nicheSafeQueries.general;
          cleaned = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
        return cleaned.length >= 3 ? cleaned : null;
      }).filter(Boolean);
      if (clip.search_queries.length === 0) clip.search_queries = null;
    }

    // Variety — avoid repeating same search keywords
    if (clip.visual_type === "stock" || clip.visual_type === "ai_image" || clip.visual_type === "web_image") {
      const primaryWord = q.split(/\s+/).find(w => w.length > 3) || q.split(/\s+/)[0];
      const keyCount = usedQueries.get(primaryWord) || 0;
      if (keyCount >= 2) {
        const niche = nicheInfo?.niche || "general";
        const fallbacks = nicheSafeQueries[niche] || nicheSafeQueries.general;
        q = fallbacks[usedQueries.size % fallbacks.length];
      }
      for (const word of q.split(/\s+/)) {
        if (word.length > 3) usedQueries.set(word, (usedQueries.get(word) || 0) + 1);
      }
    }

    clip.search_query = q;

    if (clip.start_time === undefined || clip.start_time === null) clip.start_time = startTime;
    if (!clip.end_time) clip.end_time = clip.start_time + 4;
    clip.start_time = Math.max(clip.start_time, startTime);
    clip.end_time = Math.min(clip.end_time, endTime);

    // Apply minimum durations
    const minDur = minDurations[clip.visual_type] ?? 1.5;
    if (clip.end_time - clip.start_time < minDur) clip.end_time = clip.start_time + minDur;

    if (graphicTypes.includes(clip.visual_type)) { clip.imagePath = null; clip.isCutout = false; }

    if (clip.visual_type === "number_reveal" && clip.number_data) {
      const numStyles = ["counter","gauge","bars","spotlight","ticker","impact"];
      if (!clip.number_data.style || !numStyles.includes(clip.number_data.style)) clip.number_data.style = "counter";
      if (clip.number_data.style === lastNumberStyle) {
        const alts = numStyles.filter(s => s !== lastNumberStyle);
        clip.number_data.style = alts[Math.floor(Math.random() * alts.length)];
      }
      lastNumberStyle = clip.number_data.style;
    }

    if (clip.visual_type === "stock" || clip.visual_type === "ai_image" || clip.visual_type === "web_image" || clip.visual_type === "web_screenshot") {
      if (clip.display_style === lastStyle) {
        const alts = validStyles.filter(v => v !== lastStyle && v !== "fullscreen" && v !== "fullscreen_zoom");
        clip.display_style = alts[Math.floor(Math.random() * alts.length)] || "framed";
      }
      lastStyle = clip.display_style;
    }

    if (!clip.transition_speed) clip.transition_speed = "fast";
  });

  return clips;
}
