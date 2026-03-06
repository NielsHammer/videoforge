import axios from "axios";
import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";

/**
 * Script Generator v30 — TWO MODES
 * 
 * Mode A: "infographic" — Data-heavy scripts for finance, health, science, business.
 *   Every paragraph packed with numbers, stats, percentages, comparisons.
 *   The director will naturally use 40-60% infographics because the data is there.
 * 
 * Mode B: "visual" — Scene-driven scripts for horror, travel, entertainment, celebrity, food, etc.
 *   Paints vivid scenes, describes visuals, tells stories with imagery.
 *   The director will naturally use 70-80% images because there's no data to chart.
 * 
 * Auto-detection picks the right mode based on topic keywords.
 * CLI override: --mode infographic  or  --mode visual
 */

// Keywords that trigger each mode
const INFOGRAPHIC_KEYWORDS = [
  "invest", "stock", "dividend", "portfolio", "compound", "index fund", "etf", "bond", "market",
  "finance", "money", "broke", "salary", "budget", "saving", "debt", "wealth", "net worth",
  "health", "medical", "body", "nutrition", "diet", "exercise", "fitness", "wellness", "vitamin",
  "sugar", "calorie", "protein", "cholesterol", "blood pressure", "heart rate",
  "science", "physics", "chemistry", "biology", "experiment", "research", "study", "data",
  "business", "startup", "revenue", "profit", "growth", "marketing", "conversion",
  "real estate", "mortgage", "rent", "property", "housing",
  "crypto", "bitcoin", "blockchain", "ethereum",
  "side hustle", "passive income", "make money", "freelance", "entrepreneur",
  "psychology", "brain", "cognitive", "bias", "behavior", "habit",
  "productivity", "sleep", "routine", "dopamine", "cortisol",
  "comparison", "versus", "vs", "better than", "worse than",
  "top 10", "top 5", "ranking", "ranked", "best", "worst",
];

const VISUAL_KEYWORDS = [
  "horror", "scary", "creepy", "haunted", "ghost", "demon", "paranormal", "murder",
  "true crime", "crime", "serial killer", "cold case", "detective", "investigation",
  "travel", "destination", "country", "tourism", "adventure", "explore", "vacation", "visit", "places", "city", "cities", "beach", "island",
  "celebrity", "actor", "singer", "rapper", "influencer", "famous", "biography",
  "movie", "film", "tv show", "netflix", "series", "recap", "review", "box office",
  "entertainment", "gaming", "video game", "anime", "manga",
  "food", "cooking", "recipe", "restaurant", "cuisine", "chef",
  "nature", "animal", "wildlife", "ocean", "mountain", "forest",
  "mystery", "unsolved", "conspiracy", "legend", "myth", "folklore",
  "sports", "nba", "nfl", "soccer", "football", "basketball", "athlete",
  "history", "ancient", "medieval", "empire", "war", "civilization",
  "luxury", "supercar", "mansion", "yacht", "rolex", "ferrari",
  "story time", "reddit", "askreddit",
];

function detectMode(topic) {
  const lower = topic.toLowerCase();
  
  let infraScore = 0;
  let visualScore = 0;
  
  for (const kw of INFOGRAPHIC_KEYWORDS) {
    if (lower.includes(kw)) infraScore++;
  }
  for (const kw of VISUAL_KEYWORDS) {
    if (lower.includes(kw)) visualScore++;
  }
  
  // Visual wins ties — images are safer default than forcing bad infographics
  if (visualScore >= infraScore) return "visual";
  return "infographic";
}

