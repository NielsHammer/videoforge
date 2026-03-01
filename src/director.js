import axios from "axios";
import chalk from "chalk";

/**
 * Director v2: Splits long scripts into chunks to avoid token limits.
 * Each chunk gets its own storyboard, then they're merged.
 */
export async function createStoryboard(scriptText, wordTimestamps, totalDuration) {
  const CHUNK_SECONDS = 120;

  if (totalDuration <= 180) {
    return await processChunk(scriptText, wordTimestamps, 0, totalDuration);
  }

  // Split word timestamps into chunks
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

  const allClips = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(chalk.gray(`  Directing chunk ${i + 1}/${chunks.length} (${chunk.startTime.toFixed(0)}s-${chunk.endTime.toFixed(0)}s)...`));
    const chunkClips = await processChunk(scriptText, chunk.words, chunk.startTime, chunk.endTime);
    allClips.push(...chunkClips);
  }

  return allClips;
}

async function processChunk(scriptText, chunkWords, startTime, endTime) {
  const wordRef = chunkWords.map((w) => {
    const idx = w.originalIndex !== undefined ? w.originalIndex : chunkWords.indexOf(w);
    return `[${idx}] "${w.word}" ${w.start.toFixed(2)}s`;
  }).join("\n");

  const duration = endTime - startTime;

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `You are a video director. Create a storyboard for a ${duration.toFixed(0)}s segment (${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s) of a YouTube video.

WORD TIMING:
${wordRef}

FULL SCRIPT (for context):
${scriptText.slice(0, 3000)}

RULES:
- Each clip: 2-5 seconds, must cover ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s with NO gaps
- subtitle_words: array of word indices spoken during this clip
- ALTERNATE display styles, never same twice in a row

VISUAL TYPES (use the right one):
"stock" — search_query (3-5 words for Pexels), display_style: cutout_right/cutout_left/fullscreen/framed/fullscreen_zoom/layered. Cutout = ONLY person images, aim 40%.
"ai_image" — AI-generated image for scenes where stock photos won't work (abstract concepts, futuristic, dramatic visualizations). Set ai_prompt (detailed visual description, 15-30 words). display_style same as stock. Use for 8-12 clips per video MAX.
"number_reveal" — MUST USE when narrator says a number ($, %, amounts). number_data: {value: 260000, prefix: "$", suffix: "", label: "passive income", style: "counter|gauge|bars|spotlight|ticker|impact"}. VALUE MUST BE A NUMBER. VARY THE STYLE — never use same style twice in a row. Use "impact" for shocking numbers, "gauge" for percentages, "ticker" for financial amounts, "bars" for growth metrics, "spotlight" for key reveals, "counter" as fallback.
"comparison" — for contrasts. comparison_data: {items: [{label, value, display, color}]}. Values MUST be numbers.
"section_break" — numbered title card. section_data: {number, title}
"text_flash" — max 5 words, use MAXIMUM 3-4 per entire video. Very sparingly.

AI IMAGE PROMPTS: When using "ai_image", the ai_prompt MUST directly relate to what the narrator is saying. NOT abstract art. Think "what would a human editor put on screen here?" Examples:
- Narrator says "compound interest": ai_prompt = "calculator showing exponential growth chart on modern desk, soft lighting"
- Narrator says "retirement beach": ai_prompt = "elderly couple relaxing on tropical beach at sunset, happy retirement"
- BAD: "glowing bridge over chasm" when talking about dividends — makes NO sense

#1 RULE: Any specific number in narration = number_reveal or comparison, NEVER stock.

BANNED search terms: baby, infant, child, toddler, kid, children, subscribe, button, icon, logo

Return ONLY a JSON array, no markdown, no backticks:
[{"start_time":${startTime.toFixed(1)},"end_time":0,"visual_type":"","display_style":"","search_query":"","subtitle_words":[],"number_data":null,"comparison_data":null,"section_data":null,"text_flash_text":null}]`,
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
  
  // Strip markdown fences
  str = str.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
  
  // Try direct parse
  try { return JSON.parse(str); } catch {}
  
  // Try extracting array
  const m = str.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  
  // Fix truncated JSON — find last complete object
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
  const validStyles = ["cutout_right","cutout_left","fullscreen","framed","fullscreen_zoom","layered"];
  const validTypes = ["stock","number_reveal","comparison","section_break","text_flash","ai_image"];

  let lastStyle = "";
  clips.forEach((clip) => {
    if (!validTypes.includes(clip.visual_type)) clip.visual_type = "stock";
    if (!clip.display_style || !validStyles.includes(clip.display_style)) clip.display_style = "framed";
    if (!clip.search_query) clip.search_query = "cinematic landscape";
    
    let q = clip.search_query;
    banned.forEach(b => { q = q.replace(new RegExp(`\\b${b}\\b`, "gi"), "").trim(); });
    if (q.length < 3) q = "cinematic landscape";
    clip.search_query = q;

    if (!clip.subtitle_words) clip.subtitle_words = [];
    if (clip.start_time === undefined || clip.start_time === null) clip.start_time = startTime;
    if (!clip.end_time) clip.end_time = clip.start_time + 3;

    clip.start_time = Math.max(clip.start_time, startTime);
    clip.end_time = Math.min(clip.end_time, endTime);

    if (clip.visual_type === "stock") {
      if (clip.display_style === lastStyle) {
        const alts = validStyles.filter(v => v !== lastStyle);
        clip.display_style = alts[Math.floor(Math.random() * alts.length)];
      }
      lastStyle = clip.display_style;
    }
  });

  return clips;
}
