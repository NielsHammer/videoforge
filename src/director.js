import axios from "axios";
import chalk from "chalk";

/**
 * Director v23: Rewritten prompt for visual storytelling.
 * - Claude now plans the FULL visual arc, not clip-by-clip
 * - Variety enforcement: never repeat search queries
 * - Must use a MIX of all visual types
 * - Better context about what each visual type looks like
 */
export async function createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode = "visual") {
  const CHUNK_SECONDS = 120;

  let allClips;

  if (totalDuration <= 180) {
    allClips = await processChunk(scriptText, wordTimestamps, 0, totalDuration, 0, 1, contentMode);
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
      const chunkClips = await processChunk(scriptText, chunk.words, chunk.startTime, chunk.endTime, i, chunks.length, contentMode);
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

  // Subtitle timing validation
  const fixCount = validateSubtitleTiming(allClips, wordTimestamps);
  if (fixCount > 0) {
    console.log(chalk.gray(`  ✔ Fixed subtitle timing on ${fixCount} clips`));
  }

  // v23: Eliminate time overlaps — each clip starts EXACTLY when the previous one ends
  for (let i = 1; i < allClips.length; i++) {
    if (allClips[i].start_time < allClips[i - 1].end_time) {
      allClips[i].start_time = allClips[i - 1].end_time;
      if (allClips[i].end_time <= allClips[i].start_time) {
        allClips[i].end_time = allClips[i].start_time + 2;
      }
    }
  }

  // v25: SUBTITLE BACKFILL — After overlap fixes, re-assign ALL words to clips
  // This fixes the persistent bug where many clips have empty subtitle_words
  if (wordTimestamps && wordTimestamps.length > 0) {
    // Clear all existing subtitle assignments and rebuild from scratch
    allClips.forEach(clip => { clip.subtitle_words = []; });

    for (let wi = 0; wi < wordTimestamps.length; wi++) {
      const word = wordTimestamps[wi];
      if (!word || word.start === undefined) continue;

      // Find which clip this word belongs to (word starts during clip's time range)
      for (let ci = 0; ci < allClips.length; ci++) {
        const clip = allClips[ci];
        if (word.start >= clip.start_time && word.start < clip.end_time) {
          clip.subtitle_words.push(wi);
          break;
        }
      }
    }

    const clipsWithWords = allClips.filter(c => c.subtitle_words.length > 0).length;
    console.log(chalk.gray(`  ✔ Subtitle backfill: ${clipsWithWords}/${allClips.length} clips have words`));
  }

  return allClips;
}

function validateSubtitleTiming(clips, wordTimestamps) {
  const BUFFER = 0.5;
  let fixCount = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (!clip.subtitle_words || clip.subtitle_words.length === 0) continue;

    let latestWordEnd = 0;
    for (const idx of clip.subtitle_words) {
      const word = wordTimestamps[idx];
      if (word && word.end > latestWordEnd) latestWordEnd = word.end;
    }
    if (latestWordEnd === 0) continue;

    const requiredEnd = latestWordEnd + BUFFER;
    if (requiredEnd > clip.end_time) {
      clip.end_time = requiredEnd;
      fixCount++;
      if (i < clips.length - 1) {
        const next = clips[i + 1];
        if (clip.end_time > next.start_time) {
          next.start_time = clip.end_time;
          if (next.end_time - next.start_time < 1) next.end_time = next.start_time + 1.5;
        }
      }
    }

    let earliestWordStart = Infinity;
    for (const idx of clip.subtitle_words) {
      const word = wordTimestamps[idx];
      if (word && word.start < earliestWordStart) earliestWordStart = word.start;
    }
    if (earliestWordStart < clip.start_time && earliestWordStart !== Infinity) {
      clip.start_time = Math.max(0, earliestWordStart - 0.1);
      fixCount++;
    }
  }

  return fixCount;
}

