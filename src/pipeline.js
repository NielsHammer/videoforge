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
import { getCachedAsset, saveCachedAsset } from "./asset-cache.js";
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
  // Use orderId as folder name if provided — guarantees unique, isolated output per order
  const folderName = options.orderId 
    ? `order-${options.orderId}` 
    : `${timestamp}-${projectName}`;
  const outputDir = path.resolve(options.output, folderName);
  const assetsDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  // --- THUMBNAIL-ONLY MODE: skip everything except thumbnail generation ---
  // Must be checked BEFORE voice generation to avoid wasting ElevenLabs credits
  if (options.render === false || options.noRender) { // Commander: --no-render sets render=false
    console.log(chalk.yellow('\n⏭️  Thumbnail-only mode — skipping voice, storyboard, render'));
    const existingVideo = path.join(outputDir, 'final.mp4');
    if (fs.existsSync(existingVideo)) {
      const thumbTitle = projectName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await generateThumbnail(outputDir, thumbTitle, 'default');
      console.log(chalk.green.bold('\n✅ Thumbnail regenerated!'));
    } else {
      throw new Error('No existing final.mp4 found — cannot regenerate thumbnail without a video');
    }
    return;
  }

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
    // Sanity check - make sure audio file exists and is not empty
    const audioStat = fs.existsSync(audioPath) ? fs.statSync(audioPath) : null;
    if (!audioStat || audioStat.size < 1000) {
      throw new Error(`Voiceover file is empty or missing (${audioStat?.size || 0} bytes). ElevenLabs may have failed silently.`);
    }
    if (totalDuration < 10) {
      throw new Error(`Voiceover is only ${totalDuration.toFixed(1)}s — script may be too short or ElevenLabs returned partial audio.`);
    }
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
          // Check asset cache first — saves Brave API calls and time
          const cachedWeb = getCachedAsset(clip.search_query);
          if (cachedWeb) {
            fs.copyFileSync(cachedWeb, webPath);
            console.log(`    💾 Cache hit: ${clip.search_query}`);
          } else {
            await searchWebImage(clip.search_query, webPath, clip);
            if (fs.existsSync(webPath) && fs.statSync(webPath).size > 5000) {
              saveCachedAsset(clip.search_query, webPath); // save for future orders
            }
          }
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
            // Check cache before calling Fal.ai (most expensive — ~$0.05/image)
            const cachedAI = getCachedAsset('ai-' + clip.search_query);
            if (cachedAI) {
              fs.copyFileSync(cachedAI, aiPath);
              console.log(`    💾 Cache hit (AI): ${clip.search_query}`);
            } else {
              await generateAIImage(detailedPrompt, aiPath);
              if (fs.existsSync(aiPath) && fs.statSync(aiPath).size > 5000) {
                saveCachedAsset('ai-' + clip.search_query, aiPath);
              }
            }
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
        const cachedR1 = getCachedAsset('ai-' + (clip.search_query || clip.ai_prompt));
        if (cachedR1) {
          fs.copyFileSync(cachedR1, aiPath);
          console.log(`    💾 Cache hit (AI route1): ${clip.search_query || clip.ai_prompt}`);
        } else {
          await generateAIImage(detailedPrompt, aiPath);
          if (fs.existsSync(aiPath) && fs.statSync(aiPath).size > 5000) {
            saveCachedAsset('ai-' + (clip.search_query || clip.ai_prompt), aiPath);
          }
        }
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        s.succeed(`Clip ${i + 1}: AI 🎨 ${clip.display_style}`);
        continue;
      }

      // Route 2: Try Pexels first for stock clips (check cache first)
      let pexelsOk = false;
      try {
        const cachedPexels = getCachedAsset(clip.search_query + '-pexels');
        if (cachedPexels) {
          fs.copyFileSync(cachedPexels, photoPath);
          console.log(`    💾 Cache hit (Pexels): ${clip.search_query}`);
        } else {
          await fetchPhoto(clip.search_query, photoPath);
          if (fs.existsSync(photoPath) && fs.statSync(photoPath).size > 5000) {
            saveCachedAsset(clip.search_query + '-pexels', photoPath);
          }
        }
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
        const cachedR3 = getCachedAsset('ai-' + (clip.search_query || 'scene'));
        if (cachedR3) {
          fs.copyFileSync(cachedR3, aiPath);
          console.log(`    💾 Cache hit (AI route3): ${clip.search_query}`);
        } else {
          await generateAIImage(detailedPrompt, aiPath);
          if (fs.existsSync(aiPath) && fs.statSync(aiPath).size > 5000) {
            saveCachedAsset('ai-' + (clip.search_query || 'scene'), aiPath);
          }
        }
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
        const cachedEmergency = getCachedAsset('ai-emergency-' + (clip.search_query || 'business'));
        if (cachedEmergency) {
          fs.copyFileSync(cachedEmergency, aiPath);
          console.log(`    💾 Cache hit (AI emergency): ${clip.search_query}`);
        } else {
          await generateAIImage(emergency, aiPath);
          if (fs.existsSync(aiPath) && fs.statSync(aiPath).size > 5000) {
            saveCachedAsset('ai-emergency-' + (clip.search_query || 'business'), aiPath);
          }
        }
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
  if (options.music !== false && !options.noMusic) { // Commander: --no-music sets music=false
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
  // Topic → pool of valid themes (picked randomly for variety)
  const topicThemePools = {
    horror:       [/\b(horror|scary|creepy|ghost|haunted|demon|paranormal)\b/, ["dark_horror", "blood_red", "midnight_blue"]],
    crime:        [/\b(true crime|crime|criminal|prison|detective|forensic|cold case)\b/, ["midnight_blue", "steel_grey", "dark_horror"]],
    ai:           [/\b(ai|artificial intelligence|machine learning|neural|chatgpt|gpt|llm|automation)\b/, ["electric_cyan", "ice_blue", "purple_cosmic"]],
    tech:         [/\b(tech|software|programming|code|app|gadget|smartphone|computer)\b/, ["ice_blue", "electric_cyan", "steel_grey"]],
    crypto:       [/\b(crypto|bitcoin|blockchain|nft|web3|ethereum|defi)\b/, ["neon_green", "electric_cyan", "gold_luxury"]],
    space:        [/\b(space|universe|cosmos|galaxy|astronomy|planet|astronaut|nasa|black hole)\b/, ["purple_cosmic", "midnight_blue", "electric_cyan"]],
    spiritual:    [/\b(meditation|mindful|zen|spiritual|consciousness|chakra|yoga|philosophy|stoic)\b/, ["royal_purple", "purple_cosmic", "teal_ocean"]],
    psychology:   [/\b(psychology|mental|brain|cognitive|bias|behavior|personality|therapy)\b/, ["royal_purple", "ice_blue", "midnight_blue"]],
    health:       [/\b(health|medical|body|nutrition|diet|exercise|fitness|wellness|vitamin)\b/, ["teal_ocean", "forest_green", "ice_blue"]],
    sleep:        [/\b(sleep|insomnia|dream|melatonin|circadian|rest|nap)\b/, ["purple_cosmic", "royal_purple", "midnight_blue"]],
    history:      [/\b(history|ancient|medieval|empire|war|century|dynasty|civilization|mythology)\b/, ["earth_brown", "gold_luxury", "steel_grey"]],
    travel:       [/\b(travel|destination|country|tourism|flight|passport|adventure|explore)\b/, ["forest_green", "teal_ocean", "sunset_warm"]],
    nature:       [/\b(nature|animal|pet|dog|cat|wildlife|ocean|marine|bird)\b/, ["forest_green", "teal_ocean", "earth_brown"]],
    luxury:       [/\b(luxury|wealthy|millionaire|billionaire|rich|gold|rolex|ferrari|mansion)\b/, ["gold_luxury", "rose_gold", "royal_purple"]],
    celebrity:    [/\b(celebrity|net worth|famous|actor|singer|rapper|influencer|biography)\b/, ["gold_luxury", "pink_neon", "rose_gold"]],
    entertainment:[/\b(movie|film|netflix|series|recap|box office|streaming)\b/, ["pink_neon", "purple_cosmic", "neon_green"]],
    social:       [/\b(social media|instagram|tiktok|youtube|viral|followers|subscribers)\b/, ["pink_neon", "neon_green", "electric_cyan"]],
    food:         [/\b(cooking|recipe|food|meal|kitchen|chef|baking|ingredient|calorie)\b/, ["rose_gold", "sunset_warm", "orange_fire"]],
    cars:         [/\b(car|automobile|vehicle|engine|horsepower|speed|racing|tesla|bmw)\b/, ["steel_grey", "red_energy", "midnight_blue"]],
    realestate:   [/\b(real estate|house|property|mortgage|rent|apartment|housing)\b/, ["gold_luxury", "steel_grey", "earth_brown"]],
    business:     [/\b(side hustle|passive income|make money|freelance|entrepreneur|startup|business)\b/, ["orange_fire", "gold_luxury", "electric_cyan"]],
    motivation:   [/\b(motivat|hustle|grind|success|winner|champion|goal|discipline|habit)\b/, ["sunset_warm", "orange_fire", "red_energy"]],
    sports:       [/\b(sport|nba|nfl|soccer|football|basketball|athlete|championship|olympic)\b/, ["red_energy", "steel_grey", "midnight_blue"]],
    science:      [/\b(science|physics|chemistry|biology|experiment|research|study|data)\b/, ["ice_blue", "electric_cyan", "teal_ocean"]],
    finance:      [/\b(invest|stock|dividend|portfolio|compound|index fund|etf|bond|market|finance|money|broke|salary|budget|saving|debt)\b/, ["blue_grid", "gold_luxury", "steel_grey"]],
    reddit:       [/\b(reddit|askreddit|aita|tifu|story time)\b/, ["neon_green", "orange_fire", "pink_neon"]],
    list:         [/\b(top \d|ranking|ranked|best|worst|most|biggest|smallest)\b/, ["aurora", "electric_cyan", "gold_luxury", "purple_cosmic", "ice_blue"]],
  };

  let matched = false;
  for (const [, [pattern, pool]] of Object.entries(topicThemePools)) {
    if (pattern.test(scriptLower)) {
      theme = pick(pool);
      matched = true;
      break;
    }
  }
  if (!matched) theme = pick(themePools.default);

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
  // Use actual audio file duration for accurate music trim
  let audioDuration = totalDuration;
  try {
    const probeOut = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${audioPath}"`,
      { encoding: 'utf8' }
    );
    const probeData = JSON.parse(probeOut);
    const audioStream = probeData.streams.find(s => s.codec_type === 'audio');
    if (audioStream?.duration) {
      audioDuration = parseFloat(audioStream.duration);
      console.log(`  Audio duration (ffprobe): ${audioDuration.toFixed(1)}s vs timestamps: ${totalDuration.toFixed(1)}s`);
    }
  } catch (e) {
    console.log(`  ffprobe failed, using timestamp duration: ${totalDuration.toFixed(1)}s`);
  }
  await mergeAudioVideoSimple(silentPath, audioPath, finalPath, musicTrack?.path || null, audioDuration);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  // --- STEP 6: Generate Thumbnail ---
  console.log(chalk.blue("\nGenerating thumbnail...\n"));
  try {
    // Use project name as title (cleaner than first script line)
    const thumbTitle = projectName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
        `[2:a]atrim=0:${duration},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3,volume=0.50[music];` +
        `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
        `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -ac 2 "${outputPath}"`,
        { stdio: "pipe" }
      );
      s.succeed("Merged with music");
      return;
    } catch (err) {
      const ffmpegErr = err?.stderr?.toString() || err?.message || 'unknown error';
      console.log(`\n  ⚠️  Music mix failed: ${ffmpegErr.slice(0, 200)}`);
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
