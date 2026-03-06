import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ora from "ora";
import chalk from "chalk";
import { generateVoiceoverWithTimestamps, getVoiceId, getAutoVoice, generateWithFallback } from "./elevenlabs.js";
import { enhanceScript } from "./script-enhancer.js";
import { getAudioDuration } from "./ffmpeg.js";
import { createStoryboard } from "./director.js";
import { fetchPhoto } from "./pexels.js";
import { removeBackground, generateAIImage } from "./fal.js";
import { searchWebImage, isWebSearchAvailable } from "./web-images.js";
import { detectMood, selectMusicTrack } from "./music.js";
import { renderWithRemotion } from "./remotion-renderer.js";
import axios from "axios";
import { generateThumbnail } from "./thumbnail.js";

const CUTOUT_STYLES = [];

function fixImageRotation(imagePath) {
  try {
    const tmpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, "-fixed.$1");
    execSync(`ffmpeg -y -i "${imagePath}" -auto_orient -update 1 -q:v 2 "${tmpPath}" 2>/dev/null`);
    if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 0) {
      fs.renameSync(tmpPath, imagePath);
    }
  } catch {}
}

/**
 * craftAIPrompt: Sends context to Claude API to get a detailed, cinematic image prompt for Fal.ai.
 * This ensures every AI-generated image perfectly matches the script context.
 */
async function craftAIPrompt(basicPrompt, clip, scriptText) {
  try {
    // Find the script context around this clip's time
    const clipStart = clip.start_time || 0;
    const clipEnd = clip.end_time || clipStart + 3;
    
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `You are an expert at writing prompts for AI image generation (Flux model).

Given this context from a video script, write ONE detailed image generation prompt (30-50 words) that would create the perfect visual for this moment.

Basic concept: "${basicPrompt}"
Script excerpt (nearby context): "${scriptText.slice(0, 500)}"
Clip timing: ${clipStart.toFixed(1)}s - ${clipEnd.toFixed(1)}s

Rules:
- Describe a specific, concrete scene (not abstract concepts)
- Include: subject, setting, lighting, camera angle, mood
- Style: photorealistic, cinematic, 16:9 aspect ratio
- Always include "high quality, sharp focus, professional photography"
- NO text or words in the image
- NO watermarks or logos

Return ONLY the prompt, nothing else.`
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

    const prompt = response.data.content[0].text.trim();
    return prompt;
  } catch {
    // If Claude call fails, use a basic enhanced prompt
    return `${basicPrompt}, cinematic lighting, photorealistic, 16:9 aspect ratio, professional photography, high quality, sharp focus, dark moody background`;
  }
}

function detectContentMode(topic, script) {
  const lower = (topic + " " + script.slice(0, 500)).toLowerCase();
  const visualWords = ["travel","horror","scary","celebrity","movie","food","nature","animal","mystery","sports","history","luxury","crime","entertainment","beach","island","city","visit","places","adventure"];
  const infraWords = ["invest","stock","finance","money","health","science","business","crypto","budget","revenue","profit","data","study"];
  let vScore = 0, iScore = 0;
  for (const w of visualWords) if (lower.includes(w)) vScore++;
  for (const w of infraWords) if (lower.includes(w)) iScore++;
  return vScore >= iScore ? "visual" : "infographic";
}

