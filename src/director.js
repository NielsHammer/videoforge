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

  const prompt = `You are planning a YouTube video storyboard. Read this script and assign a visual category to each clip window.

VIDEO TOPIC: "${topic}"
NICHE: ${nicheInfo.niche} | THEME: "${theme}"
NICHE STYLE: ${budget.label}
THEME ANIMATIONS TO PREFER: ${themeHints.prefer.join(", ")}

TARGET MIX for ${total} total clips:
- ${stockTarget} clips → "stock" (framed images only — fullscreen BANNED except clips after position 5)
- ${animTarget} clips → "animation" (kinetic_text, reaction_face, count_up, neon_sign, etc.)
- ${splitTarget} clips → "split" (split_left or split_right with panel icon)
- ${infraTarget} clips → "infographic" (number_reveal, checklist, timeline, stat_card, etc.)

CLIP WINDOWS:
${windowList}

CLASSIFICATION RULES:
- "stock": narrator is telling a story, giving context, describing a scene → display: "framed" ALWAYS (no fullscreen)
- "animation": narrator makes a KEY STATEMENT — shocking stat, pivotal insight, emotional peak, call to action
  → Choose the BEST fitting type from this full list:
  IMPACT TEXT: kinetic_text (punchy 2-4 words), neon_sign (bold glowing claim), glitch_text (shocking tech moment), typewriter_reveal (quote or phrase types out)
  STATS/NUMBERS: spotlight_stat (single dramatic %), count_up (number counts up), money_counter ($ amount), percent_fill (circle fills), trend_arrow (up/down direction)
  REACTIONS: reaction_face (emoji slam - 🤯😱), warning_siren (danger/mistake), news_breaking (dramatic reveal), lightbulb_moment (idea/insight)
  LISTS/STEPS: checkmark_build (steps building up), highlight_build (key phrases highlighted), icon_burst (icons radiating)
  COMPARISONS: before_after (transformation), compare_reveal (side by side), side_by_side (two concepts)
  SOCIAL/PLATFORM: tweet_card (quote as tweet), phone_screen (phone notification), stock_ticker (financial ticker)
  EMOTIONAL: rocket_launch (growth/momentum), thumbs_up (verdict/recommendation), word_scatter (concept cloud)
  → From theme preferred list also consider: ${themeHints.prefer.slice(0, 4).join(", ")}
- "split": narrator describes a person, place, or situation — good for storytelling clips → display: "split_left" or "split_right"
- "infographic": narrator cites specific data, statistics, or a list → choose best type:
  SINGLE STAT: number_reveal (dramatic number), spotlight_stat (% with context)
  CARDS: stat_card (2-3 stats side by side), compare_reveal (two options compared)
  LISTS: checklist (steps/items with checkmarks), leaderboard (ranked items), ranking_cards (top items)
  CHARTS: progress_bar (bars showing %s), horizontal_bar (comparison bars), line_chart (trend over time), growth_curve (exponential growth), donut_chart (pie breakdown)
  FLOWS: timeline (events in sequence), process_flow (steps in a process), flow_diagram (A→B→C)
  OTHER: percent_fill (single % circle), trend_arrow (direction of change), icon_grid (concepts as icons)

CRITICAL DISTRIBUTION RULES — these override everything:
1. FIRST 3 CLIPS (positions 0,1,2): MUST be "animation" or "stock" with display "framed". NEVER "fullscreen". NEVER "split". The hook must hit immediately.
2. Clip 0 MUST be "animation" — this is the hook. Pick the most dramatic animation for the opening line.
3. SPREAD: animations and infographics must appear throughout the WHOLE video. In every group of 5 consecutive clips, at least 2 must be non-stock (animation, split, or infographic).
4. DO NOT bunch all animations at the end. Distribute them evenly — early, middle, AND late.
5. "fullscreen" display is only allowed for positions 4+ and max 2 times total in the entire video.

Example good pattern for 10 clips: animation, stock, split, stock, animation, infographic, stock, split, animation, infographic
Example BAD pattern: stock, stock, stock, stock, stock, stock, stock, animation, infographic, infographic ← DON'T DO THIS

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
  ];
  const infraRotation = [
    "stat_card","number_reveal","checklist","progress_bar","timeline",
    "leaderboard","horizontal_bar","growth_curve","donut_chart","ranking_cards",
    "percent_fill","trend_arrow","flow_diagram","process_flow","icon_grid",
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
    case "kinetic_text": return key.length ? { lines: key.slice(0, 2), style: "impact" } : null;
    case "spotlight_stat":
      if (pct) return { value: pct[1] + "%", label: key.slice(0, 3).join(" ").toLowerCase(), context: "" };
      if (money) return { value: money[0], label: key.slice(0, 3).join(" ").toLowerCase(), context: "" };
      if (numbers[0]) return { value: sentence.toLowerCase().includes("percent") ? numbers[0] + "%" : String(numbers[0]), label: key.slice(0, 3).join(" ").toLowerCase(), context: "" };
      return { value: key[0] || "FACT", label: sentence.slice(0, 40), context: "" };
    case "count_up":
      // Only for sentences with actual meaningful numbers (>=5 to avoid "one of the" type sentences)
      if (!numbers[0] || numbers[0] < 5) return null;
      return { value: parseFloat(numbers[0]) || 73, prefix: money ? "$" : "", suffix: pct ? "%" : "", label: key.slice(0, 3).join(" ").toLowerCase(), decimals: 0 };
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
      // Only for dramatic reveals or shocking stats
      if (!numbers[0] && !/reveal|shocking|truth|secret|discover|expose|hidden/.test(sentence.toLowerCase())) return null;
      return { headline: sentence.slice(0, 50).toUpperCase(), subtext: sentence.slice(50, 90), ticker: "DEVELOPING STORY • MORE TO COME" };
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
      return { chart_data: { title, events: [
        { year: String(numbers.find(n => n > 1900 && n < 2100) || "2000"), label: nearby[0]?.slice(0, 30) || "Phase one begins" },
        { year: String(numbers.find(n => n > 1900 && n < 2100) ? numbers[numbers.findIndex(n => n > 1900 && n < 2100) + 1] || "2010" : "2010"), label: nearby[1]?.slice(0, 30) || "Turning point" },
        { year: "2024", label: nearby[2]?.slice(0, 30) || "Present day" },
      ] } };

    case "leaderboard":
      // Only for ranking/ordering sentences
      if (!/rank|top|best|worst|most|least|number one|first|second|third/.test(sentence.toLowerCase())) return {};
      return { chart_data: { title, items: nearby.slice(0, 5).map((s, i) => ({ label: s.slice(0, 25), value: 100 - i * 15, suffix: "%" })) } };

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
      return { chart_data: { title, centerLabel: numbers[0] ? `${numbers[0]}%` : "73%", segments: [
        { label: key[0] || "Group A", value: parseInt(numbers[0]) || 73, color: "" },
        { label: key[1] || "Group B", value: 100 - (parseInt(numbers[0]) || 73), color: "" },
      ] } };

    case "ranking_cards":
      return { chart_data: { title, items: nearby.slice(0, 5).map((s, i) => ({ label: s.slice(0, 30), value: `#${i + 1}` })) } };

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
      return { chart_data: { title, stats: [{ value: numbers[0] || "73%", label: sentence.slice(0, 40) }] } };
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
- "kinetic_text" → animation_data: {lines:["SHORT","PUNCH"], style:"impact"} — MAX 2 lines, MAX 4 words each. Extract the most impactful 2-4 words from the sentence. NOT full sentences. WRONG: ["CAN'T STOP SCROLLING","SOCIAL MEDIA WAS USING HER"] — too long. RIGHT: ["SOCIAL MEDIA","USING YOU"] — punchy.
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
- search_query: main image matching what narrator is saying (this goes on the big side)
- search_queries: REQUIRED for splits — always provide 3 different queries. The extra images fill the right panel as smaller frames appearing one at a time. Make each query a different visual angle on the same moment. Example: ["woman scrolling phone bedroom night", "close up phone screen social media feed", "tired person blue screen glow dark room"]
- panel_type: "stat" if narrator mentions a number/fact right now, "icon" otherwise
- panel_stat: if narrator says a number → {value: "3 hours", label: "average daily scroll"} — exact from script
- panel_icon: if no number → one emoji matching the moment (🚀💰🧠🔥⚡🎯💡📈🏆✅😤🎭💪😱)

