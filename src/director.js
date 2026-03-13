import axios from "axios";
import chalk from "chalk";

/**
 * Director v32 — Creative Director Mode
 *
 * Claude reads the script like a human editor, understands emotional arc,
 * and makes intentional moment-by-moment decisions. No more template filling.
 * Every visual matches what the narrator is SAYING right now.
 */
export async function createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode = "visual", topic = "") {
  const CHUNK_SECONDS = 120;
  let allClips;

  if (totalDuration <= 180) {
    allClips = await processChunk(scriptText, wordTimestamps, 0, totalDuration, 0, 1, contentMode, topic);
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
      const chunkClips = await processChunk(scriptText, chunk.words, chunk.startTime, chunk.endTime, i, chunks.length, contentMode, topic);
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

  // Inject engagement elements
  allClips = injectInterruptCards(allClips, scriptText, totalDuration);
  allClips = injectQuotePulls(allClips, scriptText);
  if (detectListVideo(scriptText)) allClips = injectCountdownHooks(allClips);

  // Sort and fix overlaps
  allClips.sort((a, b) => a.start_time - b.start_time);
  for (let i = 1; i < allClips.length; i++) {
    if (allClips[i].start_time < allClips[i - 1].end_time) {
      allClips[i].start_time = allClips[i - 1].end_time;
      if (allClips[i].end_time <= allClips[i].start_time) allClips[i].end_time = allClips[i].start_time + 2;
    }
  }

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
  return /\b(top \d+|number \d+|\d+ reasons|\d+ ways|\d+ things|number one|number two|number three)\b/i.test(scriptText);
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
  return { niche: "general", imageStyle: "professional modern, clean aspirational, person thinking, city skyline, team collaboration" };
}

async function processChunk(scriptText, chunkWords, startTime, endTime, chunkIndex, totalChunks, contentMode, topic) {
  const wordRef = chunkWords.map((w) => {
    const idx = w.originalIndex !== undefined ? w.originalIndex : chunkWords.indexOf(w);
    return `[${idx}] "${w.word}" ${w.start.toFixed(2)}s`;
  }).join("\n");

  const duration = endTime - startTime;
  const isFirstChunk = chunkIndex === 0;
  const isLastChunk = chunkIndex === totalChunks - 1;
  const nicheInfo = detectNiche(topic, scriptText);
  const isHorror = nicheInfo.niche === "horror" || nicheInfo.niche === "true_crime";

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
SEGMENT: ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s (${duration.toFixed(0)}s total)

YOUR JOB: Read what the narrator is saying at each moment. Choose visuals that REINFORCE that exact moment emotionally — not just the general topic.

CRITICAL:
1. Images must match what's being SAID right now, not just the topic
   WRONG: narrator says "most people fail" → generic business photo
   RIGHT: narrator says "most people fail" → frustrated person at desk, someone looking defeated, empty wallet
2. ${isHorror ? "Horror/dark imagery is appropriate for this niche." : "NEVER use horror, dark, scary, violent imagery. No knives, masks, weapons, monsters, blood, ghostface, horror scenes. This is a " + nicheInfo.niche + " video — use: " + nicheInfo.imageStyle}
3. search_query describes the EMOTION and SPECIFIC MOMENT, not just the topic
4. Vary pacing: shocking moment = 5-7s, transition = 2-3s, infographic = 5-6s minimum
5. No subtitles — visuals stand alone

WORD TIMESTAMPS:
${wordRef}

SCRIPT:
${scriptText.slice(0, 4000)}

VISUAL TYPES:

INFOGRAPHICS (only when specific numbers/data mentioned):
"number_reveal": number_data: {value: NUMBER, prefix: "$", suffix: "%", label: "label", style: "counter|gauge|bars|spotlight|ticker|impact"}
"line_chart": chart_data: {title, points:[{label,value}], suffix, color}
"donut_chart": chart_data: {title, centerLabel, segments:[{label,value,color}]}
"progress_bar": chart_data: {title, bars:[{label,value,suffix,color}]}
"timeline": chart_data: {title, events:[{year,label}]}
"leaderboard": chart_data: {title, items:[{label,value,suffix}]}
"stat_card": chart_data: {title, stats:[{value,label,prefix,change,changeColor}]}
"checklist": chart_data: {title, items:[...], checked:true}
"horizontal_bar": chart_data: {title, items:[{label,value,color}], suffix}
"comparison": comparison_data: {items:[{label,value,display,color}]}
"section_break": section_data: {number:"#1", title:"TITLE", hook_line:"Most provocative sentence from NEXT section to tease viewers"}
"text_flash": text_flash_text: "2-4 WORDS" — MUST be words narrator is actually saying right now
"quote_card": chart_data: {quote:"text", attribution:"source", style:"bold"}

IMAGES:
"stock": search_query describes specific emotion/moment. display_style: fullscreen|framed|fullscreen_zoom|split_left|split_right. search_queries:["q1","q2","q3"] for clips 6+s. transition_speed:"fast"|"slow"
"ai_image": ai_prompt: 20-40 words ultra-specific cinematic matching exact moment
"web_image": ONLY for specific named real people/brands/landmarks

${isFirstChunk ? `HOOK — first 5 seconds:
Clip 1 (0-1.5s): number_reveal — first shocking stat, style "impact"  
Clip 2 (1.5-3s): stock — emotional reality of that stat (struggling person, dramatic scene)
Clip 3 (3-4.5s): text_flash — 2-3 words narrator is actually saying, creates tension
Clip 4 (4.5-6s): comparison or horizontal_bar — dramatic contrast
Fast. Emotional. Make people feel something.` : ""}
${isLastChunk ? "CLOSE: checklist (action items) or quote_card (inspiring thought)." : ""}

RULES:
- Never same type twice in a row
- Infographics: 5-6s minimum
- Cover ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s, no gaps
- BANNED terms in search_query: baby,infant,child,toddler,kid,subscribe,button,logo${isHorror ? "" : ",knife,weapon,mask,ghost,monster,blood,horror,scary,creepy,ghostface,scream,killer"}

Return ONLY valid JSON array, no markdown:
[{"start_time":${startTime.toFixed(1)},"end_time":0,"visual_type":"","display_style":"split_left","search_query":"","search_queries":null,"ai_prompt":"","subtitle_words":[],"number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null,"chart_data":null,"transition_speed":"fast","interrupt_data":null,"quote_data":null,"countdown_data":null}]`
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
  const validTypes = ["stock","number_reveal","comparison","section_break","text_flash","ai_image","web_image","web_screenshot","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card","checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison","icon_grid","flow_diagram","interrupt_card","quote_pull","countdown_corner"];
  const graphicTypes = ["number_reveal","section_break","comparison","text_flash","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card","checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison","icon_grid","flow_diagram","interrupt_card","quote_pull","countdown_corner"];
  const infraMinDuration = ["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","checklist","horizontal_bar","vertical_bar","scale_comparison","growth_curve","ranking_cards","split_comparison"];

  const nicheSafeQueries = {
    business: ["entrepreneur success laptop", "professional workspace modern", "business confidence achievement", "freelancer productive", "startup team collaboration"],
    finance: ["financial growth chart", "confident investor professional", "business district modern", "wealth success lifestyle", "stock market professional"],
    health: ["gym fitness workout", "healthy lifestyle nutrition", "active sports performance", "wellness outdoor exercise", "fit person training"],
    travel: ["scenic destination landscape", "travel adventure culture", "beautiful nature photography", "landmark tourism", "travel exploration"],
    horror: ["dark atmospheric night", "mysterious shadowy scene", "abandoned building eerie", "foggy forest dark", "suspenseful shadow"],
    true_crime: ["detective investigation office", "evidence forensic analysis", "courtroom justice", "newspaper crime headline", "investigation board"],
    history: ["ancient ruins architecture", "historical artifact museum", "medieval castle", "period scene historical", "civilization ancient"],
    general: ["professional modern office", "person thoughtful planning", "city skyline panoramic", "nature peaceful landscape", "team working together"],
  };

  let lastStyle = "";
  let lastNumberStyle = "";
  const usedQueries = new Map();

  clips.forEach((clip) => {
    clip.subtitle_words = [];

    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";
    if (!clip.search_query) clip.search_query = "professional scene";

    let q = (clip.search_query || "").toLowerCase();
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });

    // Replace any banned visual terms
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

    // Variety
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

    // Minimum durations
    const minDur = infraMinDuration.includes(clip.visual_type) ? 5 :
                   clip.visual_type === "section_break" ? 2 :
                   clip.visual_type === "quote_pull" ? 4.5 :
                   clip.visual_type === "interrupt_card" ? 5 :
                   clip.visual_type === "countdown_corner" ? 4 : 1.5;

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
        const alts = validStyles.filter(v => v !== lastStyle);
        clip.display_style = alts[Math.floor(Math.random() * alts.length)];
      }
      lastStyle = clip.display_style;
    }

    if (!clip.transition_speed) clip.transition_speed = "fast";
  });

  // Post-process: limit same visual_type to max 2 in a row, max 3 total per type
  const typeCounts = {};
  let lastType = '';
  let lastTypeRun = 0;
  const imageTypes = ['stock', 'ai_image', 'web_image'];
  const infraTypes = ['stat_card', 'number_reveal', 'horizontal_bar', 'progress_bar', 'leaderboard', 'donut_chart', 'line_chart', 'checklist', 'comparison', 'timeline', 'ranking_cards'];

  clips.forEach((clip, i) => {
    const t = clip.visual_type;
    typeCounts[t] = (typeCounts[t] || 0) + 1;

    // Same type in a row
    if (t === lastType) {
      lastTypeRun++;
    } else {
      lastTypeRun = 1;
      lastType = t;
    }

    // Max 2 same infographic in a row — swap to stock
    if (lastTypeRun > 2 && infraTypes.includes(t)) {
      clip.visual_type = 'stock';
      clip.display_style = 'framed';
      const niche = nicheInfo?.niche || 'general';
      const fallbacks = nicheSafeQueries[niche] || nicheSafeQueries.general;
      clip.search_query = fallbacks[i % fallbacks.length];
      lastType = 'stock';
      lastTypeRun = 1;
      typeCounts[t]--;
    }

    // Max 4 total of same infographic type per video
    if (typeCounts[t] > 4 && infraTypes.includes(t)) {
      clip.visual_type = 'stock';
      clip.display_style = 'framed';
      const niche = nicheInfo?.niche || 'general';
      const fallbacks = nicheSafeQueries[niche] || nicheSafeQueries.general;
      clip.search_query = fallbacks[i % fallbacks.length];
      typeCounts[t]--;
    }
  });

  return clips;
}
