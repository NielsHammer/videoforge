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
import { pickThemeForTopic } from "./theme-picker.js";

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

async function craftAIPrompt(basicPrompt, clip, scriptText) {
  try {
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
    return response.data.content[0].text.trim();
  } catch {
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


// Validate that a file is actually an image by checking magic bytes
function isValidImageFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const size = fs.statSync(filePath).size;
    if (size < 5000) return false;
    // Read first 4 bytes and check magic bytes
    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
    // WEBP: starts with RIFF
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return true;
    return false;
  } catch { return false; }
}

export async function generateVideo(scriptPath, options) {
  const startTime = Date.now();
  const projectRoot = path.resolve(".");

  const spinner = ora("Reading script...").start();
  const scriptText = fs.readFileSync(path.resolve(scriptPath), "utf-8");
  spinner.succeed(`Script loaded (${scriptText.length} chars)`);

  const mood = detectMood(scriptText);
  console.log(chalk.blue(`🎵 Detected mood: ${mood}`));

  // --- STEP 1: Voice setup ---
  const timestamp = new Date().toISOString().slice(0, 10);
  const projectName = path.basename(scriptPath, path.extname(scriptPath));
  const folderName = options.orderId
    ? `order-${options.orderId}`
    : `${timestamp}-${projectName}`;
  const outputDir = path.resolve(options.output, folderName);
  const assetsDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  // --- THUMBNAIL-ONLY MODE ---
  if (options.render === false || options.noRender) {
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

  let voiceId;
  if (options.voice) {
    voiceId = await getVoiceId(options.voice);
    console.log(chalk.blue(`🎤  Voice override: ${options.voice}`));
  } else {
    const autoVoice = getAutoVoice(scriptText);
    voiceId = autoVoice.primary.voiceId;
    console.log(chalk.blue(`🎤  Auto-voice: ${autoVoice.primary.id} (${autoVoice.style} style)`));
  }
  const audioPath = path.join(assetsDir, "voiceover.mp3");
  const tsPath = path.join(assetsDir, "voiceover-timestamps.json");

  let wordTimestamps, totalDuration;

  if (options.skipVoice && fs.existsSync(audioPath) && fs.existsSync(tsPath)) {
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
    fs.writeFileSync(tsPath, JSON.stringify({ words: wordTimestamps, duration: totalDuration }, null, 2));
    const audioStat = fs.existsSync(audioPath) ? fs.statSync(audioPath) : null;
    if (!audioStat || audioStat.size < 1000) {
      throw new Error(`Voiceover file is empty or missing (${audioStat?.size || 0} bytes).`);
    }
    if (totalDuration < 10) {
      throw new Error(`Voiceover is only ${totalDuration.toFixed(1)}s — script may be too short.`);
    }
  }

  if (options.voiceOnly) {
    console.log(chalk.green.bold("\n✅ Voice-only complete."));
    return;
  }

  // --- STEP 2: Director creates storyboard ---
  const s2 = ora("Director creating storyboard...").start();
  const contentMode = detectContentMode(projectName, scriptText);
  console.log(chalk.blue(`🎯 Content mode: ${contentMode}`));
  // Pick theme BEFORE storyboard so director gets correct theme personality
  let theme = "blue_grid";
  if (options.theme) {
    theme = options.theme;
    console.log(chalk.blue(`🎨 Theme override: ${theme}`));
  } else {
    const themeTopic = options.topic || projectName.replace(/-/g, " ");
    theme = await pickThemeForTopic(themeTopic, scriptText) || "blue_grid";
    console.log(chalk.blue(`🎨 Claude picked theme: ${theme}`));
  }

  const clips = await createStoryboard(scriptText, wordTimestamps, totalDuration, contentMode, options.topic || "", theme);

  const numReveals = clips.filter(c => c.visual_type === "number_reveal").length;
  const comparisons = clips.filter(c => c.visual_type === "comparison").length;
  const sections = clips.filter(c => c.visual_type === "section_break").length;
  const stockClips = clips.filter(c => c.visual_type === "stock").length;
  const aiClips = clips.filter(c => c.visual_type === "ai_image").length;
  const textFlashes = clips.filter(c => c.visual_type === "text_flash").length;

  s2.succeed(`Storyboard: ${clips.length} clips (${stockClips} stock, ${aiClips} AI, ${numReveals} numbers, ${comparisons} comparisons, ${sections} sections, ${textFlashes} text)`);

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

  // --- STEP 3: Fetch visuals — NO CACHING, always fresh per clip ---
  console.log(chalk.blue("📷 Fetching visuals...\n"));

  const graphicTypes = [
    // Legacy infographics
    "number_reveal","comparison","section_break","text_flash",
    "line_chart","donut_chart","progress_bar","timeline","leaderboard",
    "process_flow","stat_card","quote_card","checklist",
    "horizontal_bar","vertical_bar","scale_comparison","map_highlight",
    "body_diagram","funnel_chart","growth_curve","ranking_cards",
    "split_comparison","icon_grid","flow_diagram",
    "interrupt_card","quote_pull","countdown_corner",
    // Batch 1 animations (no image needed)
    "kinetic_text","spotlight_stat","icon_burst",
    // Batch 2 animations (no image needed)
    "typewriter_reveal","money_counter","glitch_text","checkmark_build",
    "trend_arrow","stock_ticker","phone_screen","tweet_card","word_scatter",
    "social_counter","before_after","lightbulb_moment","rocket_launch",
    "news_breaking","percent_fill","compare_reveal",
    // Batch 3 animations (no image needed)
    "highlight_build","count_up","neon_sign","reaction_face",
    "thumbs_up","side_by_side","youtube_progress","warning_siren",
      // batch4 — pure graphic components, no image needed
  "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal","pro_con","score_card","person_profile","reddit_post","google_search","three_points","stacked_bar","countdown_timer","vote_bar","map_callout","news_headline","instagram_post","youtube_card","quiz_card","portfolio_breakdown","roi_calculator","timelapse_bar","speed_meter","candlestick_chart","conversation_bubble","loading_bar","wealth_ladder","rule_card","alert_banner","big_number","mindset_shift",
  // NOTE: quote_overlay, overlay_caption, polaroid_stack are NOT here
    // — they render over fetched images and need the pipeline to fetch them
  ];

  const webImageAvailable = isWebSearchAvailable();
  if (webImageAvailable) {
    console.log(chalk.gray("  🌐 Web Image Search enabled (Brave)"));
  }

  // Track used image paths within THIS video to prevent same image appearing twice
  const usedImagePaths = new Set();

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];

    if (graphicTypes.includes(clip.visual_type)) {
      clip.imagePath = null;
      clip.isCutout = false;
      continue;
    }

    // Feature 6: CTA image matching — override search query with CTA text for CTA clips
    if (
      clip.cta_text ||
      (clip.subtitle && /subscribe|follow|visit|check out|link|comment|like|turn on|notification|channel|website|click/i.test(clip.subtitle)) ||
      (clip.search_query && /subscribe|follow|visit|check out|link|comment|like|turn on|notification|channel|website|click/i.test(clip.search_query))
    ) {
      const ctaOverride = clip.cta_text || clip.search_query;
      clip.search_query = ctaOverride;
      clip.visual_type = clip.visual_type === 'ai_image' ? 'ai_image' : 'stock';
    }

    const s = ora(`Clip ${i + 1}: "${clip.search_query || clip.ai_prompt || ''}"...`).start();
    const baseName = `clip-${i + 1}`;
    const photoPath = path.join(assetsDir, `${baseName}.jpg`);
    const aiPath = path.join(assetsDir, `${baseName}-ai.jpg`);
    const webPath = path.join(assetsDir, `${baseName}-web.jpg`);

    // Helper: check if an image path was already used in this video
    const isAlreadyUsed = (p) => p && usedImagePaths.has(p);

    try {
      // Route 0: web_screenshot → treat as web_image
      if (clip.visual_type === "web_screenshot") {
        clip.visual_type = "web_image";
        clip.search_query = clip.screenshot_query || clip.search_query;
      }

      // Route 0.5: web_image → Brave search (always fresh, no cache)
      if (clip.visual_type === "web_image" && clip.search_query && webImageAvailable) {
        try {
          await searchWebImage(clip.search_query, webPath, clip);
          if (isValidImageFile(webPath) && !isAlreadyUsed(webPath)) {
            fixImageRotation(webPath);
            clip.imagePath = webPath;
            clip.isCutout = false;
            usedImagePaths.add(webPath);
            // Multi-image b-roll for web images
            if (clip.search_queries && clip.search_queries.length > 1) {
              clip.imagePaths = [webPath];
              for (let qi = 1; qi < Math.min(clip.search_queries.length, 3); qi++) {
                const extraWebPath = path.join(assetsDir, `${baseName}-web-broll-${qi}.jpg`);
                try {
                  await searchWebImage(clip.search_queries[qi], extraWebPath, clip);
                  if (isValidImageFile(extraWebPath)) {
                    fixImageRotation(extraWebPath);
                    clip.imagePaths.push(extraWebPath);
                  }
                } catch {}
              }
            }
            s.succeed(`Clip ${i + 1}: 🌐 web image ${clip.display_style}`);
            continue;
          }
        } catch {
          // fall through to AI
        }
        // Brave failed or returned duplicate — generate with AI
        s.text = `Clip ${i + 1}: Web miss → AI generating...`;
        try {
          const detailedPrompt = await craftAIPrompt(
            `Photorealistic photograph related to: ${clip.search_query}. Editorial style, high resolution.`,
            clip,
            scriptText
          );
          await generateAIImage(detailedPrompt, aiPath);
          if (isValidImageFile(aiPath)) {
            fixImageRotation(aiPath);
            clip.imagePath = aiPath;
            clip.isCutout = false;
            clip.visual_type = "ai_image";
            usedImagePaths.add(aiPath);
            s.succeed(`Clip ${i + 1}: AI 🎨 (web fallback) ${clip.display_style}`);
            continue;
          }
        } catch {
          clip.visual_type = "stock";
        }
      }

      // Route 1: ai_image → Claude refines prompt → Fal.ai (always fresh)
      if (clip.visual_type === "ai_image" && clip.ai_prompt) {
        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText);
        await generateAIImage(detailedPrompt, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        usedImagePaths.add(aiPath);
        s.succeed(`Clip ${i + 1}: AI 🎨 ${clip.display_style}`);
        continue;
      }

      // Route 2: stock → Pexels (always fresh)
      let pexelsOk = false;
      try {
        await fetchPhoto(clip.search_query, photoPath);
        if (isValidImageFile(photoPath)) {
          fixImageRotation(photoPath);
          clip.imagePath = photoPath;
          clip.isCutout = false;
          pexelsOk = true;
          usedImagePaths.add(photoPath);
          // Multi-image b-roll: fetch additional search_queries if provided
          if (clip.search_queries && clip.search_queries.length > 1) {
            clip.imagePaths = [photoPath];
            for (let qi = 1; qi < Math.min(clip.search_queries.length, 3); qi++) {
              const extraPath = path.join(assetsDir, `${baseName}-broll-${qi}.jpg`);
              try {
                await fetchPhoto(clip.search_queries[qi], extraPath);
                if (isValidImageFile(extraPath)) {
                  fixImageRotation(extraPath);
                  clip.imagePaths.push(extraPath);
                }
              } catch {}
            }
          }
          s.succeed(`Clip ${i + 1}: 📷 ${clip.display_style}${clip.imagePaths ? ` (b-roll: ${clip.imagePaths.length})` : ''}`);
        }
      } catch {}

      // Route 3: Pexels failed → AI generates (always fresh)
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
        usedImagePaths.add(aiPath);
        s.succeed(`Clip ${i + 1}: AI fallback 🎨 ${clip.display_style}`);
      }

    } catch {
      // Emergency fallback
      try {
        const emergency = `Professional cinematic photograph, ${clip.search_query || "dramatic scene"}, clean modern aesthetic, dramatic lighting, 16:9, high quality`;
        await generateAIImage(emergency, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        clip.visual_type = "ai_image";
        usedImagePaths.add(aiPath);
        s.succeed(`Clip ${i + 1}: AI emergency 🎨`);
      } catch {
        clip.imagePath = null;
        clip.isCutout = false;
        s.warn(`Clip ${i + 1}: no image`);
      }
    }
  }

  const finalAI = clips.filter(c => c.visual_type === "ai_image").length;
  if (finalAI > aiClips) {
    console.log(chalk.gray(`  ✔ AI replaced ${finalAI - aiClips} failed Pexels searches`));
  }

  // Remove clips with null/invalid imagePath — these would crash Remotion
  // Also clean up b-roll imagePaths to remove any files that don't exist or are invalid
  const imageTypes = ['stock', 'ai_image', 'web_image', 'web_screenshot'];
  // Clean up invalid b-roll paths
  clips.forEach(clip => {
    if (clip.imagePaths) {
      clip.imagePaths = clip.imagePaths.filter(p => isValidImageFile(p));
      if (clip.imagePaths.length === 0) clip.imagePaths = null;
    }
  });
  const badClips = clips.filter(clip => {
    if (!imageTypes.includes(clip.visual_type)) return false;
    if (clip.imagePath && isValidImageFile(clip.imagePath)) return false;
    return true;
  });
  if (badClips.length > 0) {
    badClips.forEach(clip => {
      console.log(chalk.yellow(`  ⚠️  Removing clip with missing image: ${clip.search_query || clip.visual_type}`));
      clips.splice(clips.indexOf(clip), 1);
    });
    console.log(chalk.yellow(`  ⚠️  Removed ${badClips.length} clips with missing images`));
  }

  // Select music
  let musicTrack = null;
  if (options.music !== false && !options.noMusic) {
    const ms = ora("Selecting background music...").start();
    musicTrack = selectMusicTrack(mood, projectRoot);
    if (musicTrack) {
      ms.succeed(`Music: ${musicTrack.name} (${musicTrack.mood})`);
    } else {
      ms.warn("No music — add .mp3 to music/ folder");
    }
  }
  fs.writeFileSync(path.join(outputDir, "storyboard.json"), JSON.stringify({ clips, wordTimestamps, totalDuration, theme }, null, 2));

  // --- STEP 4: Render ---
  console.log(chalk.blue("\n🎬 Rendering with Remotion...\n"));
  const silentPath = path.join(assetsDir, "remotion-output.mp4");
  await renderWithRemotion(clips, wordTimestamps, totalDuration, silentPath, assetsDir, theme);

  // --- STEP 5: Merge audio + video ---
  console.log(chalk.blue("\n🔊 Merging audio" + (musicTrack ? " + music" : "") + "...\n"));
  const finalPath = path.join(outputDir, "final.mp4");
  let audioDuration = totalDuration;
  try {
    const probeOut = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${audioPath}"`,
      { encoding: 'utf8', timeout: 30000 }
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
    const thumbTitle = projectName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const thumbTopic = options.topic || projectName.replace(/-/g, " ");
    await generateThumbnail(outputDir, thumbTitle, thumbTopic);
    console.log(chalk.green("  ✅ Thumbnail saved!"));
  } catch (thumbErr) {
    console.log(chalk.yellow("  ⚠️ Thumbnail skipped: " + thumbErr.message));
  }

  console.log(chalk.green.bold("\n✅ Video complete!"));
  console.log(chalk.white(`📁 Output: ${finalPath}`));
  console.log(chalk.white(`⏱️  Duration: ${(totalDuration / 60).toFixed(1)} minutes`));
  console.log(chalk.white(`🎬 Clips: ${clips.length}`));
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
        `[2:a]atrim=0:${duration},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3,volume=0.12[music];` +
        `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
        `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -ac 2 "${outputPath}"`,
        { stdio: "pipe", timeout: 1800000 }
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
      { stdio: "pipe", timeout: 1800000 }
    );
    s.succeed("Merged");
  } catch {
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k "${outputPath}"`,
      { stdio: "pipe", timeout: 1800000 }
    );
    s.succeed("Merged (re-encoded)");
  }
}