// ═══════════════════════════════════════════════════
// INFOGRAPHIC MODE PROMPT — data-heavy, number-rich
// ═══════════════════════════════════════════════════
function buildInfographicPrompt(topic, duration, style) {
  return `You are a top YouTube scriptwriter for faceless channels that get millions of views. The current year is 2026. Write a ${duration} minute narration script about:

"${topic}"

TONE: ${style}
${style === "humor" ? "Use witty observations, unexpected comparisons, and comedic timing. Be funny but still informative." : ""}
${style === "serious" ? "Be authoritative and data-driven. Use precise language and expert tone." : ""}
${style === "dramatic" ? "Build tension and suspense. Use cliffhangers and dramatic reveals." : ""}
${style === "engaging" ? "Be conversational and energetic. Mix facts with relatable examples." : ""}

THIS IS AN INFOGRAPHIC-STYLE VIDEO. Your script will be paired with animated data visualizations, charts, and number animations. You MUST write to CREATE opportunities for these visuals.

STRUCTURE (critical for retention):
1. HOOK (first 5-8 seconds):
   Sentence 1: A SHOCKING NUMBER. Start with the most jaw-dropping statistic.
   Example: "Ninety-five percent of people will never retire comfortably."
   Sentence 2: A COMPARISON that makes the number hit harder.
   Example: "That means only five out of every hundred people you know will have enough money to stop working."
   Sentence 3: THE PROMISE — what the viewer will learn.
   Example: "But there are exactly four steps that separate the five percent from everyone else."
   NEVER start with just a vague statement. ALWAYS lead with a specific number.

2. PATTERN INTERRUPT (every 60-90 seconds): Ask a question, introduce a twist, or shift angle.
3. SECTION BREAKS: Use 3-5 numbered sections. These become visual title cards.
4. SUBSCRIBE CTA (at ~40% mark): Natural integration. "If this is clicking, hit subscribe."
5. OPEN LOOPS before sections: "But here's where it gets wild..."
6. STRONG CLOSE: Key takeaway + forward-looking statement.

═══ DATA-HEAVY WRITING RULES (CRITICAL) ═══
Your script MUST include at least 15-20 specific numbers, stats, or data points. This is non-negotiable.

- Include SPECIFIC NUMBERS frequently (percentages, dollar amounts, stats, measurements).
  Good: "Your cortisol drops by thirty-eight percent within the first week."
  Bad: "Your stress levels decrease significantly."

- Include COMPARISONS between 2+ things with real data.
  Good: "The average American spends two hundred forty minutes on their phone daily compared to just twenty-two minutes exercising."
  Bad: "People spend too much time on phones."

- Include LISTS of 3-5 items with numbers when explaining concepts.
  Good: "Three things happen to your liver: first, fat deposits shrink by fifteen percent. Second, enzyme levels normalize. Third, inflammation markers drop in half."
  Bad: "Your liver starts getting healthier."

- Include TIMELINE/PROGRESSION moments with specific timeframes.
  Good: "At twelve hours, your blood sugar stabilizes. By day three, cravings peak. At two weeks, your taste buds actually reset."
  Bad: "Over time your body adjusts."

- Include RANKING or SCALE references with numbers.
  Good: "The top five hidden sugar sources are: yogurt at twenty-six grams, granola bars at eighteen, pasta sauce at twelve, salad dressing at eight, and bread at six per serving."
  Bad: "Many foods contain hidden sugar."

- Include GROWTH or TREND data.
  Good: "In two thousand ten, the market was worth four billion. By two thousand twenty, it hit forty-seven billion. That is over one thousand percent growth."
  Bad: "The market has grown a lot."

VOICE & TONE:
- Write like talking to a smart friend over coffee
- Use contractions: "you'd", "that's", "wouldn't"
- Short sentences mixed with longer ones for rhythm
- Rhetorical questions: "So what does this actually mean?"
- Specific numbers and examples — NEVER vague
- No filler: remove "actually", "basically", "you know"
- No AI clichés: never say "dive into", "landscape", "game-changer", "let's unpack"
- Spell out ALL numbers as words (write "thirty-eight percent" not "38%")
- This will be read by text-to-speech, so write phonetically
- For foreign place names, use the ENGLISH pronunciation. Write "Barcelona" not "Barthelona", "Paris" not "Paree", "Rome" not "Roma". Always use the common English name and spelling. Avoid native-language pronunciations that sound awkward in English TTS.

FORMAT:
- Write ONLY narration text, no stage directions or [brackets]
- Blank lines between paragraphs (natural pauses)
- Numbered sections: "Number one. SECTION TITLE." on its own line
- Target ${duration} minutes at ~150 words per minute
- This means your script MUST be at least ${Math.round(parseInt(duration)*150*0.9)} words. Count carefully.
- Aim for ${Math.round(parseInt(duration)*150)}-${Math.round(parseInt(duration)*150*1.1)} words to hit the ${duration}-minute mark.

Write the complete script now. Remember: MINIMUM ${Math.round(parseInt(duration)*150*0.9)} words.`;
}