INFOGRAPHIC (category: infographic) — CRITICAL: you MUST fill in the data field or it renders blank.
- "number_reveal" → set number_data field: {"value":2,"prefix":"","suffix":" hours","label":"average daily scroll","style":"counter"} — value must be a NUMBER
- "stat_card" → set chart_data field: {"title":"Screen Time Reality","stats":[{"value":"2.5 hours","label":"average daily use"},{"value":"87%","label":"check phone first thing"}]}
- "timeline" → set chart_data field: {"title":"How It Started","events":[{"year":"2004","label":"Facebook launched"},{"year":"2010","label":"Instagram created"},{"year":"2016","label":"TikTok born"}]}
- "checklist" → set chart_data field: {"title":"Signs You're Addicted","items":["Check phone within 5 minutes of waking","Scroll during conversations","Feel anxious without it"],"checked":true}
- "progress_bar" → set chart_data field: {"title":"Where Your Time Goes","bars":[{"label":"Social Media","value":35,"suffix":"%","color":""},{"label":"Sleep","value":33,"suffix":"%","color":""},{"label":"Work","value":25,"suffix":"%","color":""}]}
- "trend_arrow" → set animation_data field: {"direction":"up","value":"73%","label":"increase in anxiety since 2010"}
- "percent_fill" → set animation_data field: {"percent":73,"label":"of teens feel worse after using social media"}

