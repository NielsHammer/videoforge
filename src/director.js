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

  // Strip SSML tags from scriptText before sentence splitting
  // (enhancedScript may contain <break time="500ms"/> etc.)
  const cleanScript = scriptText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const rawSentences = cleanScript
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  const sentences = [];
  let wordIdx = 0;

  for (const sentence of rawSentences) {
    const sentenceWords = sentence
      .replace(/[^a-zA-Z0-9\s\']/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0);

    if (sentenceWords.length === 0) continue;
    if (wordIdx >= wordTimestamps.length) break;

    // Search up to 40 words ahead (was 20 — increased for better drift tolerance)
    let startWordIdx = wordIdx;
    const firstWord = sentenceWords[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);

    for (let i = wordIdx; i < Math.min(wordIdx + 40, wordTimestamps.length); i++) {
      if (wordTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(firstWord)) {
        startWordIdx = i;
        break;
      }
    }

    // Search for last word within sentence length + 8 buffer
    const lastWord = sentenceWords[sentenceWords.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    let endWordIdx = startWordIdx;
    const searchEnd = Math.min(startWordIdx + sentenceWords.length + 8, wordTimestamps.length);

    for (let i = startWordIdx; i < searchEnd; i++) {
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

    // Always advance past endWordIdx to prevent stalling
    wordIdx = Math.max(endWordIdx + 1, wordIdx + 1);
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
      // Split the text at roughly the midpoint word
      const words = clip.text.split(/\s+/);
      const midWord = Math.floor(words.length / 2);
      const firstHalfText = words.slice(0, midWord).join(" ") || clip.text;
      const secondHalfText = words.slice(midWord).join(" ") || clip.text;
      result.push({ ...clip, end: mid, text: firstHalfText });
      result.push({ ...clip, start: mid, text: secondHalfText });
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
  if (/personal brand|youtube|content creator|social media|influencer|audience|tiktok|instagram|addiction|screen time|dopamine/.test(text))
    return { niche: "creator", imageStyle: "content creator studio, camera recording, social media, phone screen" };
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

  const prompt = `You are planning a YouTube video storyboard. Read every sentence and assign the BEST visual type for each clip.

VIDEO TOPIC: "${topic}"
NICHE: ${nicheInfo.niche} | THEME: "${theme}"
NICHE STYLE: ${budget.label}
PREFERRED ANIMATIONS FOR THIS THEME: ${themeHints.prefer.join(", ")}

TARGET MIX for ${total} total clips:
- ${stockTarget} clips → "stock" (real images only)
- ${animTarget} clips → "animation" (text/motion graphics)
- ${splitTarget} clips → "split" (image + panel side by side)
- ${infraTarget} clips → "infographic" (data charts/stats)

CLIP WINDOWS:
${windowList}

════════════════════════════════════════════
ANIMATION TYPES — pick the BEST fit per sentence:
════════════════════════════════════════════

IMPACT TEXT (use when narrator makes a bold statement):
- kinetic_text: 2-4 punchy words slam in. USE FOR: key claims, chapter titles, rhetorical points
- neon_sign: glowing bold phrase. USE FOR: mottos, mantras, big truths ("INVEST FIRST. ALWAYS.")
- typewriter_reveal: text types out. USE FOR: quotes, revelations, dramatic pauses
- glitch_text: glitchy distorted text. USE FOR: tech topics, hacking, shocking system failures
- big_number: one massive number fills screen. USE FOR: single shocking stat deserves full emphasis
- pull_quote: large italic quote. USE FOR: direct quotes from people, memorable phrases

STATS & NUMBERS (use when narrator cites a specific number):
- spotlight_stat: single % or $ with label. USE FOR: "96% of Americans never reach $1M"
- count_up: number counts up dramatically. USE FOR: numbers ≥10 counting to final value
- money_counter: dollar amount counts up. USE FOR: monetary amounts, costs, earnings
- percent_fill: circle fills to percentage. USE FOR: single percentage that feels like a fill-up
- trend_arrow: arrow pointing up or down. USE FOR: change sentences ("rose 40%", "dropped 20%")
- loading_bar: bar fills to percentage. USE FOR: alarming % like "78% live paycheck to paycheck"
- score_card: letter grade reveal (A-F). USE FOR: grading something ("Americans get an F on savings")

COMPARISONS (use when narrator contrasts two things):
- before_after: transformation from X to Y. USE FOR: "went from broke to $1M", change stories
- compare_reveal: two cards side by side with winner. USE FOR: "average vs millionaire", "old vs new"
- side_by_side: two concepts equal weight. USE FOR: "poor mindset vs rich mindset"
- stat_comparison: two big stats facing off. USE FOR: two contrasting statistics
- mindset_shift: old thinking crossed out → new thinking. USE FOR: paradigm shifts, reframes
- myth_fact: myth crossed out, reality revealed. USE FOR: debunking, "most people think X but really Y"
- pro_con: pros and cons columns. USE FOR: weighing advantages vs disadvantages
- conversation_bubble: chat bubbles dialogue. USE FOR: contrasting two perspectives as dialogue

LISTS & STEPS (use when narrator lists items or steps):
- checkmark_build: items build with checkmarks. USE FOR: steps, requirements, criteria lists
- highlight_build: phrases highlight one by one. USE FOR: 2-3 key points building
- bullet_list: clean animated bullets. USE FOR: 3-5 tips, reasons, or items
- step_reveal: numbered steps. USE FOR: how-to processes, sequences
- three_points: exactly 3 key points with icons. USE FOR: "3 reasons", "3 rules", "3 types"
- rule_card: named rule/principle display. USE FOR: "Rule #1: Pay yourself first"

REACTIONS & EMOTION (use for emotional peaks):
- reaction_face: emoji slams in (🤯😱). USE FOR: shocking reveals, disbelief moments
- warning_siren: red warning banner. USE FOR: danger, mistakes to avoid, traps
- alert_banner: styled alert with stat. USE FOR: critical mistakes with supporting statistic
- lightbulb_moment: insight reveal. USE FOR: "here's the key insight", "the real reason is..."
- news_breaking: news ticker style. USE FOR: shocking statistics, dramatic revelations
- news_headline: newspaper headline. USE FOR: when fact sounds like a headline
- rocket_launch: rocket launches. USE FOR: growth, momentum, "this is where it compounds"
- quiz_card: question with answer reveal. USE FOR: rhetorical questions "what % do you think..."

SOCIAL / PLATFORM (use for creator topics or viral moments):
- tweet_card: tweet-style card. USE FOR: quotable 1-liner, viral-worthy statement (20-100 chars)
- reddit_post: Reddit post card. USE FOR: relatable community story, forum reference
- instagram_post: Instagram card. USE FOR: social media topics, creator economy
- youtube_card: YouTube video card. USE FOR: YouTube references, creator topics
- google_search: Google search results. USE FOR: "if you search X you'll find..." moments
- phone_screen: phone notification. USE FOR: social media topics, app references

FINANCE SPECIFIC (use for finance/investment topics):
- stock_ticker: scrolling stock prices. USE FOR: market topics, investment discussions
- portfolio_breakdown: allocation bars. USE FOR: describing how wealthy people invest
- candlestick_chart: price chart. USE FOR: stock market, crashes, recoveries
- roi_calculator: shows investment growing. USE FOR: compound interest, "invest $X get $Y"
- wealth_ladder: tier visualization. USE FOR: wealth levels, income classes

DATA CHARTS (use when narrator cites multiple data points):
- stacked_bar: composition breakdown. USE FOR: "budget breaks down as X% housing, Y% food"
- vote_bar: poll results. USE FOR: survey data, "78% of people say..."
- speed_meter: gauge/dial. USE FOR: rating something on a scale
- timelapse_bar: timeline progress. USE FOR: life stages, time windows, deadlines
- map_callout: location + stat. USE FOR: country/city specific statistics

PEOPLE & STORIES (use when narrator talks about a specific person):
- person_profile: person stats card. USE FOR: real person with specific details
- pro_con: also for evaluating a decision involving people

════════════════════════════════════════════
INFOGRAPHIC TYPES (data-heavy, need chart_data):
════════════════════════════════════════════
- number_reveal: single big number animation. USE WHEN: sentence has one key number ≥10
- stat_card: 2-3 stats in cards. USE WHEN: sentence has multiple statistics
- checklist: checkmark list from script. USE WHEN: sentence introduces a list of items
- progress_bar: horizontal bars. USE WHEN: sentence compares multiple percentages
- timeline: events on a timeline. USE WHEN: sentence mentions years or historical sequence
- leaderboard: ranked list. USE WHEN: sentence ranks or orders things
- horizontal_bar: comparison bars. USE WHEN: sentence has 2-3 comparable quantities
- growth_curve: exponential growth line. USE WHEN: compound interest, exponential growth
- donut_chart: pie breakdown. USE WHEN: proportions that add to 100%
- flow_diagram: A→B→C flow. USE WHEN: process or sequence of causes/effects

NICHE-SPECIFIC RULES:
${nicheInfo.niche === "horror" || nicheInfo.niche === "true_crime" ? "- HORROR/TRUE CRIME: NO infographics. Use: reaction_face, warning_siren, glitch_text, neon_sign, news_breaking, news_headline, typewriter_reveal only." : ""}
${nicheInfo.niche === "creator" ? "- CREATOR: Prioritize tweet_card, phone_screen, instagram_post, youtube_card, reddit_post, google_search, social_counter." : ""}
${nicheInfo.niche === "finance" ? "- FINANCE: Prioritize stock_ticker, roi_calculator, portfolio_breakdown, candlestick_chart, wealth_ladder, money_counter, count_up, spotlight_stat." : ""}
${nicheInfo.niche === "business" ? "- BUSINESS: Prioritize rule_card, mindset_shift, three_points, step_reveal, bullet_list, compare_reveal, rocket_launch, lightbulb_moment." : ""}
${nicheInfo.niche === "history" ? "- HISTORY: Prioritize timeline, timelapse_bar, news_headline, person_profile, map_callout, typewriter_reveal." : ""}
${nicheInfo.niche === "health" ? "- HEALTH: Prioritize score_card, loading_bar, percent_fill, vote_bar, bullet_list, three_points, step_reveal." : ""}
${nicheInfo.niche === "travel" ? "- TRAVEL: Prioritize map_callout, person_profile, split layouts, pull_quote." : ""}

CRITICAL DISTRIBUTION RULES:
1. Clip 0 MUST be "animation" — most dramatic type for opening line
2. First 3 clips: NEVER "fullscreen", NEVER "split"
3. Every 5 consecutive clips must have at least 2 non-stock
4. NEVER bunch animations at the end — spread throughout
5. "fullscreen" display: max 2 times total, only after position 4
6. Choose animation type based on what the SENTENCE IS ACTUALLY SAYING — don't pick money_counter for a sentence with no money, don't pick before_after for a sentence with no transformation

Return ONLY a JSON array of ${total} objects:
[{"i":0,"category":"animation","type":"spotlight_stat","display":"framed"},...]

Categories: "stock", "animation", "split", "infographic"
Display: "framed", "fullscreen", "split_left", "split_right"`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
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

  // Persistent across chunks so neon_sign used in chunk 1 counts toward chunk 2's cap
  const globalTypeCounts = {};
  let globalAnimIdx = 0;
  let globalInfraIdx = 0;

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

    // Enforce plan with persistent global counts
    const result = enforcePlan(chunkClips, windowChunk, planChunk, scriptText, globalTypeCounts, globalAnimIdx, globalInfraIdx);
    allClips.push(...result.clips);
    globalAnimIdx = result.animIdx;
    globalInfraIdx = result.infraIdx;
  }

  // Post-processing
  let finalClips = applyPostProcessing(allClips, totalDuration, scriptText, nicheInfo);

  console.log(chalk.gray(`  Storyboard: ${finalClips.length} clips`));
  return finalClips;
}


// ─── ENFORCE PLAN ────────────────────────────────────────────────────────────
// Pass 2 often ignores the plan and returns stock for everything.
// This re-injects planned animation/infographic with auto-generated data.
function enforcePlan(clips, windows, planChunk, scriptText, typeCounts = {}, animRotationIdx = 0, infraRotationIdx = 0) {
  const maxPerType = 3; // max per type before rotating to next

  // Rotation pools for variety
  const animRotation = [
    "kinetic_text","spotlight_stat","reaction_face","warning_siren","neon_sign",
    "money_counter","count_up","typewriter_reveal","news_breaking","glitch_text",
    "percent_fill","trend_arrow","before_after","compare_reveal","highlight_build",
    "checkmark_build","icon_burst","lightbulb_moment","rocket_launch","tweet_card",
    "phone_screen","word_scatter","side_by_side","thumbs_up","stock_ticker",
    // batch4
    "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
    "pro_con","score_card","mindset_shift","big_number","alert_banner",
    "three_points","rule_card","loading_bar","vote_bar","news_headline",
    "conversation_bubble","stacked_bar","countdown_timer",
  ];
  const infraRotation = [
    "stat_card","number_reveal","checklist","progress_bar","timeline",
    "leaderboard","horizontal_bar","growth_curve","donut_chart","ranking_cards",
    "flow_diagram","process_flow","icon_grid","split_comparison","scale_comparison",
  ];
  // animRotationIdx and infraRotationIdx come from function params (persistent across chunks)

  const result = clips.map((clip, i) => {
    const plan = planChunk[i] || {};
    const window = windows[i] || {};
    const sentence = window.text || "";

    // If Pass 2 honored the plan, track usage and leave it alone
    if (plan.category === "stock" && clip.visual_type === "stock") return clip;
    if (plan.category === "split" && (clip.display_style === "split_left" || clip.display_style === "split_right")) return clip;
    if (plan.category === "animation" && clip.visual_type !== "stock" && clip.animation_data) {
      typeCounts[clip.visual_type] = (typeCounts[clip.visual_type] || 0) + 1;
      return clip;
    }
    if (plan.category === "infographic" && clip.visual_type !== "stock" && (clip.chart_data || clip.number_data || clip.animation_data)) {
      // Pass 2 provided data — validate it's not malformed
      if (clip.visual_type === "number_reveal") {
        // Ensure number_data.value is actually a number
        if (!clip.number_data || typeof clip.number_data.value !== "number") {
          const repaired = generateInfographicData("number_reveal", sentence, scriptText);
          clip.number_data = repaired.number_data;
        }
      }
      typeCounts[clip.visual_type] = (typeCounts[clip.visual_type] || 0) + 1;
      return clip;
    }

    // Pass 2 ignored the plan — re-inject with variety
    if (plan.category === "animation") {
      // Pick a type we haven't overused
      let type = plan.type;
      if ((typeCounts[type] || 0) >= maxPerType) {
        // Find next unused type in rotation
        for (let r = 0; r < animRotation.length; r++) {
          const candidate = animRotation[(animRotationIdx + r) % animRotation.length];
          if ((typeCounts[candidate] || 0) < maxPerType) {
            type = candidate;
            animRotationIdx = (animRotationIdx + r + 1) % animRotation.length;
            break;
          }
        }
      }
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      const animData = generateAnimationData(type, sentence);
      if (animData) {
        return { ...clip, visual_type: type, display_style: "framed", animation_data: animData, search_query: "" };
      }
      // generateAnimationData returned null (e.g. compare_reveal with no comparison) — try next type
      for (let r = 0; r < animRotation.length; r++) {
        const alt = animRotation[(animRotationIdx + r) % animRotation.length];
        if ((typeCounts[alt] || 0) < maxPerType) {
          const altData = generateAnimationData(alt, sentence);
          if (altData) {
            typeCounts[alt] = (typeCounts[alt] || 0) + 1;
            animRotationIdx = (animRotationIdx + r + 1) % animRotation.length;
            return { ...clip, visual_type: alt, display_style: "framed", animation_data: altData, search_query: "" };
          }
        }
      }
    }

    if (plan.category === "infographic") {
      // Pick an infographic type we haven't overused
      let type = plan.type;
      if ((typeCounts[type] || 0) >= maxPerType) {
        for (let r = 0; r < infraRotation.length; r++) {
          const candidate = infraRotation[(infraRotationIdx + r) % infraRotation.length];
          if ((typeCounts[candidate] || 0) < maxPerType) {
            type = candidate;
            infraRotationIdx = (infraRotationIdx + r + 1) % infraRotation.length;
            break;
          }
        }
      }
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      const infraData = generateInfographicData(type, sentence, scriptText);
      if (infraData.chart_data || infraData.number_data || infraData.animation_data) {
        return { ...clip, visual_type: type, display_style: "framed", ...infraData, search_query: "" };
      }
    }

    if (plan.category === "split") {
      return { ...clip, display_style: plan.display || (i % 2 === 0 ? "split_left" : "split_right"), panel_type: "icon", panel_icon: pickIconForSentence(sentence) };
    }
    return clip;
  });
  return { clips: result, animIdx: animRotationIdx, infraIdx: infraRotationIdx };
}

// Parse written-out numbers like "sixty-eight" → 68, "four" → 4
function parseWordNumbers(sentence) {
  const map = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,million:1000000,billion:1000000000 };
  // Words that are too ambiguous to treat as numbers in isolation
  const ambiguous = new Set(["one","two","three","four","five","six","seven","eight","nine"]);
  const words = sentence.toLowerCase().replace(/-/g, " ").split(/\s+/);
  const found = [];
  for (let i = 0; i < words.length; i++) {
    if (map[words[i]] !== undefined) {
      let val = map[words[i]];
      const nextWord = words[i+1];
      const hasMultiplier = nextWord && (nextWord === "hundred" || nextWord === "thousand" || nextWord === "million" || nextWord === "billion" || nextWord === "percent");
      const prevWord = i > 0 ? words[i-1] : "";
      const hasContext = /percent|dollar|million|billion|thousand|hundred/.test(words.slice(Math.max(0,i-2), i+3).join(" "));
      // Skip ambiguous single-digit words unless they have numeric context
      if (ambiguous.has(words[i]) && !hasMultiplier && !hasContext) continue;
      if (i + 1 < words.length && map[nextWord] !== undefined && map[nextWord] < val) {
        val += map[nextWord]; i++;
      }
      found.push(val);
    }
  }
  return found;
}

function getNumbers(sentence) {
  // First try digit numbers, then word numbers
  const digits = sentence.match(/\d+(\.\d+)?/g)?.map(Number) || [];
  const words = parseWordNumbers(sentence);
  return [...new Set([...digits, ...words])];
}


function generateAnimationData(type, sentence) {
  const words = sentence.replace(/[^a-zA-Z0-9\s%$]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const numbers = getNumbers(sentence); // parses both "68%" and "sixty-eight percent"
  const pct = sentence.match(/(\d+)\s*%/) || (numbers.length && sentence.toLowerCase().includes("percent") ? [null, String(numbers[0])] : null);
  const money = sentence.match(/\$[\d,]+/);
  const stop = new Set(["the","and","but","for","with","this","that","have","from","they","their","your","you","was","are","were","has","had","not","can","will","would","could","should","what","when","where","how","why","who","which","been","being","than","then","into","just","more","most","some","such","even","also","very"]);
  const key = words.filter(w => !stop.has(w.toLowerCase())).map(w => w.toUpperCase());

  switch (type) {
    case "kinetic_text": {
      // Filter out truncated words from apostrophe splitting (wasn, didn, don, can, won, isn, aren, couldn, shouldn)
      const truncated = new Set(["wasn","didn","don","can","won","isn","aren","couldn","shouldn","wouldn","doesn","hadn","haven","mustn","needn","shan","let"]);
      const cleanKey = key.filter(w => !truncated.has(w.toLowerCase()) && w.length > 2);
      return cleanKey.length >= 2 ? { lines: cleanKey.slice(0, 2), style: "impact" } : null;
    }
    case "spotlight_stat": {
      // Extract context AFTER the number for a meaningful label
      const afterNum = sentence.replace(/^[\s\S]*?\b(\d+%?|\$[\d,]+)\b\s*/, "").replace(/[^a-zA-Z\s]/g, "").trim().toLowerCase().slice(0, 45);
      const cleanLabel = afterNum.length > 4 ? afterNum : sentence.replace(/\d+%?/g, "").replace(/[^a-zA-Z\s]/g, " ").trim().toLowerCase().slice(0, 40);
      if (pct) return { value: pct[1] + "%", label: cleanLabel || "of people", context: "" };
      if (money) return { value: money[0], label: cleanLabel || "key amount", context: "" };
      if (numbers[0]) return { value: sentence.toLowerCase().includes("percent") ? numbers[0] + "%" : String(numbers[0]), label: cleanLabel || "key stat", context: "" };
      return { value: key[0] || "FACT", label: sentence.slice(0, 40).toLowerCase(), context: "" };
    }
    case "count_up":
      // Only for sentences with actual meaningful numbers (>=5 to avoid "one of the" type sentences)
      if (!numbers[0] || numbers[0] < 5) return null;
      {
        // Extract context AFTER the number — "8 out of 10 people" → label "out of 10 people"
        const afterNum = sentence.replace(/^[\s\S]*?\b\d+\b\s*/, "").replace(/[^a-zA-Z\s]/g, "").trim().toLowerCase().slice(0, 40);
        const label = afterNum.length > 4 ? afterNum : key.filter(w => !/^\d+$/.test(w)).slice(1, 4).join(" ").toLowerCase() || "key stat";
        return { value: parseFloat(numbers[0]), prefix: money ? "$" : "", suffix: pct ? "%" : "", label, decimals: 0 };
      }
    case "money_counter":
      // Only for sentences with money amounts (>=5)
      if (!money && (!numbers[0] || numbers[0] < 5)) return null;
      return { amount: parseFloat(numbers[0]) || 1000, currency: "$", label: key.slice(0, 3).join(" ").toLowerCase() };
    case "reaction_face":
      return { emoji: /warn|danger|bad|problem|addict|shock|crazy|wild|insane|unbeliev/.test(sentence.toLowerCase()) ? "😱" : "🤯", label: key.slice(0, 2).join(" ") || "SHOCKING", style: "slam" };
    case "warning_siren":
      // Only for danger/mistake/warning sentences
      if (!/warn|danger|risk|mistake|wrong|avoid|never|stop|careful|trap|lie|myth|broke/.test(sentence.toLowerCase())) return null;
      return { headline: "WARNING", body: sentence.slice(0, 60), icon: "⚠️", color: "#ef4444" };
    case "neon_sign": return { text: key.slice(0, 2).join(" ") || "THE TRUTH", subtitle: key[2] || "" };
    case "typewriter_reveal": return { text: sentence.slice(0, 60), subtitle: "" };
    case "glitch_text": return { text: key.slice(0, 2).join(" ") || "HACKED", subtitle: "" };
    case "news_breaking":
      // Only for sentences with shocking stats — NOT section titles or numbered points
      if (/^number (one|two|three|four|five|six|seven|eight|nine|ten)\./i.test(sentence.trim())) return null;
      if (/^trap (one|two|three|four|five)/i.test(sentence.trim())) return null;
      if (!numbers[0] && !/shocking|study|research|discover|reveal|scientists|experts|found/.test(sentence.toLowerCase())) return null;
      if (sentence.length < 20) return null;
      return { headline: sentence.slice(0, 55).toUpperCase(), subtext: sentence.slice(55, 100), ticker: "DEVELOPING STORY • MORE TO COME" };
    case "highlight_build": {
      // Only for sentences with 2+ comma-separated items or list structure
      const parts = sentence.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 8);
      if (parts.length < 2) return null;
      return { lines: parts.slice(0, 3), delay: 0.3 };
    }
    case "checkmark_build": {
      // Only for steps/lists (comma-separated or "first... second... third")
      const hasList = /first|second|third|step|,/.test(sentence.toLowerCase());
      if (!hasList) return null;
      const parts = sentence.split(/[,;]|first|second|third/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 4);
      if (parts.length < 2) return null;
      return { items: parts, title: "" };
    }
    case "before_after": {
      // Only for transformation sentences
      const s = sentence.toLowerCase();
      if (!/from.*to|was.*now|before.*after|used to|instead|switch|changed|transform/.test(s)) return null;
      const fromMatch = sentence.match(/from\s+([^,]+)\s+to\s+([^,.]+)/i);
      return fromMatch
        ? { before: fromMatch[1].trim().slice(0, 20), after: fromMatch[2].trim().slice(0, 20), label: key.slice(0, 3).join(" ").toLowerCase() }
        : { before: key[0] || "Before", after: key[1] || "After", label: key.slice(2, 5).join(" ").toLowerCase() };
    }
    case "percent_fill":
      // Only when sentence has a percentage
      if (!pct && !sentence.toLowerCase().includes("percent")) return null;
      return { percent: parseInt(pct?.[1]) || numbers[0] || 73, label: key.slice(0, 4).join(" ").toLowerCase() };
    case "trend_arrow":
      // Only for sentences describing change/direction
      if (!/increas|decreas|grow|rise|fall|drop|up|down|more|less|gain|lose|higher|lower/.test(sentence.toLowerCase())) return null;
      return { direction: /decreas|drop|down|fall|less|lower|shrink/.test(sentence.toLowerCase()) ? "down" : "up", value: (numbers[0] || "73") + (pct ? "%" : ""), label: key.slice(0, 4).join(" ").toLowerCase() };
    case "compare_reveal": {
      const s = sentence.toLowerCase();
      const hasComparison = /vs\.?|versus|compared to|while|whereas|average.*millionaire|poor.*rich|before.*after|old.*new|then.*now/.test(s);
      if (!hasComparison) return null;
      let labelA = "AVERAGE", labelB = "WEALTHY", scoreA = "Low", scoreB = "High";
      if (/average.*millionaire|poor.*rich|broke.*wealthy/.test(s)) {
        labelA = "AVERAGE"; labelB = "MILLIONAIRE";
        if (pct) { scoreA = (parseInt(pct[1]) < 50 ? pct[1] : 100 - parseInt(pct[1])) + "%"; scoreB = pct[1] + "%"; }
        else if (numbers[0]) { scoreA = String(numbers[0]); scoreB = numbers[1] ? String(numbers[1]) : "10x"; }
      } else if (/before.*after|old.*new|then.*now|was.*now/.test(s)) {
        labelA = "BEFORE"; labelB = "AFTER";
        if (numbers[0] && numbers[1]) { scoreA = String(numbers[0]); scoreB = String(numbers[1]); }
      } else {
        labelA = key[0] || "OPTION A"; labelB = key[1] || "OPTION B";
        if (numbers[0]) { scoreA = String(numbers[0]); scoreB = numbers[1] ? String(numbers[1]) : "—"; }
      }
      return { items: [{ label: labelA, score: scoreA, description: sentence.slice(0, 30), icon: "❌" }, { label: labelB, score: scoreB, description: sentence.slice(30, 60), icon: "✅" }], title: key.slice(2, 5).join(" ") || "The Difference", winner: 1 };
    }
    case "side_by_side": {
      // Only for clear two-sided comparisons
      if (!/vs|versus|compared|while|or|either/.test(sentence.toLowerCase())) return null;
      return { left: key[0] || "BEFORE", right: key[1] || "AFTER", leftSub: numbers[0] ? String(numbers[0]) : sentence.slice(0, 20), rightSub: numbers[1] ? String(numbers[1]) : sentence.slice(20, 40), vs: true, leftColor: "#ef4444", rightColor: "#22c55e" };
    }
    case "icon_burst": {
      if (key.length < 3) return null;
      const icons = ["💰","📈","🧠","⚡","🎯","🔥","🏆","💡","✅","🚀"].slice(0, Math.max(3, Math.min(key.length, 6)));
      return { icons, label: key.slice(0, 3).join(" "), style: "burst" };
    }
    case "lightbulb_moment":
      // Only for insight/idea/tip sentences
      if (!/tip|insight|key|secret|trick|truth|real|actually|important|crucial|realize|discover/.test(sentence.toLowerCase())) return null;
      return { text: sentence.slice(0, 50), subtext: key.slice(0, 3).join(" ") };
    case "rocket_launch":
      // Only for growth/success/momentum sentences
      if (!/grow|rise|launch|build|start|success|momentum|explode|scale|compound|wealth|rich/.test(sentence.toLowerCase())) return null;
      return { headline: key.slice(0, 2).join(" ").toUpperCase() || "GROWTH", subtext: key.slice(2, 4).join(" ") || "", stage: "launch" };
    case "tweet_card":
      // Only for quotable claims (short, punchy sentences)
      if (sentence.length > 120 || sentence.length < 20) return null;
      return { handle: "@viewer", text: sentence.slice(0, 100), likes: `${Math.floor(Math.random() * 90 + 10)}.${Math.floor(Math.random() * 9)}K`, retweets: `${Math.floor(Math.random() * 20 + 5)}.${Math.floor(Math.random() * 9)}K` };
    case "phone_screen":
      // Only for social/creator topics
      if (!/social|follow|subscriber|view|post|content|platform|app|notification|viral/.test(sentence.toLowerCase())) return null;
      return { app: "instagram", notification: sentence.slice(0, 50), metric: numbers[0] ? `${numbers[0]}K` : "10.2K" };
    case "word_scatter":
      // Works for most sentences with enough key words
      if (key.length < 4) return null;
      return { words: key.slice(0, 7).filter(Boolean), centerWord: key[0] || "" };
    case "thumbs_up":
      // Only for recommendation/verdict sentences
      if (!/do|don't|should|avoid|recommend|best|worst|right|wrong|good|bad|try|never|always/.test(sentence.toLowerCase())) return null;
      return { type: /don't|avoid|mistake|wrong|bad|never|stop/.test(sentence.toLowerCase()) ? "down" : "up", items: key.slice(0, 3), verdict: key.slice(0, 2).join(" ").toUpperCase() };
    case "stock_ticker":
      // Only for finance/business topics with quantifiable concepts
      if (!/invest|stock|market|fund|portfolio|asset|return|profit|loss|dividend|wealth/.test(sentence.toLowerCase())) return null;
      return { items: key.slice(0, 3).map((w, i) => ({ symbol: w.toUpperCase().slice(0, 6), price: `$${(Math.random() * 500 + 50).toFixed(2)}`, change: i === 0 ? `+${(Math.random() * 20).toFixed(1)}%` : `-${(Math.random() * 10).toFixed(1)}%` })), title: "" };

    // ─── BATCH 4 TYPES ────────────────────────────────────────────────────────
    case "pull_quote":
      if (sentence.length < 15) return null;
      return { quote: sentence.slice(0, 120), attribution: "" };
    case "big_number":
      if (!numbers[0] || numbers[0] < 5) return null;
      return { value: pct ? pct[1] + "%" : (money ? money[0] : String(numbers[0])), label: key.slice(0, 4).join(" ").toLowerCase(), context: "", prefix: "", suffix: "" };
    case "stat_comparison": {
      if (numbers.length < 1) return null;
      const v1 = pct ? pct[1] + "%" : String(numbers[0]);
      const v2 = numbers[1] ? String(100 - parseInt(numbers[0])) + "%" : "High";
      return { left: { value: v1, label: key.slice(0, 2).join(" ").toLowerCase(), color: "#ef4444" }, right: { value: v2, label: key.slice(2, 4).join(" ").toLowerCase(), color: "#22c55e" }, title: key.slice(4, 7).join(" ") || "The Gap" };
    }
    case "bullet_list": {
      const parts = sentence.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 5);
      if (parts.length < 2) return null;
      return { title: key.slice(0, 2).join(" "), items: parts, icon: "▶" };
    }
    case "myth_fact": {
      if (!/think|believe|wrong|myth|actually|truth|real|but|however/.test(sentence.toLowerCase())) return null;
      const halves = sentence.split(/but|however|actually|in reality/i);
      return { myth: (halves[0] || sentence.slice(0, 50)).trim(), fact: (halves[1] || sentence.slice(50, 100)).trim(), label: "MYTH BUSTED" };
    }
    case "step_reveal": {
      const parts = sentence.split(/[,;]|first|second|third|then|next|finally/i).map(s => s.trim()).filter(s => s.length > 8).slice(0, 4);
      if (parts.length < 2) return null;
      return { title: key.slice(0, 2).join(" "), steps: parts, active: 0 };
    }
    case "pro_con": {
      const halves = sentence.split(/but|however|although|while|whereas|yet/i);
      if (halves.length < 2) return null;
      return { title: "The Trade-off", pros: [halves[0].trim().slice(0, 60)], cons: [halves[1].trim().slice(0, 60)] };
    }
    case "score_card": {
      const gradeMap = { great: "A", good: "B", average: "C", bad: "D", terrible: "F", failing: "F", worst: "F", poor: "D", excellent: "A" };
      const match = Object.keys(gradeMap).find(k => sentence.toLowerCase().includes(k));
      if (!match) return null; // don't show score_card without a clear grade context
      const grade = gradeMap[match];
      const isGood = grade <= "B";
      return { grade, label: key.slice(0, 3).join(" "), subtitle: sentence.slice(0, 50), color: isGood ? "#22c55e" : "#ef4444" };
    }
    case "mindset_shift": {
      const halves = sentence.split(/but|instead|rather|however|not.*but/i);
      if (halves.length < 2) return null;
      return { old: halves[0].trim().slice(0, 60), new: halves[1].trim().slice(0, 60), label: "THE SHIFT" };
    }
    case "alert_banner":
      if (!/warn|danger|risk|mistake|wrong|avoid|never|critical|important/.test(sentence.toLowerCase())) return null;
      return { type: "danger", title: "CRITICAL MISTAKE", body: sentence.slice(0, 80), stat: "", icon: "🚨" };
    case "three_points": {
      const parts = sentence.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 3);
      if (parts.length < 3) return null;
      const icons = ["💰","⏰","🎯"];
      return { title: key.slice(0, 3).join(" "), points: parts.map((p, i) => ({ icon: icons[i], label: p.split(" ").slice(0, 2).join(" ").toUpperCase(), desc: p })) };
    }
    case "rule_card":
      if (!/rule|law|principle|step|tip|key|secret/.test(sentence.toLowerCase())) return null;
      return { number: "Key Rule", name: key.slice(0, 2).join(" "), description: sentence.slice(0, 80), icon: "💡" };
    case "loading_bar":
      if (!pct && !numbers[0]) return null;
      return { label: key.slice(0, 5).join(" ").toLowerCase(), value: parseInt(pct?.[1]) || numbers[0] || 73, suffix: "%", color: "#ef4444", subtitle: "" };
    case "vote_bar":
      if (!pct && !numbers[0]) return null;
      return { question: sentence.slice(0, 80), options: [{ label: "Yes", pct: parseInt(pct?.[1]) || numbers[0] || 73, winner: true }, { label: "No", pct: 100 - (parseInt(pct?.[1]) || numbers[0] || 73) }] };
    case "news_headline":
      if (!numbers[0] && !/reveal|shocking|truth|secret|discover/.test(sentence.toLowerCase())) return null;
      return { outlet: "BREAKING NEWS", headline: sentence.slice(0, 70), subtext: key.slice(0, 4).join(" "), date: String(new Date().getFullYear()) };
    case "conversation_bubble": {
      const halves = sentence.split(/but|while|whereas|vs|versus/i);
      if (halves.length < 2) return null;
      return { exchanges: [{ speaker: "Most People", text: halves[0].trim().slice(0, 60), side: "left" }, { speaker: "The Wealthy", text: halves[1].trim().slice(0, 60), side: "right" }] };
    }
    case "stacked_bar":
      if (numbers.length < 2) return null;
      return { title: key.slice(0, 3).join(" "), segments: key.slice(0, 4).map((k, i) => ({ label: k, value: parseInt(numbers[i]) || Math.round(100 / Math.max(key.slice(0, 4).length, 1)), color: ["#ef4444","#f97316","#eab308","#22c55e"][i] })) };
    case "countdown_timer":
      if (!numbers[0] || numbers[0] < 2) return null;
      return { from: Math.min(parseInt(numbers[0]), 10), label: key.slice(0, 3).join(" ").toLowerCase(), subtitle: "", urgent: true };
    default: return { lines: key.slice(0, 2).filter(Boolean), style: "impact" };
  }
}

function generateInfographicData(type, sentence, scriptText) {
  const numbers = getNumbers(sentence); // parses both digits and written numbers
  const words = sentence.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
  const stop = new Set(["the","and","but","for","with","this","that","have","from","they","their","your","you","was","are","were","has","had","not","can","will","would","could","should","just","also","more","very"]);
  const key = words.filter(w => !stop.has(w.toLowerCase())).slice(0, 6);
  const pct = sentence.match(/(\d+)\s*%/) || (numbers.length && sentence.toLowerCase().includes("percent") ? [null, String(numbers[0])] : null);
  const title = key.slice(0, 3).join(" ");

  // Pull nearby sentences from script for list-type infographics
  const allSentences = scriptText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 80);
  const idx = allSentences.findIndex(s => s.includes(key[0] || ""));
  const nearby = allSentences.slice(Math.max(0, idx - 1), idx + 4).filter(s => s.length > 10);

  switch (type) {
    case "number_reveal":
      // Only when sentence has an actual number
      if (!numbers[0]) return {};
      return { number_data: { value: parseFloat(numbers[0]), prefix: sentence.includes("$") ? "$" : "", suffix: pct ? "%" : "", label: key.slice(0, 3).join(" "), style: "counter" } };

    case "stat_card":
      // Only when sentence has at least one number or stat
      if (!numbers[0] && !pct) return {};
      return { chart_data: { title, stats: [{ value: pct ? pct[1] + "%" : String(numbers[0]), label: sentence.slice(0, 40) }, numbers[1] ? { value: String(numbers[1]), label: key.slice(3, 6).join(" ") } : null].filter(Boolean) } };

    case "checklist": {
      // Only for list-like sentences or when nearby sentences form a list
      const hasList = /first|second|third|step|,|include|following/.test(sentence.toLowerCase());
      const items = nearby.length >= 2 ? nearby.slice(0, 4) : hasList ? sentence.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 8).slice(0, 4) : null;
      if (!items || items.length < 2) return {};
      return { chart_data: { title, items, checked: true } };
    }

    case "progress_bar":
      // Only when sentence has multiple percentages or items to compare
      if (numbers.length < 2 && !pct) return {};
      return { chart_data: { title, bars: [
        { label: key[0] || "Primary", value: parseInt(numbers[0]) || 65, suffix: "%", color: "" },
        numbers[1] ? { label: key[1] || "Secondary", value: parseInt(numbers[1]) || 35, suffix: "%", color: "" } : null,
      ].filter(Boolean) } };

    case "timeline":
      // Only when sentence mentions years or a sequence
      if (!numbers.some(n => n > 1900 && n < 2100) && !/year|decade|century|era|period|history|since|ago/.test(sentence.toLowerCase())) return {};
      {
        const years = numbers.filter(n => n > 1900 && n < 2100);
        const yr1 = String(years[0] || "2000");
        const yr2 = String(years[1] || String(parseInt(yr1) + 10));
        const yr3 = String(years[2] || "2024");
        return { chart_data: { title, events: [
          { year: yr1, label: nearby[0]?.slice(0, 30) || "Phase one begins" },
          { year: yr2, label: nearby[1]?.slice(0, 30) || "Turning point" },
          { year: yr3, label: nearby[2]?.slice(0, 30) || "Present day" },
        ] } };
      }

    case "leaderboard":
      // Only for ranking/ordering sentences
      if (!/rank|top|best|worst|most|least|number one|first|second|third/.test(sentence.toLowerCase())) return {};
      {
        const items = nearby.length >= 2 ? nearby.slice(0, 5) : key.slice(0, 5).map(k => k);
        return { chart_data: { title, items: items.map((s, i) => ({ label: typeof s === 'string' ? s.slice(0, 25) : String(s), value: 100 - i * 15, suffix: "%" })) } };
      }

    case "horizontal_bar":
      // Only when sentence has multiple comparable quantities
      if (numbers.length < 2 && !nearby.some(s => /\d+%/.test(s))) return {};
      return { chart_data: { title, items: [
        { label: key[0] || "Category A", value: parseInt(numbers[0]) || 75, color: "" },
        { label: key[1] || "Category B", value: parseInt(numbers[1]) || 45, color: "" },
        numbers[2] ? { label: key[2] || "Category C", value: parseInt(numbers[2]) || 25, color: "" } : null,
      ].filter(Boolean), suffix: "%" } };

    case "growth_curve":
      return { chart_data: { title, points: [
        { label: "Start", value: parseInt(numbers[0]) || 10 },
        { label: "Year 5", value: (parseInt(numbers[0]) || 10) * 3 },
        { label: "Year 10", value: (parseInt(numbers[0]) || 10) * 10 },
        { label: "Year 20", value: (parseInt(numbers[0]) || 10) * 50 },
      ], suffix: "x" } };

    case "donut_chart":
      return { chart_data: { title, centerLabel: pct ? pct[1] + "%" : (numbers[0] ? `${numbers[0]}%` : key[0] || "Split"), segments: [
        { label: key[0] || "Group A", value: parseInt(pct?.[1]) || parseInt(numbers[0]) || 60, color: "" },
        { label: key[1] || "Group B", value: 100 - (parseInt(pct?.[1]) || parseInt(numbers[0]) || 60), color: "" },
      ] } };

    case "ranking_cards":
      return { chart_data: { title, items: nearby.slice(0, 5).map((s, i) => ({ label: s.slice(0, 30), value: `#${i + 1}` })) } };

    case "split_comparison":
      return { chart_data: { title, left: { label: key[0] || "Option A", value: numbers[0] ? String(numbers[0]) : "Low", description: sentence.slice(0, 40) }, right: { label: key[1] || "Option B", value: numbers[1] ? String(numbers[1]) : "High", description: sentence.slice(40, 80) } } };

    case "scale_comparison":
      return { chart_data: { title, items: [{ label: key[0] || "Small", value: parseInt(numbers[0]) || 10 }, { label: key[1] || "Large", value: parseInt(numbers[1]) || 1000 }] } };

    case "flow_diagram":
      return { chart_data: { title, nodes: nearby.slice(0, 4).map((s, i) => ({ id: i + 1, label: s.slice(0, 20) })), edges: [] } };

    case "process_flow":
      return { chart_data: { title, steps: nearby.slice(0, 4).map((s, i) => ({ number: i + 1, label: s.slice(0, 25) })) } };

    case "icon_grid":
      return { chart_data: { title, items: key.slice(0, 6).map((w, i) => ({ icon: ["💰","📈","🧠","⚡","🎯","🔥"][i] || "💡", label: w })) } };

    case "trend_arrow":
      return { animation_data: { direction: sentence.includes("decreas") || sentence.includes("down") || sentence.includes("less") ? "down" : "up", value: (numbers[0] || "73") + (pct ? "%" : ""), label: key.slice(0, 4).join(" ").toLowerCase() } };

    case "percent_fill":
      return { animation_data: { percent: parseInt(pct?.[1]) || 73, label: key.slice(0, 4).join(" ").toLowerCase() } };

    default:
      return { chart_data: { title, stats: [{ value: pct ? pct[1] + "%" : (numbers[0] ? String(numbers[0]) : key[0] || "Key Stat"), label: sentence.slice(0, 40) }] } };
  }
}