// ═══════════════════════════════════════════════════
// VISUAL MODE PROMPT — scene-driven, imagery-focused
// ═══════════════════════════════════════════════════
function buildVisualPrompt(topic, duration, style) {
  return `You are a top YouTube scriptwriter for faceless channels that get millions of views. The current year is 2026. Write a ${duration} minute narration script about:

"${topic}"

TONE: ${style}
${style === "humor" ? "Use witty observations, unexpected comparisons, and comedic timing. Be funny but still informative." : ""}
${style === "serious" ? "Be authoritative and cinematic. Use vivid language and atmospheric tone." : ""}
${style === "dramatic" ? "Build tension and suspense. Use cliffhangers, pacing, and dramatic reveals." : ""}
${style === "engaging" ? "Be conversational and energetic. Paint pictures with words." : ""}

THIS IS A VISUAL-STYLE VIDEO. Your script will be paired with real photographs, web images, and AI-generated imagery. Write to CREATE opportunities for stunning visuals — NOT charts or data.

STRUCTURE (critical for retention):
1. HOOK (first 5-8 seconds):
   Sentence 1: A VIVID SCENE or DRAMATIC STATEMENT that grabs attention.
   Example (horror): "In nineteen eighty-two, a family moved into a house on Elm Street. Three weeks later, none of them would sleep again."
   Example (travel): "There is a beach in Greece where the water is so clear, you can see the shadow of your boat twenty feet below the surface."
   Example (celebrity): "At twenty-three years old, he was sleeping in his car. Five years later, he owned a private jet."
   Sentence 2: Deepen the imagery or raise the stakes.
   Sentence 3: THE PROMISE — what the viewer will experience.
   NEVER start with a dry statistic. Start with a SCENE the viewer can picture.

2. PATTERN INTERRUPT (every 60-90 seconds): Shift locations, introduce a new character, or reveal a twist.
3. SECTION BREAKS: Use 3-5 numbered sections. These become visual title cards.
4. SUBSCRIBE CTA (at ~40% mark): Natural integration.
5. OPEN LOOPS: "But what happened next changed everything..."
6. STRONG CLOSE: Emotional payoff + memorable final image.

═══ VISUAL WRITING RULES (CRITICAL) ═══
Write so every sentence creates an IMAGE in the viewer's mind. The video system will search for photos matching your descriptions.

- DESCRIBE SCENES, not data. Paint pictures with words.
  Good: "Imagine standing at the edge of a cliff in Santorini, the white buildings cascading down the hillside, the Aegean Sea stretching to the horizon in every shade of blue."
  Bad: "Santorini is a popular tourist destination with many visitors per year."

- NAME SPECIFIC THINGS. Real people, real places, real brands — these get matched to real photos.
  Good: "When you walk through the Sagrada Familia in Barcelona, the light filters through the stained glass like nothing you have ever seen."
  Bad: "There are many beautiful churches in Europe."

- USE SENSORY LANGUAGE. What does it look, sound, feel like?
  Good: "The streets of Marrakech hit you with the smell of spices, the sound of vendors calling out, and colors everywhere — saffron yellow, cobalt blue, terracotta red."
  Bad: "Marrakech is a vibrant city."

- TELL STORIES with characters and moments.
  Good: "Director James Wan sat in a screening room watching audiences react to The Conjuring. When the clapping scene hit, every single person in the theater jumped."
  Bad: "The Conjuring was a successful horror movie."

- AVOID UNNECESSARY NUMBERS. Only include data when it naturally fits the story.
  Okay: "The movie made three hundred eighteen million dollars on a twenty million dollar budget."
  Avoid: Listing box office numbers for ten movies in a row — that becomes an infographic video.

- When you DO mention a specific person, place, brand, or landmark BY NAME, make it descriptive so the video can show a real photo of it.
  Good: "The Colosseum in Rome, with its crumbling arches and two-thousand-year-old stone, still makes you feel small when you stand inside it."

VOICE & TONE:
- Write like a storyteller, not a textbook
- Use contractions: "you'd", "that's", "wouldn't"
- Short punchy sentences for tension, longer flowing ones for atmosphere
- Rhetorical questions: "Can you picture it?"
- Vivid, specific descriptions — NEVER generic
- No filler: remove "actually", "basically", "you know"
- No AI clichés: never say "dive into", "landscape", "game-changer", "let's unpack"
- Spell out ALL numbers as words (write "three hundred" not "300")
- This will be read by text-to-speech, so write phonetically
- For foreign place names, use the ENGLISH pronunciation. Write "Barcelona" not "Barthelona", "Paris" not "Paree", "Rome" not "Roma". Always use the common English name and spelling. Avoid native-language pronunciations that sound awkward in English TTS.

FORMAT:
- Write ONLY narration text, no stage directions or [brackets]
- Blank lines between paragraphs (natural pauses)
- Numbered sections: "Number one. SECTION TITLE." on its own line
- Target ${duration} minutes at ~150 words per minute
- This means your script MUST be at least ${Math.round(parseInt(duration)*150*0.9)} words. Count carefully.
- Aim for ${Math.round(parseInt(duration)*150)}-${Math.round(parseInt(duration)*150*1.1)} words to hit the ${duration}-minute mark.

Write the complete script now. Remember: MINIMUM ${Math.round(parseInt(duration)*150*0.9)} words.`;
}

