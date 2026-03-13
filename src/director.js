import axios from "axios";
import chalk from "chalk";

/**
 * Director v32: Full visual overhaul.
 * - Subtitles REMOVED completely
 * - Interrupt cards injected every ~90s ("Did you know?")
 * - Quote pulls injected per section (one powerful sentence)
 * - Countdown hooks for list videos only (is_list_video detection)
 * - Hook lines on section breaks (provocative teaser for next section)
 * - Multi-image b-roll: search_queries array (2-3 per scene)
 * - Niche-aware search queries (no dark/horror terms for non-horror niches)
 * - transition_speed set per niche (fast/slow)
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

      if (chunkWords.length > 0) {
        chunks.push({ words: chunkWords, startTime: chunkStart, endTime: chunkEnd });
      }
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

  // HOOK PROTECTION: First 5 seconds must be stock/ai_image, never infographic
  const infraTypes = ["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card"];
  allClips.forEach(clip => {
    if (clip.start_time < 5 && infraTypes.includes(clip.visual_type)) {
      clip.visual_type = "stock";
      clip.search_query = clip.search_query || "cinematic dramatic opening shot";
      clip.display_style = "fullscreen";
    }
  });

  // VISUAL MODE: Cap infographics at 10% of total clips
  if (contentMode === "visual") {
    let infraCount = 0;
    const maxInfra = Math.max(2, Math.floor(allClips.length * 0.1));
    allClips.forEach(clip => {
      if (infraTypes.includes(clip.visual_type)) {
        infraCount++;
        if (infraCount > maxInfra) {
          clip.visual_type = "stock";
          clip.search_query = clip.search_query || "cinematic landscape";
          clip.display_style = "framed";
        }
      }
    });
  }

  // Enforce text flash limit globally — max 4
  let textFlashCount = 0;
  allClips.forEach(clip => {
    if (clip.visual_type === "text_flash") {
      textFlashCount++;
      if (textFlashCount > 4) {
        clip.visual_type = "stock";
        clip.search_query = clip.text_flash_text ? clip.text_flash_text.split(" ").slice(0, 3).join(" ") + " concept" : "cinematic landscape";
        clip.display_style = "framed";
      }
    }
  });

  // INJECT INTERRUPT CARDS every ~90 seconds
  // Pull a surprising fact/stat from the script at that timestamp
  allClips = injectInterruptCards(allClips, scriptText, totalDuration);

  // INJECT QUOTE PULLS — one per major section break
  allClips = injectQuotePulls(allClips, scriptText);

  // DETECT LIST VIDEO — inject countdown corner if it's a ranking/list video
  const isListVideo = detectListVideo(scriptText);
  if (isListVideo) {
    allClips = injectCountdownHooks(allClips, scriptText);
  }

  // Eliminate time overlaps
  for (let i = 1; i < allClips.length; i++) {
    if (allClips[i].start_time < allClips[i - 1].end_time) {
      allClips[i].start_time = allClips[i - 1].end_time;
      if (allClips[i].end_time <= allClips[i].start_time) {
        allClips[i].end_time = allClips[i].start_time + 2;
      }
    }
  }

  // Sort by start time after injections
  allClips.sort((a, b) => a.start_time - b.start_time);

  console.log(chalk.gray(`  Storyboard complete: ${allClips.length} clips total`));

  return allClips;
}

// ─── INTERRUPT CARD INJECTION ────────────────────────────────────────────────
function injectInterruptCards(clips, scriptText, totalDuration) {
  const INTERVAL = 90; // every 90 seconds
  const CARD_DURATION = 5;

  // Extract facts/stats from script for interrupt cards
  const facts = extractFacts(scriptText);
  if (facts.length === 0) return clips;

  const injected = [...clips];
  let factIndex = 0;

  for (let t = INTERVAL; t < totalDuration - 10; t += INTERVAL) {
    if (factIndex >= facts.length) break;

    // Find a clip that's playing at time t and is an image type (not a section break)
    const hostClipIdx = injected.findIndex(c =>
      c.start_time <= t && c.end_time > t + CARD_DURATION &&
      (c.visual_type === "stock" || c.visual_type === "ai_image" || c.visual_type === "web_image")
    );

    if (hostClipIdx === -1) {
      factIndex++;
      continue;
    }

    // Inject interrupt card as an overlay clip at this time
    // It overlays on top of the existing clip — same time window, higher z-order via type
    const card = {
      start_time: t,
      end_time: t + CARD_DURATION,
      visual_type: "interrupt_card",
      display_style: "fullscreen",
      search_query: "",
      subtitle_words: [],
      interrupt_data: {
        fact: facts[factIndex],
        label: "Did you know?",
      },
    };

    injected.push(card);
    factIndex++;
  }

  return injected;
}

function extractFacts(scriptText) {
  // Pull sentences that contain numbers/stats — these make the best interrupt card facts
  const sentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 120);
  const withNumbers = sentences.filter(s => /\d+|percent|million|billion|thousand|hundred/.test(s));
  // Fallback to any interesting sentence if not enough numbers
  const all = withNumbers.length >= 3 ? withNumbers : sentences;
  // Return up to 5 facts, picking spread across the script
  const step = Math.floor(all.length / 5) || 1;
  const facts = [];
  for (let i = 0; i < all.length && facts.length < 5; i += step) {
    facts.push(all[i]);
  }
  return facts;
}

// ─── QUOTE PULL INJECTION ─────────────────────────────────────────────────────
function injectQuotePulls(clips, scriptText) {
  // Find section breaks and inject a quote pull after each one
  const sectionBreaks = clips.filter(c => c.visual_type === "section_break");
  if (sectionBreaks.length === 0) return clips;

  const injected = [...clips];

  // Extract powerful sentences from the script
  const powerSentences = extractPowerSentences(scriptText);
  if (powerSentences.length === 0) return clips;

  sectionBreaks.forEach((breakClip, idx) => {
    if (idx >= powerSentences.length) return;

    // Find the clip right after this section break
    const afterBreakIdx = injected.findIndex(c => c.start_time >= breakClip.end_time &&
      (c.visual_type === "stock" || c.visual_type === "ai_image"));
    if (afterBreakIdx === -1) return;

    const afterClip = injected[afterBreakIdx];
    const quoteDuration = 4.5;

    // Only inject if there's room (clip is at least 5s long)
    if (afterClip.end_time - afterClip.start_time < 5) return;

    const quote = {
      start_time: afterClip.start_time,
      end_time: afterClip.start_time + quoteDuration,
      visual_type: "quote_pull",
      display_style: "fullscreen",
      search_query: "",
      subtitle_words: [],
      quote_data: {
        quote: powerSentences[idx],
        attribution: "",
      },
    };

    // Push the host clip forward
    afterClip.start_time += quoteDuration;

    injected.push(quote);
  });

  return injected;
}

function extractPowerSentences(scriptText) {
  const sentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 30 && s.length < 150);
  // Prefer sentences with dramatic/punchy language
  const dramatic = sentences.filter(s =>
    /never|always|most|every|secret|truth|real|actually|nobody|everybody|worst|best|only|first|last/i.test(s)
  );
  const pool = dramatic.length >= 2 ? dramatic : sentences;
  // Pick one per ~3 sections spread across the script
  const step = Math.floor(pool.length / 5) || 1;
  const picks = [];
  for (let i = 0; i < pool.length && picks.length < 5; i += step) {
    picks.push(pool[i]);
  }
  return picks;
}

// ─── COUNTDOWN HOOK INJECTION ────────────────────────────────────────────────
function detectListVideo(scriptText) {
  return /\b(top \d+|number \d+|reason \d+|\d+ reasons|\d+ ways|\d+ things|\d+ tips|number one|number two|number three|ranked|ranking|list)\b/i.test(scriptText);
}

function injectCountdownHooks(clips, scriptText) {
  // Find section breaks to determine list count
  const sectionBreaks = clips.filter(c => c.visual_type === "section_break");
  const total = sectionBreaks.length;
  if (total < 2) return clips;

  const injected = [...clips];

  sectionBreaks.forEach((breakClip, idx) => {
    const remaining = total - idx;
    // Attach countdown data to the section break itself
    breakClip.countdown_data = {
      current: idx + 1,
      total,
    };
    // Also add a small overlay clip right after the section break
    const countdownClip = {
      start_time: breakClip.end_time,
      end_time: breakClip.end_time + 4, // show for 4 seconds after break
      visual_type: "countdown_corner",
      display_style: "fullscreen",
      search_query: "",
      subtitle_words: [],
      countdown_data: {
        current: idx + 1,
        total,
      },
    };
    injected.push(countdownClip);
  });

  return injected;
}

// ─── MAIN CHUNK PROCESSOR ────────────────────────────────────────────────────
async function processChunk(scriptText, chunkWords, startTime, endTime, chunkIndex, totalChunks, contentMode = "visual", topic = "") {
  const wordRef = chunkWords.map((w) => {
    const idx = w.originalIndex !== undefined ? w.originalIndex : chunkWords.indexOf(w);
    return `[${idx}] "${w.word}" ${w.start.toFixed(2)}s`;
  }).join("\n");

  const duration = endTime - startTime;
  const textFlashAllowance = chunkIndex === 0 ? 2 : 1;
  const isFirstChunk = chunkIndex === 0;
  const isLastChunk = chunkIndex === totalChunks - 1;

  // Detect niche for safe search query guidance
  const nicheContext = buildNicheContext(topic, scriptText);

  const topicContext = topic
    ? `\nVIDEO TOPIC: "${topic}"\nEVERY image search_query MUST be contextually tied to this topic. Never use dark, scary, or horror imagery unless this IS a horror video. If the topic is side hustle/finance/business — use professional, aspirational, success imagery. If travel — use beautiful destinations. Match the EMOTIONAL TONE of the niche.\n${nicheContext}`
    : "";

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `You are the creative director of a professional YouTube video production studio.

CONTENT MODE: ${contentMode.toUpperCase()}
${contentMode === "visual" ? "THIS IS A VISUAL VIDEO. Use 85-95% real photos and images. Infographics MAX 10% — ONLY when a specific hard number or statistic is mentioned. NEVER use infographics in the first 5 seconds." : "THIS IS A DATA-DRIVEN VIDEO. Use 40-60% infographics when numbers and data are mentioned. Use real photos for scene-setting and transitions. Avoid infographics in the first 3 seconds."}
${topicContext}

Create a visually compelling storyboard for this ${duration.toFixed(0)}s segment (${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s).

WORD TIMING:
${wordRef}

FULL SCRIPT (for context):
${scriptText.slice(0, 3000)}

IMPORTANT — NO SUBTITLES: This video has NO word-by-word subtitles. Do NOT include subtitle_words. Every visual must stand completely on its own — images must be compelling enough to watch without any text captions. Choose visuals that SHOW what the narrator is saying, not just illustrate generic concepts.

B-ROLL MULTI-IMAGE: For stock/ai_image/web_image clips, you can provide search_queries (array of 2-3 queries) instead of a single search_query. These will cross-fade every 3 seconds, creating dynamic b-roll variety. Use this for longer clips (6+ seconds).
Example: "search_queries": ["side hustle laptop work", "freelancer coffee shop", "online business growth"]

SECTION BREAKS — HOOK LINES: Every section_break MUST include a hook_line — the most provocative, surprising sentence from the NEXT section. This teases what's coming and keeps viewers watching.
section_data: {number: "#1", title: "CHAPTER TITLE", hook_line: "The thing nobody tells you about this will change everything."}

TRANSITION SPEED: Set transition_speed on image clips based on niche:
- "fast" for finance, business, side hustle, top 10 lists, motivation
- "slow" for horror, true crime, documentary, history, mystery, travel

═══ YOUR VISUAL TOOLKIT ═══

INFOGRAPHIC TYPES (use when content has actual data):

1. "number_reveal" — Animated counter for ANY number mentioned.
   number_data: {value: NUMBER, prefix: "$", suffix: "%", label: "short label", style: "counter|gauge|bars|spotlight|ticker|impact"}

2. "line_chart" — Animated line chart for trends over time.
   chart_data: {title: "Title", points: [{label: "2020", value: 100}, ...], suffix: "%", color: "#4a9eff"}

3. "donut_chart" — Pie/donut chart for proportions.
   chart_data: {title: "Title", centerLabel: "100%", segments: [{label: "A", value: 60, color: "#4a9eff"}, ...]}

4. "progress_bar" — Multiple horizontal bars with values.
   chart_data: {title: "Title", bars: [{label: "A", value: 85, suffix: "%", color: "#4a9eff"}, ...]}

5. "timeline" — Events on a horizontal timeline.
   chart_data: {title: "Title", events: [{year: "2020", label: "Event"}, ...]}

6. "leaderboard" — Ranked list with bars.
   chart_data: {title: "Title", items: [{label: "A", value: 3.1, suffix: "%"}, ...]}

7. "process_flow" — Step-by-step circles with arrows.
   chart_data: {title: "Title", steps: [{label: "Step", icon: "🔑"}, ...]}

8. "stat_card" — Bold KPI numbers (1-3 stats).
   chart_data: {title: "Title", stats: [{value: "4.2T", label: "Label", prefix: "$", change: "+12%", changeColor: "#22c55e"}]}

9. "quote_card" — Styled quote with attribution.
   chart_data: {quote: "Text", attribution: "Person", style: "elegant|bold|minimal"}

10. "checklist" — Items checking off one by one.
    chart_data: {title: "Title", items: ["Item 1", "Item 2", ...], checked: true}

11. "horizontal_bar" — Side-by-side comparison bars.
    chart_data: {title: "Title", items: [{label: "USA", value: 25000, color: "#4488ff"}, ...], suffix: "B"}

12. "vertical_bar" — Bars rising from bottom.
    chart_data: {title: "Title", items: [{label: "Netflix", value: 230, color: "#ff4466"}, ...], suffix: "M"}

13. "scale_comparison" — Proportional circles or bars.
    chart_data: {title: "Title", items: [{label: "Jupiter", value: 139820}, ...], suffix: " km", mode: "circles|bars"}

14. "map_highlight" — World map with highlighted pins.
    chart_data: {title: "Title", highlights: [{region: "USA", value: "330M", label: "Population", x: 22, y: 35}, ...]}

15. "body_diagram" — Human body outline with labeled zones.
    chart_data: {title: "Title", zones: [{label: "Heart Rate", value: "72", suffix: " bpm", position: "chest"}, ...]}

16. "funnel_chart" — Narrowing funnel with stages.
    chart_data: {title: "Title", stages: [{label: "Stage 1", value: 100, suffix: "%"}, ...]}

17. "growth_curve" — Exponential growth animation.
    chart_data: {title: "Title", start_value: 1000, end_value: 100000, prefix: "$", years: 30, color: "#44dd88"}

18. "ranking_cards" — Grid of ranked cards.
    chart_data: {title: "Title", items: [{label: "Elon Musk", value: 250, subtitle: "Tesla"}, ...], prefix: "$", suffix: "B"}

19. "split_comparison" — Side-by-side VS comparison.
    chart_data: {title: "Title", left: {name: "Stocks", color: "#4488ff"}, right: {name: "Bonds", color: "#ff6644"}, stats: [{label: "Return", left_value: "10%", right_value: "4%"}, ...]}

20. "icon_grid" — Grid of icons with labels.
    chart_data: {title: "Title", items: [{label: "Rental Income", icon: "🏠", value: "$2K/mo"}, ...]}

21. "flow_diagram" — Branching flow with decision points.
    chart_data: {title: "Title", nodes: [{label: "Start", step: "Step 1"}, ...]}

22. "comparison" — Simple 2-item bar comparison.
    comparison_data: {items: [{label: "A", value: 80, display: "80%", color: "#4a9eff"}, {label: "B", value: 30, display: "30%", color: "#f97316"}]}

23. "section_break" — Chapter title card. ALWAYS include hook_line.
    section_data: {number: "#1", title: "CHAPTER TITLE", hook_line: "The most surprising thing about this changed my mind completely."}

24. "text_flash" — Big bold impact words (2-5 words). Max ${textFlashAllowance} in this chunk.
    text_flash_text: "THE REAL TRUTH"

IMAGE TYPES:

25. "stock" — Real photo from Pexels/Brave.
    display_style: fullscreen, framed, fullscreen_zoom, split_left, split_right
    search_query: 3-5 specific topic-aware words
    search_queries: ["query 1", "query 2", "query 3"] — use for b-roll variety on longer clips
    transition_speed: "fast" | "slow"
    ⚠️ NEVER use generic dark/scary/horror queries for non-horror niches
    ✅ Match the emotional tone of the niche: aspirational for business, beautiful for travel, dramatic for crime

26. "ai_image" — AI-generated image.
    ai_prompt: 15-30 ultra-specific cinematic words
    display_style: same as stock
    transition_speed: "fast" | "slow"

27. "web_image" — Real photo for SPECIFIC real people, places, brands.
    search_query: "Person Name context" or "Brand Name product"
    display_style: same as stock
    USE WHEN: narrator mentions a specific real person, brand, landmark by name

NICHE-AWARE SEARCH QUERY RULES:
- Finance/business/side hustle → professional workspace, laptop entrepreneur, success money, city business district, confident professional
- Travel → beautiful destination photography, landmark tourism, scenic landscape
- Health/fitness → gym workout, healthy food, active lifestyle, sports performance  
- Horror/true crime → ONLY for these niches: dark atmospheric, crime scene investigation, mystery thriller
- History → historical reenactment, museum artifact, ancient ruins, period architecture
- Entertainment/celebrity → stage performance, entertainment industry, media event
- NEVER use horror/dark imagery for non-horror niches even if words like "danger" or "risk" appear

${isFirstChunk ? `CRITICAL — FIRST 5 SECONDS HOOK:
REQUIRED first 4 clips (each 1-1.5 seconds):
  Clip 1: number_reveal with the FIRST big number from the script. Style "impact" or "counter".
  Clip 2: stock or ai_image — visceral, emotional image that matches the topic and niche.
  Clip 3: text_flash with 2-3 PUNCHY words creating tension.
  Clip 4: comparison or horizontal_bar showing a dramatic contrast.
Fast cuts, big numbers, dramatic imagery. Feels like a trailer.` : ""}
${isLastChunk ? "LAST CHUNK: End with a checklist (action items) or quote_card (inspiring close)." : ""}

VARIETY RULES:
- NEVER use the same infographic type twice in a row
- NEVER use the same search_query twice
- NEVER use the same display_style twice in a row for stock clips
- Mix infographic types: number_reveal → line_chart → stat_card → progress_bar

TECHNICAL RULES:
- NO subtitle_words needed — set as empty array []
- Switch visuals every 3-5 seconds
- Cover ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s with NO gaps
- number_data.value MUST be a raw number
- chart_data values MUST be raw numbers
- Infographic clips do NOT need search_query

BANNED search terms: baby, infant, child, toddler, kid, children, subscribe, button, icon, logo

Return ONLY a JSON array, no markdown, no backticks:
[{"start_time":${startTime.toFixed(1)},"end_time":0,"visual_type":"","display_style":"","search_query":"","search_queries":null,"ai_prompt":"","subtitle_words":[],"number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null,"chart_data":null,"transition_speed":"fast","interrupt_data":null,"quote_data":null,"countdown_data":null}]`,
        },
      ],
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
  clips = validateClips(clips, startTime, endTime);
  return clips;
}

// ─── NICHE CONTEXT BUILDER ────────────────────────────────────────────────────
function buildNicheContext(topic, scriptText) {
  const text = (topic + " " + scriptText.slice(0, 500)).toLowerCase();

  if (/horror|scary|creepy|haunted|ghost|demon|paranormal|murder|serial killer|nightmare|terror/.test(text)) {
    return "NICHE: Horror/True Crime — dark atmospheric imagery is appropriate.\n";
  }
  if (/side hustle|passive income|make money|freelance|entrepreneur|ecommerce|dropship|affiliate/.test(text)) {
    return "NICHE: Business/Side Hustle — use aspirational imagery: laptops, entrepreneurs, success, money, professional workspaces. Keep it positive and motivating.\n";
  }
  if (/invest|stock|dividend|portfolio|finance|wealth|market|trading/.test(text)) {
    return "NICHE: Finance/Investing — use professional imagery: charts, business districts, confident professionals, luxury lifestyle aspirational.\n";
  }
  if (/travel|destination|country|tourism|adventure|vacation|beach|island/.test(text)) {
    return "NICHE: Travel — use beautiful destination photography, scenic landscapes, cultural experiences.\n";
  }
  if (/health|fitness|gym|workout|diet|nutrition|body|exercise/.test(text)) {
    return "NICHE: Health/Fitness — use active lifestyle imagery: gym, healthy food, sports, outdoor activities.\n";
  }
  if (/history|ancient|medieval|empire|war|civilization/.test(text)) {
    return "NICHE: History — use historical imagery: ruins, artifacts, period architecture, museum pieces.\n";
  }
  if (/celebrity|actor|singer|rapper|entertainment|movie|film/.test(text)) {
    return "NICHE: Entertainment — use entertainment industry imagery: performances, media events, popular culture.\n";
  }
  return "NICHE: General — use professional, clean, aspirational imagery. Avoid dark or scary visuals.\n";
}

// ─── JSON PARSER ─────────────────────────────────────────────────────────────
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

// ─── CLIP VALIDATOR ───────────────────────────────────────────────────────────
function validateClips(clips, startTime, endTime) {
  if (!Array.isArray(clips) || !clips.length) throw new Error("Empty storyboard");

  const banned = ["baby","infant","child","toddler","kid","kids","children","subscribe","button","icon","logo"];
  const validStyles = ["fullscreen","framed","fullscreen_zoom","split_left","split_right"];
  const validTypes = [
    "stock","number_reveal","comparison","section_break","text_flash","ai_image","web_image","web_screenshot",
    "line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card","checklist",
    "horizontal_bar","vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart","growth_curve",
    "ranking_cards","split_comparison","icon_grid","flow_diagram",
    // v32 engagement types
    "interrupt_card","quote_pull","countdown_corner",
  ];
  const graphicTypes = [
    "number_reveal","section_break","comparison","text_flash","line_chart","donut_chart","progress_bar","timeline",
    "leaderboard","process_flow","stat_card","quote_card","checklist","horizontal_bar","vertical_bar","scale_comparison",
    "map_highlight","body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison","icon_grid","flow_diagram",
    "interrupt_card","quote_pull","countdown_corner",
  ];

  let lastStyle = "";
  let lastNumberStyle = "";
  const usedQueries = new Map();

  clips.forEach((clip) => {
    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";
    if (!clip.search_query) clip.search_query = "cinematic landscape";

    // Always clear subtitle_words — no subtitles in v32
    clip.subtitle_words = [];

    let q = clip.search_query;
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
    if (q.length < 3) q = "cinematic landscape";

    // Also clean search_queries array if present
    if (clip.search_queries && Array.isArray(clip.search_queries)) {
      clip.search_queries = clip.search_queries
        .map(sq => {
          let cleaned = sq;
          banned.forEach(b => { cleaned = cleaned.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
          return cleaned.length >= 3 ? cleaned : null;
        })
        .filter(Boolean);
      if (clip.search_queries.length === 0) clip.search_queries = null;
    }

    // Smart image variety — limit any primary keyword to max 2 uses
    if (clip.visual_type === "stock" || clip.visual_type === "ai_image" || clip.visual_type === "web_image") {
      const qLower = q.toLowerCase();
      const primaryWord = qLower.split(/\s+/).find(w => w.length > 3) || qLower.split(/\s+/)[0];
      const keyCount = usedQueries.get(primaryWord) || 0;

      if (keyCount >= 2) {
        const alternatives = ["professional workspace", "nature landscape", "city skyline", "technology concept", "hands working", "modern office", "calm ocean", "mountain sunrise", "walking outdoors", "entrepreneur laptop"];
        q = alternatives[usedQueries.size % alternatives.length];
      }

      for (const word of qLower.split(/\s+/)) {
        if (word.length > 3) {
          usedQueries.set(word, (usedQueries.get(word) || 0) + 1);
        }
      }
    }

    clip.search_query = q;

    if (clip.visual_type === "web_screenshot" && !clip.screenshot_query) {
      clip.screenshot_query = clip.search_query;
    }

    if (clip.start_time === undefined || clip.start_time === null) clip.start_time = startTime;
    if (!clip.end_time) clip.end_time = clip.start_time + 3;

    clip.start_time = Math.max(clip.start_time, startTime);
    clip.end_time = Math.min(clip.end_time, endTime);

    if (clip.end_time - clip.start_time < 1) {
      clip.end_time = clip.start_time + 2;
    }
    // Infographics need minimum 5s to complete their animations
    const infraMin = ["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","checklist","horizontal_bar","vertical_bar","scale_comparison","growth_curve","ranking_cards","split_comparison"];
    if (infraMin.includes(clip.visual_type) && clip.end_time - clip.start_time < 5) {
      clip.end_time = clip.start_time + 5;
    }

    if (graphicTypes.includes(clip.visual_type)) {
      clip.imagePath = null;
      clip.isCutout = false;
    }

    if (clip.visual_type === "number_reveal" && clip.number_data) {
      const numStyles = ["counter", "gauge", "bars", "spotlight", "ticker", "impact"];
      if (!clip.number_data.style || !numStyles.includes(clip.number_data.style)) {
        clip.number_data.style = "counter";
      }
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

    // Default transition speed if not set
    if (!clip.transition_speed) clip.transition_speed = "fast";
  });

  return clips;
}