function pickIconForSentence(sentence) {
  const s = sentence.toLowerCase();
  if (/money|earn|income|profit|\$/.test(s)) return "💰";
  if (/addict|trap|hook|captive|stuck/.test(s)) return "🎣";
  if (/brain|mind|dopamine|psych/.test(s)) return "🧠";
  if (/warn|danger|risk|mistake|bad/.test(s)) return "⚠️";
  if (/phone|scroll|screen|app|social/.test(s)) return "📱";
  if (/grow|increas|rise/.test(s)) return "📈";
  if (/time|hour|minute|daily/.test(s)) return "⏰";
  if (/free|break|escape|quit|stop/.test(s)) return "🔓";
  if (/happy|better|good|peace/.test(s)) return "✨";
  return "💡";
}

// ─── PASS 2: ASSIGN VISUAL DETAILS ───────────────────────────────────────────
async function directClipWindows(windows, planChunk, scriptText, isFirst, isLast, nicheInfo, themeHints, budget, topic, theme, isHorror) {

  // Build window reference showing each window + its planned category and type
  const windowRef = windows.map((w, i) => {
    const plan = planChunk[i] || {};
    const dur = (w.end - w.start).toFixed(1);
    return `[${i}] ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s (${dur}s) | PLAN: ${plan.category || "stock"}→${plan.type || "stock"} | "${w.text}"`;
  }).join("\n");

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 20000,
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
  } catch (e) {
    console.log(chalk.yellow(`  Pass 2 chunk failed (${e.message}), using enforcePlan fallback`));
    // Return stock clips for this chunk — enforcePlan will inject animations from the plan
    return windows.map(w => makeStockClip(w, nicheInfo));
  }
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