export async function generateVideo(scriptPath, options) {
  const startTime = Date.now();
  const projectRoot = path.resolve(".");
  
  const spinner = ora("Reading script...").start();
  const scriptText = fs.readFileSync(path.resolve(scriptPath), "utf-8");
  spinner.succeed(`Script loaded (${scriptText.length} chars)`);

  const mood = detectMood(scriptText);
  console.log(chalk.blue(`🎵 Detected mood: ${mood}`));

  // --- STEP 1: Generate voiceover (single file for entire script) ---
  const timestamp = new Date().toISOString().slice(0, 10);
  const projectName = path.basename(scriptPath, path.extname(scriptPath));
  const outputDir = path.resolve(options.output, `${timestamp}-${projectName}`);
  const assetsDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  // voice selection below
  let voiceId;
  if (options.voice) {
    voiceId = await getVoiceId(options.voice);
    console.log(chalk.blue(`???  Voice override: ${options.voice}`));
  } else {
    const autoVoice = getAutoVoice(scriptText);
    voiceId = autoVoice.primary.voiceId;
    console.log(chalk.blue(`???  Auto-voice: ${autoVoice.primary.id} (${autoVoice.style} style)`));
  }
  const audioPath = path.join(assetsDir, "voiceover.mp3");
  const tsPath = path.join(assetsDir, "voiceover-timestamps.json");

  let wordTimestamps, totalDuration;

  if (options.skipVoice && fs.existsSync(audioPath) && fs.existsSync(tsPath)) {
    // Reuse cached voiceover + timestamps
    const s = ora("Loading cached voiceover...").start();
    const cached = JSON.parse(fs.readFileSync(tsPath, "utf-8"));
    wordTimestamps = cached.words;
    totalDuration = cached.duration;
    s.succeed(`Voiceover: cached (${totalDuration.toFixed(1)}s, ${wordTimestamps.length} words)`);
  } else {
    const enhancedScript = enhanceScript(scriptText, mood || "default");
    const s = ora("Generating voiceover with timestamps...").start();
    const result = await generateVoiceoverWithTimestamps(enhancedScript, voiceId, audioPath);
    wordTimestamps = result.words;
    totalDuration = result.duration;
    s.succeed(`Voiceover: ${totalDuration.toFixed(1)}s, ${wordTimestamps.length} words with timestamps`);
  }

  if (options.voiceOnly) {
    console.log(chalk.green.bold("\n✅ Voice-only complete. Audio + timestamps cached."));
    return;
  }

  // --- STEP 2: Director creates storyboard ---
  const s2 = ora("Director creating storyboard...").start();
  // Detect content mode from project name
  const contentMode = detectContentMode(projectName, scriptText);
  console.log(chalk.blue(`🎯 Content mode: ${contentMode}`));
  const clips = await createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode);
  
  const numReveals = clips.filter(c => c.visual_type === "number_reveal").length;
  const comparisons = clips.filter(c => c.visual_type === "comparison").length;
  const sections = clips.filter(c => c.visual_type === "section_break").length;
  const stockClips = clips.filter(c => c.visual_type === "stock").length;
  const aiClips = clips.filter(c => c.visual_type === "ai_image").length;
  const textFlashes = clips.filter(c => c.visual_type === "text_flash").length;
  
  s2.succeed(`Storyboard: ${clips.length} clips (${stockClips} stock, ${aiClips} AI, ${numReveals} numbers, ${comparisons} comparisons, ${sections} sections, ${textFlashes} text)`);

  // Show clip timeline
  console.log("");
  clips.forEach((clip, i) => {
    const icon = clip.visual_type === "stock" ? "📷" :
                 clip.visual_type === "number_reveal" ? "🔢" :
                 clip.visual_type === "comparison" ? "📊" :
                 clip.visual_type === "section_break" ? "🏷️" : "💬";
    const dur = (clip.end_time - clip.start_time).toFixed(1);
    const words = clip.subtitle_words?.length || 0;
    console.log(chalk.gray(`  ${icon} ${clip.start_time.toFixed(1)}s-${clip.end_time.toFixed(1)}s (${dur}s) [${clip.visual_type}] ${words} words`));
  });
  console.log("");

  // --- STEP 3: Fetch visuals (Smart: Pexels → Claude prompt → AI generate) ---
  console.log(chalk.blue("📷 Fetching visuals...\n"));

  const graphicTypes = ["number_reveal","comparison","section_break","text_flash",
    "line_chart","donut_chart","progress_bar","timeline","leaderboard",
    "process_flow","stat_card","quote_card","checklist",
    "horizontal_bar","vertical_bar","scale_comparison","map_highlight",
    "body_diagram","funnel_chart","growth_curve","ranking_cards",
    "split_comparison","icon_grid","flow_diagram"];

  const webImageAvailable = isWebSearchAvailable();
  if (webImageAvailable) {
    console.log(chalk.gray("  🌐 Web Image Search enabled (Brave)"));
  }

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];

    if (graphicTypes.includes(clip.visual_type)) {
      clip.imagePath = null;
      clip.isCutout = false;
      continue;
    }

    const s = ora(`Clip ${i + 1}: "${clip.search_query || clip.screenshot_query || clip.ai_prompt || ''}"...`).start();
    const baseName = `clip-${i + 1}`;
    const photoPath = path.join(assetsDir, `${baseName}.jpg`);
    const aiPath = path.join(assetsDir, `${baseName}-ai.jpg`);
    const webPath = path.join(assetsDir, `${baseName}-web.jpg`);

    try {
      // Route 0: web_screenshot → treat as web_image search (Puppeteer not available)
      if (clip.visual_type === "web_screenshot") {
        clip.visual_type = "web_image";
        clip.search_query = clip.screenshot_query || clip.search_query;
      }

      // Route 0.5: Director chose web_image ? Brave search for real photos, AI fallback
      if (clip.visual_type === "web_image" && clip.search_query && webImageAvailable) {
        try {
          const result = await searchWebImage(clip.search_query, webPath, clip);
          if (fs.existsSync(webPath) && fs.statSync(webPath).size > 5000) {
            fixImageRotation(webPath);
            clip.imagePath = webPath;
            clip.isCutout = false;
            s.succeed(`Clip ${i + 1}: 🌐 web image ${clip.display_style}`);
            continue;
          }
        } catch (webErr) {
          // Brave miss → use AI to generate photorealistic image
          s.text = `Clip ${i + 1}: Web miss → AI generating...`;
          try {
            const detailedPrompt = await craftAIPrompt(
              `Photorealistic photograph related to: ${clip.search_query}. Editorial photo style, high resolution, professional photography.`,
              clip,
              scriptText
            );
            await generateAIImage(detailedPrompt, aiPath);
            fixImageRotation(aiPath);
            clip.imagePath = aiPath;
            clip.isCutout = false;
            clip.visual_type = "ai_image";
            s.succeed(`Clip ${i + 1}: AI 🎨 (web fallback) ${clip.display_style}`);
            continue;
          } catch {
            clip.visual_type = "stock";
          }
        }
      }

      // web_image fallback handled by Brave above
      if (false) {
        clip.visual_type = "stock";
      }

      // Route 1: Director chose ai_image → Claude refines prompt → generate with Fal
      if (clip.visual_type === "ai_image" && clip.ai_prompt) {
        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText);
        await generateAIImage(detailedPrompt, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        s.succeed(`Clip ${i + 1}: AI 🎨 ${clip.display_style}`);
        continue;
      }

      // Route 2: Try Pexels first for stock clips
      let pexelsOk = false;
      try {
        await fetchPhoto(clip.search_query, photoPath);
        if (fs.existsSync(photoPath) && fs.statSync(photoPath).size > 5000) {
          fixImageRotation(photoPath);
          clip.imagePath = photoPath;
          clip.isCutout = false;
          pexelsOk = true;
          s.succeed(`Clip ${i + 1}: ${clip.display_style}`);
        }
      } catch {}

      // Route 3: Pexels failed → Claude crafts prompt → AI generates
      if (!pexelsOk) {
        s.text = `Clip ${i + 1}: Pexels miss → AI generating...`;
        const detailedPrompt = await craftAIPrompt(
          clip.search_query || "professional scene",
          clip,
          scriptText
        );
        await generateAIImage(detailedPrompt, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        clip.visual_type = "ai_image";
        s.succeed(`Clip ${i + 1}: AI fallback 🎨 ${clip.display_style}`);
      }
    } catch {
      // Emergency fallback: generic AI image
      try {
        const emergency = `Professional cinematic photograph related to ${clip.search_query || "business"}, clean modern aesthetic, dramatic lighting, dark background, 16:9, high quality`;
        await generateAIImage(emergency, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        clip.visual_type = "ai_image";
        s.succeed(`Clip ${i + 1}: AI emergency 🎨`);
      } catch {
        clip.imagePath = null;
        clip.isCutout = false;
        s.warn(`Clip ${i + 1}: no image`);
      }
    }
  }

  // Report AI fallback stats
  const finalAI = clips.filter(c => c.visual_type === "ai_image").length;
  if (finalAI > aiClips) {
    console.log(chalk.gray(`  ✔ AI replaced ${finalAI - aiClips} failed Pexels searches`));
  }

  // Select music
  let musicTrack = null;
  if (!options.noMusic) {
    const ms = ora("Selecting background music...").start();
    musicTrack = selectMusicTrack(mood, projectRoot);
    if (musicTrack) {
      ms.succeed(`Music: ${musicTrack.name} (${musicTrack.mood})`);
    } else {
      ms.warn("No music — add .mp3 to music/ folder");
    }
  }

  // Detect visual background theme from content keywords — 20 themes
  const scriptLower = scriptText.toLowerCase();
  // Theme pools for variety — picks randomly within category
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const themePools = {
    default: ["blue_grid", "steel_grey", "ice_blue", "midnight_blue", "electric_cyan"],
    horror: ["dark_horror", "blood_red"],
    crime: ["midnight_blue", "steel_grey", "dark_horror"],
    ai: ["electric_cyan", "neon_green", "purple_cosmic"],
    tech: ["ice_blue", "electric_cyan", "steel_grey"],
    crypto: ["neon_green", "electric_cyan", "gold_luxury"],
    space: ["purple_cosmic", "midnight_blue", "electric_cyan"],
    spiritual: ["royal_purple", "purple_cosmic", "teal_ocean"],
    health: ["teal_ocean", "forest_green", "ice_blue"],
    sleep: ["purple_cosmic", "royal_purple", "midnight_blue"],
    history: ["earth_brown", "gold_luxury", "steel_grey"],
    travel: ["forest_green", "sunset_warm", "teal_ocean"],
    nature: ["forest_green", "teal_ocean", "earth_brown"],
    finance: ["gold_luxury", "steel_grey", "midnight_blue", "blue_grid"],
    luxury: ["gold_luxury", "rose_gold", "royal_purple"],
    entertainment: ["pink_neon", "neon_green", "sunset_warm", "orange_fire"],
    motivation: ["orange_fire", "red_energy", "sunset_warm", "gold_luxury"],
  };
  let theme = pick(themePools.default);

  // Niche detection — order matters, more specific matches first
  if (/\b(horror|scary|creepy|murder|serial killer|ghost|haunted|demon|paranormal)\b/.test(scriptLower)) theme = "dark_horror";
  if (/\b(true crime|crime|criminal|prison|detective|forensic|investigation|cold case)\b/.test(scriptLower)) theme = "midnight_blue";
  if (/\b(ai|artificial intelligence|machine learning|neural|chatgpt|gpt|llm|automation)\b/.test(scriptLower)) theme = "electric_cyan";
  if (/\b(tech|software|programming|code|app|gadget|smartphone|computer|review)\b/.test(scriptLower)) theme = "ice_blue";
  if (/\b(crypto|bitcoin|blockchain|nft|web3|ethereum|defi)\b/.test(scriptLower)) theme = "neon_green";
  if (/\b(space|universe|cosmos|galaxy|astronomy|planet|astronaut|nasa|star|black hole)\b/.test(scriptLower)) theme = "purple_cosmic";
  if (/\b(meditation|mindful|zen|spiritual|consciousness|chakra|yoga)\b/.test(scriptLower)) theme = "royal_purple";
  if (/\b(philosophy|stoic|stoicism|wisdom|ancient|thinker|meaning of life)\b/.test(scriptLower)) theme = "royal_purple";
  if (/\b(psychology|mental|brain|cognitive|bias|behavior|personality|therapy)\b/.test(scriptLower)) theme = "royal_purple";
  if (/\b(health|medical|body|nutrition|diet|exercise|fitness|wellness|vitamin)\b/.test(scriptLower)) theme = "teal_ocean";
  if (/\b(sleep|insomnia|dream|melatonin|circadian|rest|nap)\b/.test(scriptLower)) theme = "purple_cosmic";
  if (/\b(history|ancient|medieval|empire|war|century|dynasty|civilization|mythology|folklore)\b/.test(scriptLower)) theme = "earth_brown";
  if (/\b(travel|destination|country|tourism|flight|passport|backpack|adventure|explore)\b/.test(scriptLower)) theme = "forest_green";
  if (/\b(nature|animal|pet|dog|cat|wildlife|ocean|marine|bird)\b/.test(scriptLower)) theme = "forest_green";
  if (/\b(luxury|premium|wealthy|millionaire|billionaire|rich|gold|rolex|ferrari|mansion)\b/.test(scriptLower)) theme = "gold_luxury";
  if (/\b(celebrity|net worth|famous|actor|singer|rapper|influencer|biography)\b/.test(scriptLower)) theme = "gold_luxury";
  if (/\b(movie|film|tv show|netflix|series|recap|review|box office|streaming)\b/.test(scriptLower)) theme = "pink_neon";
  if (/\b(social media|instagram|tiktok|youtube|viral|followers|subscribers)\b/.test(scriptLower)) theme = "pink_neon";
  if (/\b(cooking|recipe|food|meal|kitchen|chef|baking|ingredient|calorie)\b/.test(scriptLower)) theme = "rose_gold";
  if (/\b(car|automobile|vehicle|engine|horsepower|mph|speed|racing|tesla|bmw)\b/.test(scriptLower)) theme = "steel_grey";
  if (/\b(real estate|house|property|mortgage|rent|apartment|housing)\b/.test(scriptLower)) theme = "gold_luxury";
  if (/\b(side hustle|passive income|make money|freelance|gig|entrepreneur|startup|business)\b/.test(scriptLower)) theme = "orange_fire";
  if (/\b(motivat|hustle|grind|success|winner|champion|goal|discipline|habit)\b/.test(scriptLower)) theme = "sunset_warm";
  if (/\b(sport|nba|nfl|soccer|football|basketball|athlete|championship|olympic)\b/.test(scriptLower)) theme = "red_energy";
  if (/\b(science|physics|chemistry|biology|experiment|research|study|data)\b/.test(scriptLower)) theme = "ice_blue";
  if (/\b(invest|stock|dividend|portfolio|compound|index fund|etf|bond|market|finance|money|broke|salary|budget|saving|debt)\b/.test(scriptLower)) theme = "blue_grid";
  if (/\b(reddit|askreddit|aita|tifu|story time)\b/.test(scriptLower)) theme = "neon_green";
  if (/\b(top \d|ranking|ranked|list|best|worst|most|biggest|smallest)\b/.test(scriptLower)) theme = "aurora";

  console.log(chalk.blue(`🎨 Theme: ${theme}`));
  // CLI override
  if (options.theme) {
    const valid = ["blue_grid","green_matrix","gold_luxury","red_energy","purple_cosmic","teal_ocean","orange_fire","pink_neon","ice_blue","forest_green","sunset_warm","midnight_blue","electric_cyan","earth_brown","blood_red","royal_purple","neon_green","rose_gold","steel_grey","aurora","dark_horror"];
    if (valid.includes(options.theme)) {
      theme = options.theme;
      console.log(chalk.blue(`🎨 Theme override: ${theme}`));
    }
  }

  // Save storyboard
  fs.writeFileSync(path.join(outputDir, "storyboard.json"), JSON.stringify({ clips, wordTimestamps, totalDuration, theme }, null, 2));

  // --- STEP 4: Render ---
  console.log(chalk.blue("\n🎬 Rendering with Remotion...\n"));
  const silentPath = path.join(assetsDir, "remotion-output.mp4");
  await renderWithRemotion(clips, wordTimestamps, totalDuration, silentPath, assetsDir, theme);

  // --- STEP 5: Merge audio + video ---
  console.log(chalk.blue("\n🔊 Merging audio" + (musicTrack ? " + music" : "") + "...\n"));
  const finalPath = path.join(outputDir, "final.mp4");
  await mergeAudioVideoSimple(silentPath, audioPath, finalPath, musicTrack?.path || null, totalDuration);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  // --- STEP 6: Generate Thumbnail ---
  console.log(chalk.blue("\nGenerating thumbnail...\n"));
  try {
    const thumbTitle = scriptText.split("\n")[0].replace(/^#\s*/, "").trim() || projectName;
    await generateThumbnail(outputDir, thumbTitle, projectName.replace(/-/g, " "));
    console.log(chalk.green("  Thumbnail saved!"));
  } catch (thumbErr) {
    console.log(chalk.yellow("  Thumbnail skipped: " + thumbErr.message));
  }

  console.log(chalk.green.bold("\n✅ Video complete!"));
  console.log(chalk.white(`📁 Output: ${finalPath}`));
  console.log(chalk.white(`⏱️  Duration: ${(totalDuration / 60).toFixed(1)} minutes`));
  console.log(chalk.white(`🎬 Clips: ${clips.length} (${stockClips} stock, ${aiClips} 🎨, ${numReveals} 🔢, ${comparisons} 📊, ${sections} 🏷️, ${textFlashes} 💬)`));
  if (musicTrack) console.log(chalk.white(`🎵 Music: ${musicTrack.name}`));
  console.log(chalk.white(`⏳ Build time: ${elapsed} minutes`));
}

async function mergeAudioVideoSimple(videoPath, audioPath, outputPath, musicPath, duration) {
  const s = ora("Merging...").start();

  if (musicPath && fs.existsSync(musicPath)) {
    const fadeOut = Math.max(0, duration - 3);
    try {
      execSync(
        `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -stream_loop -1 -i "${musicPath}" ` +
        `-filter_complex "` +
        `[1:a]asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo[voice];` +
        `[2:a]atrim=0:${duration},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3,volume=0.30[music];` +
        `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
        `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -ac 2 "${outputPath}"`,
        { stdio: "pipe" }
      );
      s.succeed("Merged with music");
      return;
    } catch (err) {
      s.text = "Music mix failed, merging voice only...";
    }
  }

  try {
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${outputPath}"`,
      { stdio: "pipe" }
    );
    s.succeed("Merged");
  } catch {
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k "${outputPath}"`,
      { stdio: "pipe" }
    );
    s.succeed("Merged (re-encoded)");
  }
}