export async function generateScript(topic, options = {}) {
  const duration = options.duration || "10";
  const style = options.tone || options.style || "engaging";
  const outputDir = options.output || "./scripts";
  
  // Auto-detect or use CLI override
  let mode = options.mode || detectMode(topic);
  
  fs.mkdirSync(outputDir, { recursive: true });

  const modeLabel = mode === "infographic" ? "📊 INFOGRAPHIC" : "🎬 VISUAL";
  console.log(chalk.blue(`${modeLabel} mode detected for: "${topic}"`));

  const spinner = ora(`Writing ${mode} script about "${topic}"...`).start();

  const prompt = mode === "infographic" 
    ? buildInfographicPrompt(topic, duration, style)
    : buildVisualPrompt(topic, duration, style);

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
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

  const script = response.data.content[0].text.trim();
  const wordCount = script.split(/\s+/).length;
  const estMinutes = (wordCount / 150).toFixed(1);

  // Generate filename from topic
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  const outputPath = path.join(outputDir, `${slug}.txt`);
  
  fs.writeFileSync(outputPath, script);
  spinner.succeed(`Script written: ${outputPath}`);
  
  console.log(chalk.white(`📝 Words: ${wordCount}`));
  console.log(chalk.white(`⏱️  Est. duration: ${estMinutes} minutes`));
  console.log(chalk.white(`🎯 Mode: ${mode}`));
  console.log(chalk.white(`📁 Saved: ${outputPath}`));
  
  // Show first 3 lines as preview
  const preview = script.split("\n").filter(l => l.trim()).slice(0, 3);
  console.log(chalk.gray(`\n  "${preview[0]}"`));
  if (preview[1]) console.log(chalk.gray(`  "${preview[1]}"`));
  
  return { path: outputPath, wordCount, estMinutes, mode };
}