SCRIPT CONTEXT (full):
${scriptText.slice(0, 5000)}

═══ HOW TO FILL EACH TYPE ═══

STOCK (category: stock):
- search_query: specific scene matching EXACTLY what narrator is saying — emotion + subject + context
- search_queries: if clip is 5s+, add 2-3 different angles as array ["query1","query2","query3"]
- display_style: use the PLAN display ("framed", "fullscreen", "split_left", "split_right")
- panel_icon: for split layouts — one emoji matching the moment (🚀💰🧠🔥⚡🎯💡📈🏆✅😤🎭💪😱) or null

ANIMATION (category: animation) — use the PLAN type, fill in animation_data from the exact sentence:
- "kinetic_text" → {lines:["SHORT","PUNCH"], style:"impact"} — MAX 2 lines, MAX 4 words each, EXACT words narrator says
- "count_up" → {value:NUMBER, prefix:"$", suffix:"", label:"what it is", decimals:0} — only if sentence has number ≥10
- "money_counter" → {amount:NUMBER, currency:"$", label:"what the money is"}
- "spotlight_stat" → {value:"96%", label:"exact stat description", context:"one sentence context"}
- "reaction_face" → {emoji:"🤯", label:"exact words narrator says here", style:"slam"}
- "neon_sign" → {text:"EXACT PHRASE MAX 4 WORDS", subtitle:"optional context"}
- "warning_siren" → {headline:"WARNING", body:"the specific mistake/danger from script", icon:"⚠️", color:"#ef4444"}
- "alert_banner" → {type:"danger", title:"CRITICAL MISTAKE", body:"what the mistake is", stat:"X% of people", icon:"🚨"}
- "checkmark_build" → {items:["step from script","step from script","step from script"], title:"optional"}
- "before_after" → {before:"situation before (short)", after:"situation after (short)", label:"the transformation"}
- "news_breaking" → {headline:"DRAMATIC FACT FROM SCRIPT", subtext:"one line context", ticker:"DEVELOPING"}
- "news_headline" → {outlet:"BREAKING NEWS", headline:"headline from script fact", subtext:"supporting detail", date:"year if mentioned"}
- "highlight_build" → {lines:["key phrase from script","second phrase","third phrase"], delay:0.3}
- "typewriter_reveal" → {text:"exact phrase narrator says", subtitle:"context"}
- "glitch_text" → {text:"SHOCKING CLAIM MAX 4 WORDS"}
- "trend_arrow" → {direction:"up", value:"340%", label:"what is growing/declining"}
- "percent_fill" → {percent:73, label:"what the percentage represents"}
- "loading_bar" → {label:"what the % represents", value:78, suffix:"%", color:"#ef4444", subtitle:"source or context"}
- "tweet_card" → {handle:"@relevant", text:"quote from script under 100 chars", likes:"24.3K", retweets:"8.1K"}
- "phone_screen" → {app:"instagram", notification:"notification matching script", metric:"10.2K"}
- "reddit_post" → {subreddit:"r/relevant", username:"u/throwaway", title:"post title from script topic", upvotes:"5.2K", comments:"203"}
- "instagram_post" → {username:"relevantaccount", caption:"caption from script topic", likes:"12.4K", verified:true}
- "youtube_card" → {title:"video title matching script topic", channel:"relevant channel", views:"4.2M views", duration:"14:32", badge:"TRENDING"}
- "google_search" → {query:"search query matching what narrator asks", results:[{title:"result 1",source:"Forbes"},{title:"result 2",source:"Inc.com"}]}
- "stock_ticker" → {items:[{symbol:"WEALTH",price:"$340K",change:"+34%"},...], title:""}
- "lightbulb_moment" → {text:"the insight from script (max 50 chars)", subtext:"context words"}
- "rocket_launch" → {headline:"GROWTH CONCEPT IN CAPS", subtext:"supporting phrase", stage:"launch"}
- "thumbs_up" → {type:"up" or "down", items:["key word","key word","key word"], verdict:"VERDICT IN CAPS"}
- "word_scatter" → {words:["KEY","WORDS","FROM","SENTENCE","HERE"], centerWord:"MAIN CONCEPT"}
- "compare_reveal" → {items:[{label:"OPTION A",score:"Low",description:"brief",icon:"❌"},{label:"OPTION B",score:"High",description:"brief",icon:"✅"}], title:"Compare Title", winner:1}
- "stat_comparison" → {left:{value:"96%",label:"never reach $1M",color:"#ef4444"}, right:{value:"4%",label:"achieve wealth",color:"#22c55e"}, title:"The Gap"}
- "side_by_side" → {left:"LEFT CONCEPT", right:"RIGHT CONCEPT", leftSub:"supporting stat", rightSub:"supporting stat", vs:true}
- "mindset_shift" → {old:"wrong thinking from script", new:"right thinking from script", label:"THE SHIFT"}
- "myth_fact" → {myth:"what people believe from script", fact:"the truth from script", label:"MYTH BUSTED"}
- "pro_con" → {title:"The Trade-off", pros:["benefit from script","benefit 2"], cons:["downside from script","downside 2"]}
- "conversation_bubble" → {exchanges:[{speaker:"Most People",text:"what average person thinks",side:"left"},{speaker:"The 1%",text:"what wealthy person does",side:"right"}]}
- "pull_quote" → {quote:"memorable exact phrase from script", attribution:"source if mentioned"}
- "bullet_list" → {title:"List Title", items:["item from script","item 2","item 3","item 4"], icon:"▶"}
- "step_reveal" → {title:"How To", steps:["step from script","step 2","step 3"], active:0}
- "three_points" → {title:"3 Key Points", points:[{icon:"💰",label:"LABEL",desc:"desc from script"},{icon:"⏰",label:"LABEL",desc:"desc"},{icon:"🎯",label:"LABEL",desc:"desc"}]}
- "rule_card" → {number:"Rule #1", name:"Rule Name", description:"exact rule from script", icon:"💰"}
- "score_card" → {grade:"F", label:"Financial Literacy", subtitle:"context from script", color:"#ef4444"}
- "quiz_card" → {question:"question from script", options:["A","B","C","D"], answer:INDEX, explanation:"answer explanation"}
- "portfolio_breakdown" → {title:"Portfolio Type", total:"$X", allocations:[{label:"Stocks",pct:60,color:"#22c55e"},...]}
- "roi_calculator" → {invested:"$10K", returned:"$340K", years:30, rate:"10%", label:"S&P 500 average"}
- "candlestick_chart" → {title:"Market Title", candles:[{open:100,close:150,high:160,low:90},...], labels:["year1","year2",...]}
- "wealth_ladder" → {title:"The Wealth Ladder", rungs:[{label:"Broke",desc:"paycheck to paycheck",pct:40},{label:"Stable",pct:30},{label:"Wealthy",pct:20},{label:"Rich",pct:8},{label:"Ultra Rich",pct:2}]}
- "timelapse_bar" → {start:"Age 20", end:"Age 65", current:"Age 35", label:"Your Window", currentPos:0.33, events:[{pos:0.1,label:"Start investing"},...]}
- "countdown_timer" → {from:10, label:"years until retirement", subtitle:"if you start today", urgent:true}
- "vote_bar" → {question:"survey question from script", options:[{label:"Yes",pct:78,winner:true},{label:"No",pct:22}]}
- "loading_bar" → already shown above
- "map_callout" → {location:"Country/City from script", stat:"96%", statLabel:"never reach $1M", subtitle:"population studied", emoji:"🇺🇸"}
- "stacked_bar" → {title:"Budget Breakdown", segments:[{label:"Housing",value:35,color:"#ef4444"},{label:"Food",value:15,color:"#f97316"},...]}
- "speed_meter" → {value:73, max:100, label:"Wealth Growth Rate", unit:"%", zone:"danger"}
- "big_number" → {value:"$8,400", label:"Average American Savings", context:"That's it. That's all.", prefix:"", suffix:""}
- "person_profile" → {name:"Person Name from script", role:"their role/location", stats:[{value:"$0",label:"Savings"},{value:"$23K",label:"Debt"}], outcome:"what happened to them"}