async function processChunk(scriptText, chunkWords, startTime, endTime, chunkIndex, totalChunks, contentMode = "visual") {
  const wordRef = chunkWords.map((w) => {
    const idx = w.originalIndex !== undefined ? w.originalIndex : chunkWords.indexOf(w);
    return `[${idx}] "${w.word}" ${w.start.toFixed(2)}s`;
  }).join("\n");

  const duration = endTime - startTime;
  const textFlashAllowance = chunkIndex === 0 ? 2 : 1;
  const isFirstChunk = chunkIndex === 0;
  const isLastChunk = chunkIndex === totalChunks - 1;

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
${contentMode === "visual" ? "THIS IS A VISUAL VIDEO. Use 85-95% real photos and images. Infographics should be MAX 5-10% of clips — ONLY when a specific hard number or statistic is mentioned in the narration. NEVER use infographics in the first 5 seconds (the hook). The hook MUST be a striking photo or cinematic image. Default to stock photos and AI images for everything." : "THIS IS A DATA-DRIVEN VIDEO. Use 40-60% infographics when numbers and data are mentioned. Use real photos for scene-setting and transitions. Still avoid infographics in the first 3 seconds — start with a compelling image."}

Create a visually compelling storyboard for this ${duration.toFixed(0)}s segment (${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s).

WORD TIMING:
${wordRef}

FULL SCRIPT (for context):
${scriptText.slice(0, 3000)}

═══ YOUR VISUAL TOOLKIT (15 types) ═══

INFOGRAPHIC TYPES (use when content has actual data — DATA topics: 40-60%, VISUAL topics: only 10-20%):

1. "number_reveal" — Animated counter for ANY number mentioned.
   number_data: {value: NUMBER, prefix: "$", suffix: "%", label: "short label", style: "counter|gauge|bars|spotlight|ticker|impact"}

2. "line_chart" — Animated line chart for trends over time.
   chart_data: {title: "Title", points: [{label: "2020", value: 100}, ...], suffix: "%", prefix: "$", color: "#4a9eff"}

3. "donut_chart" — Pie/donut chart for proportions.
   chart_data: {title: "Title", centerLabel: "100%", segments: [{label: "A", value: 60, color: "#4a9eff"}, ...]}

4. "progress_bar" — Multiple horizontal bars with values.
   chart_data: {title: "Title", bars: [{label: "A", value: 85, suffix: "%", color: "#4a9eff"}, ...]}

5. "timeline" — Events on a horizontal timeline.
   chart_data: {title: "Title", events: [{year: "2020", label: "Event"}, ...]}

6. "leaderboard" — Ranked list with bars (top 3 get medals).
   chart_data: {title: "Title", items: [{label: "A", value: 3.1, suffix: "%"}, ...]}

7. "process_flow" — Step-by-step circles with arrows.
   chart_data: {title: "Title", steps: [{label: "Step", icon: "🔍"}, ...]}

8. "stat_card" — Bold KPI numbers (1-3 stats).
   chart_data: {title: "Title", stats: [{value: "4.2T", label: "Label", prefix: "$", change: "+12%", changeColor: "#22c55e"}]}

9. "quote_card" — Styled quote with attribution.
   chart_data: {quote: "Text", attribution: "Person", style: "elegant|bold|minimal"}

10. "checklist" — Items checking off one by one.
    chart_data: {title: "Title", items: ["Item 1", "Item 2", ...], checked: true}

11. "horizontal_bar" — Side-by-side comparison bars (GDP, salary, calories, rent, etc.).
    chart_data: {title: "Title", items: [{label: "USA", value: 25000, color: "#4488ff"}, ...], suffix: "B", prefix: "$"}

12. "vertical_bar" — Bars rising from bottom (box office, subscribers, revenue rankings).
    chart_data: {title: "Title", items: [{label: "Netflix", value: 230, color: "#ff4466"}, ...], suffix: "M", prefix: ""}

13. "scale_comparison" — Proportional circles or bars (planet sizes, building heights, speeds).
    chart_data: {title: "Title", items: [{label: "Jupiter", value: 139820}, ...], suffix: " km", mode: "circles|bars"}

14. "map_highlight" — World map with highlighted pins and stats.
    chart_data: {title: "Title", highlights: [{region: "USA", value: "330M", label: "Population", x: 22, y: 35}, ...]}
    x,y are percentage positions on the map (0-100).

15. "body_diagram" — Human body outline with labeled zones.
    chart_data: {title: "Title", zones: [{label: "Heart Rate", value: "72", suffix: " bpm", position: "chest"}, ...]}
    positions: head, brain, chest, heart, lungs, arms, shoulders, core, stomach, legs, knees, feet, back, hips

16. "funnel_chart" — Narrowing funnel with stages (conversion rates, failure rates).
    chart_data: {title: "Title", stages: [{label: "Stage 1", value: 100, suffix: "%"}, {label: "Stage 2", value: 60}, ...]}

17. "growth_curve" — Dramatic exponential growth animation (compound interest, net worth).
    chart_data: {title: "Title", start_value: 1000, end_value: 100000, prefix: "$", years: 30, color: "#44dd88", label: "Invested $300/mo"}

18. "ranking_cards" — Grid of ranked cards with medals (richest people, fastest cars, etc.).
    chart_data: {title: "Title", items: [{label: "Elon Musk", value: 250, subtitle: "Tesla, SpaceX"}, ...], prefix: "$", suffix: "B"}

19. "split_comparison" — Side-by-side VS comparison of TWO things.
    chart_data: {title: "Title", left: {name: "Stocks", color: "#4488ff"}, right: {name: "Bonds", color: "#ff6644"}, stats: [{label: "Return", left_value: "10%", right_value: "4%"}, ...]}

20. "icon_grid" — Grid of icons with labels (income streams, bias types, benefits).
    chart_data: {title: "Title", items: [{label: "Rental Income", icon: "🏠", value: "$2K/mo"}, ...]}

21. "flow_diagram" — Branching flow with decision points (career paths, decision trees).
    chart_data: {title: "Title", nodes: [{label: "Start", step: "Step 1"}, {label: "Research", step: "Step 2"}, ...]}

22. "comparison" — Side-by-side bar comparison (simple 2-item).
    comparison_data: {items: [{label: "A", value: 80, display: "80%", color: "#4a9eff"}, {label: "B", value: 30, display: "30%", color: "#f97316"}]}

23. "section_break" — Chapter title card.
    section_data: {number: "#1", title: "CHAPTER TITLE"}

24. "text_flash" — Big bold impact words (2-5 words). Max ${textFlashAllowance} in this chunk.
    text_flash_text: "THE REAL TRUTH"

IMAGE TYPES (30-40% of clips):

25. "stock" — Real photo from Pexels. ALWAYS in rounded-corner frame.
    display_style: fullscreen, framed, fullscreen_zoom, split_left, split_right
    split_left: DEFAULT — Image LEFT (~46%), subtitles RIGHT.
    search_query: 3-5 specific words matching EXACTLY what narrator says.

26. "ai_image" — AI-generated image. ALWAYS in rounded-corner frame.
    ai_prompt: 15-30 ultra-specific cinematic words.
    display_style: same as stock.

27. "web_image" — Real photo from Google Images for SPECIFIC real people, places, brands, events.
    search_query: The specific person/place/brand name + context (e.g. "MrBeast YouTube creator", "Eiffel Tower Paris night")
    display_style: same as stock.
    USE WHEN: The narrator mentions a SPECIFIC real person, brand, company, landmark, or event by name.
    DO NOT USE for generic concepts — use stock or ai_image for those.

28. "web_screenshot" — Screenshot of a real website, YouTube channel, tweet, or article.
    screenshot_query: Description of what to screenshot (e.g. "MrBeast YouTube channel page", "Tesla stock chart Google Finance")
    display_style: same as stock.
    USE WHEN: The narrator talks about a specific online presence, channel, post, or website.
    Great for: YouTube channels, social media profiles, news headlines, company websites.

CHOOSING BETWEEN IMAGE TYPES:
- Generic concept (person working, city skyline) → stock
- Abstract/impossible scene (brain exploding with data) → ai_image
- SPECIFIC real person/place/brand → web_image
- Website/channel/social media reference → web_screenshot
- When in doubt → stock

CRITICAL — WEB_IMAGE RULE:
When the script mentions ANY of the following BY NAME, you MUST use "web_image" (not stock or ai_image):
- A specific PERSON (MrBeast, Elon Musk, Warren Buffett, any named individual)
- A specific BRAND or COMPANY (Tesla, Feastables, Amazon, any named brand)
- A specific PLACE or LANDMARK (Times Square, Eiffel Tower, any named location)
- A specific PRODUCT (iPhone, Model Y, any named product)
- A specific YouTube CHANNEL or social media account

For web_image, set search_query to: "[person/brand name] [context]"
Example: "MrBeast YouTube creator", "Feastables chocolate brand", "Tesla Gigafactory"
Use web_image at LEAST 3-5 times per video when the script discusses real people/brands.

CHOOSE THE RIGHT INFOGRAPHIC for the content:
- Comparing multiple items → horizontal_bar, vertical_bar, leaderboard
- Showing proportions → donut_chart, funnel_chart
- Trends over time → line_chart, growth_curve, timeline
- Ranking things → leaderboard, ranking_cards, vertical_bar
- Comparing TWO things → split_comparison, comparison
- Size/scale → scale_comparison
- Geographic data → map_highlight
- Health/body → body_diagram
- Step-by-step → process_flow, flow_diagram, checklist
- Categories/types → icon_grid
- Key numbers → number_reveal, stat_card
- Quotes → quote_card
- Lists → checklist, icon_grid

Read the script and DECIDE which ratio fits best. Don't force infographics where beautiful imagery would work better.

PATTERN depends on content: DATA topics: stock → infographic → infographic → stock → infographic → stock → infographic

When the narrator mentions ANY of these, use an infographic:
- A number, stat, or percentage → number_reveal or stat_card
- Growth or trends → line_chart
- A breakdown or allocation → donut_chart
- Comparing things → progress_bar or comparison
- A ranked list → leaderboard
- Steps or process → process_flow or checklist
- A quote or key insight → quote_card
- Historical events or milestones → timeline
- A section intro → section_break

For VISUAL topics: DEFAULT to stock/web_image/ai_image. Only use infographics when a specific number, statistic, or comparison is explicitly stated. For DATA topics: use infographics whenever possible, images for visual breaks.

═══ VARIETY RULES ═══
- NEVER use the same infographic type twice in a row
- NEVER use the same search_query twice
- NEVER use the same display_style twice in a row for stock clips
- Mix up infographic types: number_reveal → line_chart → stat_card → progress_bar
- Stock clips should show DIFFERENT things — not 5 pictures of the same concept

${isFirstChunk ? `CRITICAL — FIRST 5 SECONDS HOOK (non-negotiable):
The opening MUST be a rapid-fire visual barrage. Viewers decide in 2 seconds whether to stay.
NEVER start with a section_break or text_flash alone. NEVER start with just an image.

REQUIRED first 4 clips (each 1-1.5 seconds):
  Clip 1: number_reveal with the FIRST big number from the script (e.g. "95%" or "17 teaspoons"). Make it style "impact" or "counter".
  Clip 2: stock or ai_image in split_left showing a visceral, emotional image that matches the topic.
  Clip 3: text_flash with 2-3 PUNCHY words that create tension (e.g. "THE REAL TRUTH" or "NOBODY TELLS YOU").
  Clip 4: comparison or horizontal_bar showing a dramatic contrast.

Each clip should be 1-1.5 seconds. Short and fast. This creates the visual WOW effect.
The hook must feel like a TRAILER — fast cuts, big numbers, dramatic imagery.` : ""}
${isLastChunk ? "LAST CHUNK: End with a checklist (action items) or quote_card (inspiring close)." : ""}

MINIMUM REQUIREMENTS:
- Use at least 3 different visual types (don't just alternate stock and number_reveal)
- Every specific number mentioned MUST get a number_reveal or stat_card
- Never more than 2 of the same visual type in a row
- Mix infographics with imagery to keep energy high

═══ TECHNICAL RULES ═══
- PACING IS CRITICAL FOR RETENTION: Switch visuals every 2-4 seconds. Default to 3 seconds per clip.
  - Quick factual statements = 2-3 seconds
  - Important data/stats = 3-4 seconds (viewer needs time to read)  
  - Section breaks = 2-3 seconds (just a title card, keep it snappy)
  - Text flash = 2 seconds max
  - NEVER exceed 5 seconds on any clip. Viewers will click away.
- Cover ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s with NO gaps
- subtitle_words: array of word indices spoken during this clip
- Each clip's end_time must be 0.5s AFTER the last spoken word
- number_data.value MUST be a raw number (not string)
- chart_data values MUST be raw numbers
- Infographic clips do NOT need search_query
- Cutout styles = ONLY for images of PEOPLE

BANNED search terms: baby, infant, child, toddler, kid, children, subscribe, button, icon, logo

Return ONLY a JSON array, no markdown, no backticks:
[{"start_time":${startTime.toFixed(1)},"end_time":0,"visual_type":"","display_style":"","search_query":"","ai_prompt":"","subtitle_words":[],"number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null,"chart_data":null}]`,
        },
      ],
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    }
  );

  const content = response.data.content[0].text;
  let clips = parseClipsJSON(content);
  clips = validateClips(clips, startTime, endTime);
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

function validateClips(clips, startTime, endTime) {
  if (!Array.isArray(clips) || !clips.length) throw new Error("Empty storyboard");

  const banned = ["baby","infant","child","toddler","kid","kids","children","subscribe","button","icon","logo"];
  const validStyles = ["fullscreen","framed","fullscreen_zoom","split_left","split_right"];
  const validTypes = ["stock","number_reveal","comparison","section_break","text_flash","ai_image","web_image","web_screenshot","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card","checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison","icon_grid","flow_diagram"];
  const graphicTypes = ["number_reveal","section_break","comparison","text_flash","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","quote_card","checklist","horizontal_bar","vertical_bar","scale_comparison","map_highlight","body_diagram","funnel_chart","growth_curve","ranking_cards","split_comparison","icon_grid","flow_diagram"];

  let lastStyle = "";
  let lastNumberStyle = "";
  const usedQueries = new Map();

  clips.forEach((clip) => {
    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";
    if (!clip.search_query) clip.search_query = "cinematic landscape";
    
    let q = clip.search_query;
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
    if (q.length < 3) q = "cinematic landscape";

    // v23: Smart image variety — limit any primary keyword to max 2 uses
    if (clip.visual_type === "stock" || clip.visual_type === "ai_image" || clip.visual_type === "web_image") {
      const qLower = q.toLowerCase();
      const primaryWord = qLower.split(/\s+/).find(w => w.length > 3) || qLower.split(/\s+/)[0];
      const keyCount = usedQueries.get(primaryWord) || 0;
      
      if (keyCount >= 2) {
        // This keyword has been used twice — force a different angle
        const alternatives = ["person thinking", "professional workspace", "nature landscape", "city skyline", "technology abstract", "hands working", "bright modern office", "calm ocean waves", "mountain sunrise", "walking outdoors"];
        q = alternatives[usedQueries.size % alternatives.length];
      }
      
      // Track keyword frequency
      for (const word of qLower.split(/\s+/)) {
        if (word.length > 3) {
          usedQueries.set(word, (usedQueries.get(word) || 0) + 1);
        }
      }
    }

    clip.search_query = q;

    // web_screenshot gets its query from screenshot_query field
    if (clip.visual_type === "web_screenshot" && !clip.screenshot_query) {
      clip.screenshot_query = clip.search_query;
    }

    if (!clip.subtitle_words) clip.subtitle_words = [];
    if (clip.start_time === undefined || clip.start_time === null) clip.start_time = startTime;
    if (!clip.end_time) clip.end_time = clip.start_time + 3;

    clip.start_time = Math.max(clip.start_time, startTime);
    clip.end_time = Math.min(clip.end_time, endTime);

    if (clip.end_time - clip.start_time < 1) {
      clip.end_time = clip.start_time + 2;
    }

    // Force graphic-only types to have no image data
    if (graphicTypes.includes(clip.visual_type)) {
      clip.imagePath = null;
      clip.isCutout = false;
    }

    // Ensure number reveal styles don't repeat
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
  });

  return clips;
}
