import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ora from "ora";
import chalk from "chalk";
import { generateVoiceoverWithTimestamps, getVoiceId, loadCachedTimestamps } from "./elevenlabs.js";
import { getAudioDuration } from "./ffmpeg.js";
import { createStoryboard } from "./director.js";
import { fetchPhoto } from "./pexels.js";
import { removeBackground, generateAIImage } from "./fal.js";
import { detectMood, selectMusicTrack } from "./music.js";
import { renderWithRemotion } from "./remotion-renderer.js";

const CUTOUT_STYLES = ["cutout_right", "cutout_left", "cutout_center", "layered"];

function fixImageRotation(imagePath) {
  try {
    const tmpPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, "-fixed.$1");
    execSync(`ffmpeg -y -i "${imagePath}" -auto_orient -update 1 -q:v 2 "${tmpPath}" 2>/dev/null`);
    if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 0) {
      fs.renameSync(tmpPath, imagePath);
    }
  } catch {}
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

  const voice = options.voice || "S9GPGBaMND8XWwwzxQXp";
  const voiceId = await getVoiceId(voice);
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
    const s = ora("Generating voiceover with timestamps...").start();
    const result = await generateVoiceoverWithTimestamps(scriptText, voiceId, audioPath);
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
  const clips = await createStoryboard(scriptText, wordTimestamps, totalDuration);
  
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

  // --- STEP 3: Fetch visuals ---
  console.log(chalk.blue("📷 Fetching visuals...\n"));
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    
    // Skip visual fetch for non-visual types
    if (clip.visual_type === "number_reveal" || clip.visual_type === "comparison" || 
        clip.visual_type === "section_break" || clip.visual_type === "text_flash") {
      clip.imagePath = null;
      clip.isCutout = false;
      continue;
    }

    const s = ora(`Clip ${i + 1}: "${clip.search_query || clip.ai_prompt || ''}"...`).start();
    const baseName = `clip-${i + 1}`;
    const photoPath = path.join(assetsDir, `${baseName}.jpg`);
    const aiPath = path.join(assetsDir, `${baseName}-ai.jpg`);
    const cutoutPath = path.join(assetsDir, `${baseName}-cutout.png`);
    const needsCutout = CUTOUT_STYLES.includes(clip.display_style);

    try {
      // AI-generated image
      if (clip.visual_type === "ai_image" && clip.ai_prompt) {
        const prompt = `${clip.ai_prompt}, cinematic lighting, 16:9 aspect ratio, professional photography, high quality`;
        await generateAIImage(prompt, aiPath);
        fixImageRotation(aiPath);
        
        if (needsCutout) {
          try {
            await removeBackground(aiPath, cutoutPath);
            clip.imagePath = cutoutPath;
            clip.isCutout = true;
          } catch {
            clip.imagePath = aiPath;
            clip.isCutout = false;
          }
        } else {
          clip.imagePath = aiPath;
          clip.isCutout = false;
        }
        s.succeed(`Clip ${i + 1}: AI 🎨 ${clip.display_style}${clip.isCutout ? " ✂️" : ""}`);
        continue;
      }

      // Stock photo
      await fetchPhoto(clip.search_query, photoPath);
      fixImageRotation(photoPath);

      if (needsCutout) {
        try {
          await removeBackground(photoPath, cutoutPath);
          clip.imagePath = cutoutPath;
          clip.isCutout = true;
        } catch {
          clip.imagePath = photoPath;
          clip.isCutout = false;
        }
      } else {
        clip.imagePath = photoPath;
        clip.isCutout = false;
      }
      s.succeed(`Clip ${i + 1}: ${clip.display_style}${clip.isCutout ? " ✂️" : ""}`);
    } catch {
      try {
        await fetchPhoto(clip.search_query.split(" ").slice(0, 2).join(" "), photoPath);
        fixImageRotation(photoPath);
        clip.imagePath = photoPath;
        clip.isCutout = false;
        s.succeed(`Clip ${i + 1}: fallback`);
      } catch {
        clip.imagePath = null;
        clip.isCutout = false;
        s.warn(`Clip ${i + 1}: no image`);
      }
    }
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

  // Detect visual template from mood + content keywords
  const templateMap = {
    serious: "grid",
    motivational: "flames",
    calm: "ocean",
    dramatic: "stars",
    curious: "particles",
  };
  const scriptLower = scriptText.toLowerCase();
  let theme = templateMap[mood] || "grid";
  if (/\b(ai|artificial intelligence|machine learning|neural|algorithm|code|programming|software|data)\b/.test(scriptLower)) theme = "particles";
  if (/\b(crypto|bitcoin|blockchain|nft|web3)\b/.test(scriptLower)) theme = "radar";
  if (/\b(space|universe|cosmos|galaxy|astronomy|stars|planet|astronaut)\b/.test(scriptLower)) theme = "stars";
  if (/\b(health|medical|body|nutrition|diet|exercise|fitness|biology|dna|gene)\b/.test(scriptLower)) theme = "dna";
  if (/\b(travel|nature|landscape|adventure|explore|mountain|hiking|outdoor)\b/.test(scriptLower)) theme = "topography";
  if (/\b(luxury|premium|wealth|millionaire|billionaire|rich|gold)\b/.test(scriptLower)) theme = "diamond";
  if (/\b(city|urban|new york|tokyo|london|real estate|apartment|housing)\b/.test(scriptLower)) theme = "city";
  if (/\b(ocean|sea|water|marine|fish|diving|beach|surf)\b/.test(scriptLower)) theme = "ocean";
  if (/\b(fire|burn|passion|hustle|grind|motivation|success|win)\b/.test(scriptLower)) theme = "flames";
  console.log(chalk.blue(`🎨 Theme: ${theme}`));
  // CLI override
  if (options.theme) {
    const valid = ["grid","particles","topography","diamond","radar","dna","city","flames","ocean","stars"];
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
        `[2:a]atrim=0:${duration},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3,volume=0.07[music];` +
        `[1:a]asetpts=PTS-STARTPTS[voice];` +
        `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
        `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
        { stdio: "pipe" }
      );
      s.succeed("Merged with music");
      return;
    } catch {
      s.text = "Music mix failed, merging voice only...";
    }
  }

  try {
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
      { stdio: "pipe" }
    );
    s.succeed("Merged");
  } catch {
    execSync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k -shortest "${outputPath}"`,
      { stdio: "pipe" }
    );
    s.succeed("Merged (re-encoded)");
  }
}