SPLIT (category: split):
- visual_type: "stock"
- display_style: from plan ("split_left" or "split_right")
- search_query: main image matching narrator's topic
- search_queries: REQUIRED — 3 different angles ["query1","query2","query3"]
- panel_type: "stat" if narrator mentions number, "icon" otherwise
- panel_stat: if number → {value:"3 hours", label:"average daily scroll"} from script
- panel_icon: emoji matching moment 🚀💰🧠🔥⚡🎯💡📈🏆✅😤🎭💪😱

INFOGRAPHIC (category: infographic) — MUST fill data or renders blank:
- "number_reveal" → number_data: {value:NUMBER, prefix:"$" or "", suffix:"%" or " hours" etc, label:"what it is", style:"counter"}
- "stat_card" → chart_data: {title:"Title", stats:[{value:"96%",label:"never reach $1M"},{value:"4%",label:"achieve wealth"}]}
- "checklist" → chart_data: {title:"Title", items:["item from script","item 2","item 3"], checked:true}
- "progress_bar" → chart_data: {title:"Title", bars:[{label:"Category",value:65,suffix:"%",color:""},...]}
- "timeline" → chart_data: {title:"Title", events:[{year:"2004",label:"event"},{year:"2010",label:"event"},...]}
- "leaderboard" → chart_data: {title:"Title", items:[{label:"item",value:100,suffix:"%"},...]}
- "horizontal_bar" → chart_data: {title:"Title", items:[{label:"A",value:75,color:""},{label:"B",value:45,color:""}], suffix:"%"}
- "growth_curve" → chart_data: {title:"Title", points:[{x:0,y:10},{x:1,y:12},{x:5,y:50},{x:10,y:200},{x:20,y:1000}]}
- "donut_chart" → chart_data: {title:"Title", segments:[{label:"A",value:60,color:""},{label:"B",value:40,color:""}]}
- "flow_diagram" → chart_data: {title:"Title", steps:["Step 1","Step 2","Step 3","Step 4"]}

