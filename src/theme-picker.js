import axios from "axios";

/**
 * Claude picks the best visual theme for the video topic.
 * Much smarter than keyword regex — understands context and nuance.
 */
export async function pickThemeForTopic(topic, scriptText) {
  const THEME_DESCRIPTIONS = `
blue_grid — Deep blue circuit-board grid. Best for: finance, business, investing, stocks, economics, banking, corporate
green_matrix — Bright green on black, Matrix-style. Best for: money/wealth growth, investing returns, side hustles, make money online
gold_luxury — Rich gold and black. Best for: luxury lifestyle, wealth, millionaires/billionaires, celebrities net worth, gold, premium brands, Ferrari, Rolex
red_energy — Bold red and crimson. Best for: motivation, hustle, fitness intensity, urgency, sports, competition, adrenaline
purple_cosmic — Deep purple and violet. Best for: space, universe, astronomy, cosmos, black holes, NASA, mysteries of the universe
teal_ocean — Teal and aqua blues. Best for: health, wellness, medical, nutrition, diet, calm, nature, ocean, biology
orange_fire — Warm orange and amber. Best for: food, cooking, recipes, side hustles, energy, entrepreneurship, passion
pink_neon — Vibrant pink and magenta. Best for: social media, TikTok, Instagram, pop culture, influencers, viral trends, beauty
ice_blue — Cool pale blue and white. Best for: science, technology, AI, machine learning, research, data, cold/clinical topics
forest_green — Deep emerald green. Best for: nature, wildlife, animals, travel, environment, forests, adventure, exploration
sunset_warm — Warm gradient orange-to-red. Best for: self-improvement, motivation, personal growth, daily habits, mindset, morning routines
midnight_blue — Very dark navy blue with silver. Best for: true crime, mysteries, cold cases, detective stories, unsolved crimes, suspense
electric_cyan — Bright neon cyan on dark. Best for: AI tools, tech reviews, futurism, robots, automation, cutting-edge technology
earth_brown — Brown, tan and terracotta. Best for: ancient history, archaeology, mythology, civilizations, medieval, Roman/Greek/Egyptian era
blood_red — Dark red and near-black. Best for: horror, scary stories, paranormal, haunted, demons, serial killers, dark true crime
royal_purple — Rich purple with gold accents. Best for: philosophy, stoicism, psychology, meditation, consciousness, wisdom, ancient thinkers
neon_green — Bright green on black. Best for: gaming, esports, hacking, cyberpunk, cryptocurrency, blockchain, tech underground
rose_gold — Pink-gold and cream. Best for: lifestyle, beauty, recipes, relationships, feminine topics, cooking, home decor
steel_grey — Silver and grey tones. Best for: cars, engineering, military hardware, weapons, mechanics, industrial, architecture
dark_horror — Very dark red and black. Best for: extreme horror, gore, demons, supernatural evil, very dark crime
aurora — Multi-color shifting. Best for: general interest, top 10 lists, varied topics, when nothing else fits perfectly
`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [{
          role: "user",
          content: `You are picking a visual background theme for a YouTube video.

VIDEO TOPIC: "${topic}"
SCRIPT PREVIEW: "${(scriptText || "").slice(0, 300)}"

AVAILABLE THEMES:
${THEME_DESCRIPTIONS}

Pick the SINGLE best theme for this video. Consider the topic mood, era, and visual feel.
Reply with ONLY the theme name (e.g. "earth_brown"), nothing else.`
        }]
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 15000,
      }
    );

    const picked = response.data.content[0].text.trim().toLowerCase().replace(/[^a-z_]/g, "");

    const validThemes = ["blue_grid","green_matrix","gold_luxury","red_energy","purple_cosmic","teal_ocean","orange_fire","pink_neon","ice_blue","forest_green","sunset_warm","midnight_blue","electric_cyan","earth_brown","blood_red","royal_purple","neon_green","rose_gold","steel_grey","dark_horror","aurora"];

    if (validThemes.includes(picked)) {
      console.log(`  🎨 Claude picked theme: ${picked}`);
      return picked;
    }

    console.log(`  🎨 Claude returned invalid theme "${picked}", using fallback`);
    return null;
  } catch (err) {
    console.log(`  🎨 Theme pick failed (${err.message}), using fallback`);
    return null;
  }
}
