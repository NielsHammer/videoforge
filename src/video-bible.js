import axios from "axios";
import chalk from "chalk";

// ─── VIDEO BIBLE ─────────────────────────────────────────────────────────────
// Runs once before any storyboard decisions are made.
// Reads the full script and produces a "bible" — rules every downstream
// decision must follow. Prevents medieval history videos from showing
// Ferraris, finance topics from showing unrelated stock photos, etc.

export async function analyzeScriptContext(scriptText, topic, niche, orderBrief = {}) {
  const prompt = `You are a YouTube video director analyzing a script before production begins.
Read this script carefully and produce a VIDEO BIBLE — a strict set of rules that every visual decision in this video must follow.

TOPIC: "${topic}"
NICHE: ${niche || "auto-detect"}
SCRIPT:
${scriptText.slice(0, 15000)}${scriptText.length > 15000 ? "\n[...script continues — " + Math.round((scriptText.length - 15000) / 5) + " more words...]" : ""}

Analyze the script and return ONLY valid JSON (no markdown, no preamble):

{
  "era": "modern|historical|ancient|futuristic|timeless",
  "era_specific": "exact time period if applicable, e.g. 'Medieval Europe 1000-1400 AD' or 'Modern USA 2020s'",
  "setting": "where this video takes place conceptually, e.g. 'Wall Street and corporate boardrooms' or 'Medieval castles and villages'",
  "visual_tone": "cinematic_dark|bright_energetic|clean_minimal|gritty_raw|luxury_polished|documentary_neutral",
  "banned_visuals": ["list of things that must NEVER appear", "e.g. 'modern cars' for historical", "e.g. 'generic stock office' for authentic topics"],
  "required_visual_style": "1-2 sentences describing exactly what images should look like for this specific video",
  "image_search_prefix": "2-4 words to prepend to ALL image searches to keep them contextually accurate, e.g. 'medieval' or '1920s vintage' or 'modern minimalist'",
  "banned_components": ["list of components that make no sense here", "e.g. 'instagram_post' for medieval history", "e.g. 'candlestick_chart' for cooking videos"],
  "preferred_components": ["list of 5-8 components that fit perfectly", "e.g. 'timeline', 'map_callout', 'person_profile' for history"],
  "infographic_opportunities": [
    {
      "moment": "brief quote from script where an infographic would be perfect",
      "component": "component type to use",
      "data_hint": "what data to show, pulled directly from the script"
    }
  ],
  "key_visual_moments": [
    {
      "moment": "brief quote from script",
      "visual_description": "exactly what image to show here",
      "search_query": "exact search query to find this image"
    }
  ],
  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}

Be extremely specific. A medieval history video should have banned_visuals like ["modern cars", "contemporary offices", "smartphones", "stock market charts", "modern cities"].
A finance video about crypto should have image_search_prefix like "cryptocurrency blockchain" not generic "business professional".
Pull infographic_opportunities directly from actual numbers in the script — real data, not made up.`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 45000,
      }
    );

    const text = response.data.content[0].text.trim()
      .replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
    const bible = JSON.parse(text);
    console.log(chalk.cyan(`  📖 Video Bible: ${bible.era} era | ${bible.visual_tone} tone | ${bible.banned_visuals?.length || 0} banned visuals`));
    if (bible.image_search_prefix) {
      console.log(chalk.cyan(`  🔍 Image prefix: "${bible.image_search_prefix}"`));
    }
    return bible;
  } catch (e) {
    console.log(chalk.yellow(`  ⚠️  Video bible failed (${e.message}) — using defaults`));
    return {
      era: "modern",
      era_specific: "",
      visual_tone: "clean_minimal",
      banned_visuals: [],
      required_visual_style: `Relevant imagery for ${topic}`,
      image_search_prefix: "",
      banned_components: [],
      preferred_components: [],
      infographic_opportunities: [],
      key_visual_moments: [],
      content_warnings: [],
    };
  }
}