IMPORTANT: Use real numbers from script. If not mentioned, invent plausible ones.

${isFirst ? `HOOK RULES (first chunk):
- Clip 0: MUST be animation — most dramatic type for opening words. NO fullscreen. NO stock.
- Clips 1-4: NO fullscreen at all. Alternate stock/animation/split.` : ""}
${isLast ? `ENDING: last clip should be checkmark_build, thumbs_up, rule_card, or pull_quote.` : ""}

RULES:
- NEVER change start_time or end_time
- Only use exact words narrator says — never invent quotes
- NEVER set panel_text — always null
- BANNED in search_query: baby,infant,child,subscribe,logo,brand${isHorror ? "" : ",knife,weapon,ghost,monster,blood,horror,killer"}

Return ONLY valid JSON array:
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
    // batch4
    "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
    "pro_con","score_card","person_profile","reddit_post","google_search",
    "three_points","stacked_bar","countdown_timer","vote_bar","map_callout",
    "news_headline","instagram_post","youtube_card","quiz_card",
    "portfolio_breakdown","roi_calculator","timelapse_bar","speed_meter",
    "candlestick_chart","conversation_bubble","loading_bar","wealth_ladder",
    "rule_card","alert_banner","big_number","mindset_shift",
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
    // batch4 — all pure graphic, no image needed
    "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
    "pro_con","score_card","person_profile","reddit_post","google_search",
    "three_points","stacked_bar","countdown_timer","vote_bar","map_callout",
    "news_headline","instagram_post","youtube_card","quiz_card",
    "portfolio_breakdown","roi_calculator","timelapse_bar","speed_meter",
    "candlestick_chart","conversation_bubble","loading_bar","wealth_ladder",
    "rule_card","alert_banner","big_number","mindset_shift",
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
    creator: ["person scrolling phone late night blue light","social media feed scrolling smartphone","young person phone screen dopamine","phone notification alert social media","person sitting alone staring at phone"],
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

    // Animation needs animation_data — validate schema, regenerate if missing or wrong shape
    const animTypes = new Set([
      "kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter",
      "glitch_text","checkmark_build","trend_arrow","stock_ticker","phone_screen",
      "tweet_card","word_scatter","social_counter","before_after","lightbulb_moment",
      "rocket_launch","news_breaking","percent_fill","compare_reveal","highlight_build",
      "count_up","neon_sign","reaction_face","thumbs_up","side_by_side","youtube_progress",
      "warning_siren","quote_overlay","overlay_caption","polaroid_stack",
      // batch4
      "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
      "pro_con","score_card","person_profile","reddit_post","google_search",
      "three_points","stacked_bar","countdown_timer","vote_bar","map_callout",
      "news_headline","instagram_post","youtube_card","quiz_card",
      "portfolio_breakdown","roi_calculator","timelapse_bar","speed_meter",
      "candlestick_chart","conversation_bubble","loading_bar","wealth_ladder",
      "rule_card","alert_banner","big_number","mindset_shift",
    ]);

    // Per-type schema checks
    const schemaOk = (type, d) => {
      if (!d) return false;
      switch(type) {
        case "compare_reveal":    return Array.isArray(d.items) && d.items.length >= 2 && d.items[0]?.label;
        case "stat_comparison":   return d.left?.value !== undefined && d.right?.value !== undefined;
        case "icon_burst":        return Array.isArray(d.icons) && d.icons.length >= 2;
        case "word_scatter":      return Array.isArray(d.words) && d.words.length >= 2;
        case "stock_ticker":      return Array.isArray(d.items) && d.items.length >= 1;
        case "checkmark_build":   return Array.isArray(d.items) && d.items.length >= 1;
        case "highlight_build":   return Array.isArray(d.lines) && d.lines.length >= 1;
        case "kinetic_text":      return Array.isArray(d.lines) && d.lines.length >= 1;
        case "before_after":      return d.before !== undefined && d.after !== undefined;
        case "mindset_shift":     return d.old !== undefined && d.new !== undefined;
        case "myth_fact":         return d.myth !== undefined && d.fact !== undefined;
        case "pro_con":           return Array.isArray(d.pros) || Array.isArray(d.cons);
        case "side_by_side":      return d.left !== undefined;
        case "warning_siren":     return d.headline !== undefined;
        case "alert_banner":      return d.title !== undefined;
        case "spotlight_stat":    return d.value !== undefined;
        case "big_number":        return d.value !== undefined;
        case "pull_quote":        return d.quote !== undefined;
        case "bullet_list":       return Array.isArray(d.items) && d.items.length >= 1;
        case "step_reveal":       return Array.isArray(d.steps) && d.steps.length >= 1;
        case "three_points":      return Array.isArray(d.points) && d.points.length >= 1;
        case "vote_bar":          return Array.isArray(d.options) && d.options.length >= 1;
        case "stacked_bar":       return Array.isArray(d.segments) && d.segments.length >= 1;
        case "candlestick_chart": return Array.isArray(d.candles) && d.candles.length >= 1;
        case "portfolio_breakdown": return Array.isArray(d.allocations) && d.allocations.length >= 1;
        case "wealth_ladder":     return Array.isArray(d.rungs) && d.rungs.length >= 1;
        case "conversation_bubble": return Array.isArray(d.exchanges) && d.exchanges.length >= 1;
        case "score_card":        return d.grade !== undefined;
        case "roi_calculator":    return d.invested !== undefined;
        case "map_callout":       return d.location !== undefined;
        case "news_headline":     return d.headline !== undefined;
        case "loading_bar":       return d.value !== undefined;
        case "countdown_timer":   return d.from !== undefined;
        case "timelapse_bar":     return d.start !== undefined;
        case "speed_meter":       return d.value !== undefined;
        case "person_profile":    return d.name !== undefined;
        case "reddit_post":       return d.title !== undefined;
        case "google_search":     return d.query !== undefined;
        case "instagram_post":    return d.caption !== undefined;
        case "youtube_card":      return d.title !== undefined;
        case "quiz_card":         return d.question !== undefined;
        case "rule_card":         return d.name !== undefined;
        default: return true;
      }
    };

    if (animTypes.has(clip.visual_type) && !schemaOk(clip.visual_type, clip.animation_data)) {
      const fallback = generateAnimationData(clip.visual_type, windows[i]?.text || "");
      if (fallback && schemaOk(clip.visual_type, fallback)) {
        clip.animation_data = fallback;
      } else {
        const words = (windows[i]?.text || "").split(/\s+/).filter(w => w.length > 3).slice(0, 2);
        clip.visual_type = "kinetic_text";
        clip.animation_data = { lines: words.length ? words.map(w => w.toUpperCase()) : ["KEY", "INSIGHT"], style: "impact" };
      }
    }

    // Infographic types need chart_data or number_data — generate real fallback data
    const needsChartData = new Set(["stat_card","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","quote_card","checklist","horizontal_bar","vertical_bar","growth_curve","ranking_cards","split_comparison","scale_comparison","funnel_chart","body_diagram","map_highlight","icon_grid","flow_diagram"]);
    const needsNumberData = new Set(["number_reveal"]);

    if (needsChartData.has(clip.visual_type) && !clip.chart_data) {
      const repaired = generateInfographicData(clip.visual_type, windows[i]?.text || "", "");
      if (repaired.chart_data) { clip.chart_data = repaired.chart_data; }
      else { clip.visual_type = "spotlight_stat"; clip.animation_data = { value: "KEY FACT", label: (windows[i]?.text || "").slice(0, 40), context: "" }; }
    }
    if (needsNumberData.has(clip.visual_type) && (!clip.number_data || typeof clip.number_data.value !== "number")) {
      const repaired = generateInfographicData("number_reveal", windows[i]?.text || "", "");
      if (repaired.number_data) { clip.number_data = repaired.number_data; }
      else { clip.visual_type = "spotlight_stat"; clip.animation_data = { value: "KEY FACT", label: (windows[i]?.text || "").slice(0, 40), context: "" }; }
    }
    // comparison needs comparison_data
    if (clip.visual_type === "comparison" && !clip.comparison_data) {
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
      // Deduplicate — only keep queries that are meaningfully different (>40% different words)
      const deduped = [];
      for (const q of clip.search_queries) {
        const qWords = new Set(q.split(/\s+/));
        const isDup = deduped.some(existing => {
          const exWords = new Set(existing.split(/\s+/));
          const shared = [...qWords].filter(w => exWords.has(w)).length;
          return shared / Math.max(qWords.size, exWords.size) > 0.6;
        });
        if (!isDup) deduped.push(q);
      }
      clip.search_queries = deduped.length >= 1 ? deduped : null;
    }

    if (graphicTypes.has(clip.visual_type)) {
      clip.imagePath = null;
      clip.isCutout = false;
    }

    // quote_overlay and overlay_caption need a search_query for background image
    if ((clip.visual_type === "quote_overlay" || clip.visual_type === "overlay_caption") && q.length < 3) {
      const niche = nicheInfo?.niche || "general";
      q = (nicheSafeQueries[niche] || nicheSafeQueries.general)[i % 5];
      clip.search_query = q;
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
      const dur = allClips[i].end_time - allClips[i].start_time; // preserve duration
      allClips[i].start_time = allClips[i - 1].end_time;
      allClips[i].end_time = allClips[i].start_time + Math.max(dur, 1.5); // min 1.5s
    }
    if (allClips[i].end_time <= allClips[i].start_time) {
      allClips[i].end_time = allClips[i].start_time + 1.5;
    }
  }

  // Break any clip longer than 12 seconds into multiple stock clips (prevents 77s clips)
  const MAX_CLIP_DUR = 10;
  const nicheFallbacks = {
    finance: ["financial growth chart professional","investor analyzing markets","wealth success lifestyle","stock market professional","business executive confident"],
    business: ["entrepreneur success workspace","confident professional achieving","startup team modern office","business growth momentum","professional meeting boardroom"],
    health: ["gym fitness workout motivated","healthy lifestyle active","sports performance athletic","wellness outdoor nature","fit person exercising"],
    horror: ["dark atmospheric night","mysterious shadowy","abandoned eerie","foggy dark","suspenseful shadow"],
    true_crime: ["detective investigation","evidence analysis","courtroom justice","newspaper headline","investigation board"],
    general: ["professional modern aspirational","person thoughtful confident","city skyline panoramic","nature peaceful","team collaboration success"],
  };
  const fallbacks = nicheFallbacks[nicheInfo?.niche] || nicheFallbacks.general;

  const splitLong = [];
  for (const clip of allClips) {
    const dur = clip.end_time - clip.start_time;
    if (dur <= MAX_CLIP_DUR) {
      splitLong.push(clip);
    } else {
      // Split into stock chunks with varied queries — never repeat same animation type
      let t = clip.start_time;
      let chunkIdx = 0;
      while (t < clip.end_time - 1) {
        const chunkEnd = Math.min(t + MAX_CLIP_DUR, clip.end_time);
        if (chunkEnd - t < 1.5) break; // skip tiny tail clips
        const isFirst = chunkIdx === 0;
        // First chunk keeps original type, subsequent chunks become stock with varied queries
        if (isFirst && clip.visual_type !== "stock") {
          splitLong.push({ ...clip, start_time: t, end_time: chunkEnd });
        } else {
          splitLong.push({
            ...clip,
            start_time: t,
            end_time: chunkEnd,
            visual_type: "stock",
            display_style: "framed",
            search_query: fallbacks[(Math.floor(t / MAX_CLIP_DUR)) % fallbacks.length],
            search_queries: null,
            animation_data: null,
            chart_data: null,
            number_data: null,
          });
        }
        t = chunkEnd;
        chunkIdx++;
      }
    }
  }
  allClips.length = 0;
  allClips.push(...splitLong);

  // No same type twice in a row — runs AFTER splitter so split chunks are also checked
  let lastType = "";
  allClips.forEach(clip => {
    if (clip.visual_type === "stock") { lastType = "stock"; return; }
    if (clip.visual_type === lastType) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
      clip.animation_data = null;
      clip.chart_data = null;
    }
    lastType = clip.visual_type;
  });
  const maxFullscreen = Math.max(2, Math.ceil((totalDuration / 60) * 4));
  let fullscreenCount = 0;
  allClips.forEach(clip => {
    if (clip.display_style === "fullscreen" || clip.display_style === "fullscreen_zoom") {
      fullscreenCount++;
      if (fullscreenCount > maxFullscreen) clip.display_style = "framed";
    }
  });

  // Hook protection: no fullscreen in first 5 clips, no data infographics in first 5s
  const infraTypes = new Set(["number_reveal","line_chart","donut_chart","progress_bar","timeline","leaderboard","process_flow","stat_card","horizontal_bar","vertical_bar","growth_curve","ranking_cards","split_comparison","scale_comparison","funnel_chart","body_diagram","map_highlight","icon_grid","flow_diagram","checklist","quote_card"]);
  allClips.forEach((clip, idx) => {
    // No fullscreen in first 5 clips
    if (idx < 5 && (clip.display_style === "fullscreen" || clip.display_style === "fullscreen_zoom")) {
      clip.display_style = "framed";
    }
    // No data infographics in first 5 seconds
    if (clip.start_time < 5 && infraTypes.has(clip.visual_type)) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
      clip.search_query = clip.search_query || "dramatic cinematic opening";
    }
  });

  // Break up runs of 3+ consecutive stock clips by inserting kinetic_text
  {
    let stockRun = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "stock") {
        stockRun++;
        if (stockRun >= 3 && allClips[i].end_time - allClips[i].start_time >= 3.5) {
          // Convert this stock clip to kinetic_text using its search_query words
          const q = allClips[i].search_query || "";
          const words = q.split(/\s+/).filter(w => w.length > 3 && !/^(and|the|for|with|from|into)$/.test(w)).slice(0, 2).map(w => w.toUpperCase());
          if (words.length >= 2) {
            allClips[i].visual_type = "kinetic_text";
            allClips[i].animation_data = { lines: words, style: "impact" };
            allClips[i].imagePath = null;
            stockRun = 0;
          }
        }
      } else {
        stockRun = 0;
      }
    }
  }

  // Inject interrupt cards every 90s — only into stock clips, never over animations
  const facts = extractFacts(scriptText);
  if (facts.length > 0) {
    for (let t = 90; t < totalDuration - 15; t += 90) {
      // Find a stock clip that fully contains this moment (start <= t, end >= t+5)
      const host = allClips.find(c =>
        c.start_time <= t &&
        c.end_time >= t + 5 &&
        c.visual_type === "stock" // only inject over stock, never over animations
      );
      if (host) {
        const factIdx = Math.floor(t / 90) - 1;
        if (factIdx < facts.length) {
          allClips.push({
            start_time: t, end_time: t + 4, visual_type: "interrupt_card", display_style: "framed",
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