IMPORTANT: Use real numbers from the script when available. If the script doesn't mention a specific number, invent a plausible one that matches the topic — the point is to VISUALIZE the idea, not quote precisely.

${isFirst ? `FIRST 15 SECONDS — HOOK (critical, audience decides here whether to keep watching):
- Clip 0: MUST be an animation — kinetic_text, reaction_face, neon_sign, or spotlight_stat using the most shocking words from the first sentence. NO fullscreen. NO stock image.
- Clips 1-4: alternate between framed stock and animations/splits. NO fullscreen at all in first 15 seconds.` : ""}
${isLast ? `LAST CLIP: end with checkmark_build, thumbs_up, or quote_overlay — something memorable.` : ""}

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
    const animTypes = new Set(["kinetic_text","spotlight_stat","icon_burst","typewriter_reveal","money_counter","glitch_text","checkmark_build","trend_arrow","stock_ticker","phone_screen","tweet_card","word_scatter","social_counter","before_after","lightbulb_moment","rocket_launch","news_breaking","percent_fill","compare_reveal","highlight_build","count_up","neon_sign","reaction_face","thumbs_up","side_by_side","youtube_progress","warning_siren","quote_overlay","overlay_caption","polaroid_stack"]);

    // Per-type schema checks — catches wrong-format data that renders blank
    const schemaOk = (type, d) => {
      if (!d) return false;
      switch(type) {
        case "compare_reveal": return Array.isArray(d.items) && d.items.length >= 2 && d.items[0]?.label;
        case "icon_burst":     return Array.isArray(d.icons) && d.icons.length >= 2;
        case "word_scatter":   return Array.isArray(d.words) && d.words.length >= 2;
        case "stock_ticker":   return Array.isArray(d.items) && d.items.length >= 1;
        case "checkmark_build": return Array.isArray(d.items) && d.items.length >= 1;
        case "highlight_build": return Array.isArray(d.lines) && d.lines.length >= 1;
        case "kinetic_text":   return Array.isArray(d.lines) && d.lines.length >= 1;
        case "before_after":   return d.before !== undefined && d.after !== undefined;
        case "side_by_side":   return d.left !== undefined;
        case "warning_siren":  return d.headline !== undefined;
        case "spotlight_stat": return d.value !== undefined;
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
      else { clip.visual_type = "spotlight_stat"; clip.animation_data = { value: key?.[0] || "KEY FACT", label: (windows[i]?.text || "").slice(0, 40), context: "" }; }
    }
    if (needsNumberData.has(clip.visual_type) && (!clip.number_data || typeof clip.number_data.value !== "number")) {
      const repaired = generateInfographicData("number_reveal", windows[i]?.text || "", "");
      if (repaired.number_data) { clip.number_data = repaired.number_data; }
      else { clip.visual_type = "spotlight_stat"; clip.animation_data = { value: key?.[0] || "KEY FACT", label: (windows[i]?.text || "").slice(0, 40), context: "" }; }
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
      if (clip.search_queries.length === 0) clip.search_queries = null;
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

  // Fullscreen cap: max 4 per minute
  const maxFullscreen = Math.max(2, Math.ceil((totalDuration / 60) * 4));
  let fullscreenCount = 0;
  allClips.forEach(clip => {
    if (clip.display_style === "fullscreen" || clip.display_style === "fullscreen_zoom") {
      fullscreenCount++;
      if (fullscreenCount > maxFullscreen) clip.display_style = "framed";
    }
  });

  // No same type twice in a row (but allow same type to repeat with stock in between)
  let lastType = "";
  allClips.forEach(clip => {
    if (clip.visual_type === "stock") { lastType = "stock"; return; }
    if (clip.visual_type === lastType) {
      clip.visual_type = "stock";
      clip.display_style = "framed";
    }
    lastType = clip.visual_type;
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
