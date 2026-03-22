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

// FIX B: Exact word timestamp lookup — replaces proportional estimation.
// wordTimestamps = [{word, start, end}, ...] from ElevenLabs — exact timing per word.
function extractNarratedSentence(wordTimestamps, clipStart, clipEnd) {
  if (!wordTimestamps || wordTimestamps.length === 0) return "";
  const start = Math.max(0, clipStart - 0.1);
  const end = clipEnd + 0.3;
  const wordsInWindow = wordTimestamps.filter(w => w.start >= start && w.start <= end);
  if (wordsInWindow.length === 0) {
    // Nothing found — use closest words within 3 seconds
    const closest = wordTimestamps
      .filter(w => Math.abs(w.start - clipStart) < 3.0)
      .slice(0, 15);
    return closest.map(w => w.word).join(" ").trim();
  }
  return wordsInWindow.map(w => w.word).join(" ").trim().slice(0, 250);
}

async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0) {
  // Extract what the narrator is actually saying at this clip's timestamp
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || clipStart + 3;
  const isHistorical = eraContext && eraContext !== "modern" && eraContext !== "";

  // FIXED Bug 1: get the specific sentence being narrated here, not the generic search_query.
  // Before: every clip got "ancient roman empire scene: ancient roman ruins" → same image.
  // After: each clip gets the actual narrator sentence → specific, varied prompts.
  const narratedSentence = extractNarratedSentence(scriptText, clipStart, clipEnd, totalDuration);

  const styleGuide = isHistorical
    ? `- Style: epic historical painting meets cinematic photography, period-accurate, dramatic chiaroscuro lighting, 16:9 aspect ratio
- CRITICAL: No modern elements — no contemporary clothing, no gym equipment, no smartphones, no modern architecture
- Include: period-accurate costumes, ancient/medieval settings, historically accurate details
- Mood: cinematic, epic, like a scene from Gladiator or Kingdom of Heaven`
    : `- Style: photorealistic, cinematic, 16:9 aspect ratio
- Always include "high quality, sharp focus, professional photography"`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `You are an expert at writing Flux image generation prompts for YouTube videos.

The narrator is saying: "${narratedSentence || basicPrompt}"
${isHistorical ? `ERA: ${eraContext} — period-accurate visuals only. No modern elements ever.` : ""}

Write ONE image prompt (30-50 words) showing what a viewer should SEE while hearing that sentence.
Be SPECIFIC to what the narrator describes — not a generic era establishing shot.
Every clip in this video must look DIFFERENT — vary subject, angle, and focus.

WRONG (too generic): "Ancient Roman empire gate with soldiers, cinematic"
RIGHT (specific): "Fourteen-year-old boy on oversized golden throne, Germanic warriors visible in archway, dramatic low-angle shot"

Rules:
- Show exactly what narrator describes
- Include: specific subject, setting, lighting, camera angle
${styleGuide}
- NO text or watermarks in image

Return ONLY the prompt.`
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
    const fallback = narratedSentence
      ? `${eraContext ? eraContext + ": " : ""}${narratedSentence.slice(0, 80)}, cinematic, 16:9`
      : `${basicPrompt}, cinematic lighting, photorealistic, 16:9`;
    return fallback;
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

  let wordTimestamps, totalDuration, cachedEnhanced = null;

  if (options.skipVoice && fs.existsSync(audioPath) && fs.existsSync(tsPath)) {
    const s = ora("Loading cached voiceover...").start();
    const cached = JSON.parse(fs.readFileSync(tsPath, "utf-8"));
    wordTimestamps = cached.words;
    totalDuration = cached.duration;
    cachedEnhanced = cached.enhancedScript || null;
    s.succeed(`Voiceover: cached (${totalDuration.toFixed(1)}s, ${wordTimestamps.length} words)`);
  } else {
    const enhancedScript = enhanceScript(scriptText, mood || "default");
    const s = ora("Generating voiceover with timestamps...").start();
    const result = await generateVoiceoverWithTimestamps(enhancedScript, voiceId, audioPath);
    wordTimestamps = result.words;
    totalDuration = result.duration;
    s.succeed(`Voiceover: ${totalDuration.toFixed(1)}s, ${wordTimestamps.length} words with timestamps`);
    // Store enhancedScript so --skip-voice uses same text as timestamps
    fs.writeFileSync(tsPath, JSON.stringify({ words: wordTimestamps, duration: totalDuration, enhancedScript }, null, 2));
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
  // Use enhancedScript for sentence matching — must match ElevenLabs timestamps exactly
  const storyboardScript = cachedEnhanced || scriptText;

  // Full order brief — read from --brief-file if provided (worker.js path),
  // or fall back to individual CLI options / env vars (manual/local use)
  let orderBrief = {
    topic:           options.topic          || "",
    niche:           options.niche          || process.env.ORDER_NICHE      || "",
    tone:            options.tone           || process.env.ORDER_TONE       || "",
    keyPoints:       options.keyPoints      || process.env.ORDER_KEY_POINTS || "",
    callToAction:    options.callToAction   || process.env.ORDER_CTA        || "",
    narrator:        options.narrator       || process.env.ORDER_NARRATOR   || "",
    videoLength:     options.videoLength    || process.env.ORDER_LENGTH     || "",
    backgroundStyle: options.backgroundStyle|| process.env.ORDER_BG_STYLE  || "",
  };
  if (options.briefFile && fs.existsSync(options.briefFile)) {
    try {
      const briefData = JSON.parse(fs.readFileSync(options.briefFile, "utf-8"));
      // Merge: briefFile values override defaults but don't overwrite explicit CLI flags
      orderBrief = { ...orderBrief, ...briefData };
      console.log(chalk.gray(`  Order brief loaded: niche=${orderBrief.niche||"auto"}, tone=${orderBrief.tone||"auto"}`));
    } catch (e) {
      console.log(chalk.yellow(`  ⚠️ Could not read brief file: ${e.message}`));
    }
  }

  const storyboardResult = await createStoryboard(storyboardScript, wordTimestamps, totalDuration, contentMode, options.topic || "", options.theme || "blue_grid", orderBrief);
  const clips = storyboardResult.clips || storyboardResult; // backward compat if bible failed

  const numReveals = clips.filter(c => c.visual_type === "number_reveal").length;
  const comparisons = clips.filter(c => c.visual_type === "comparison").length;
  const sections = clips.filter(c => c.visual_type === "section_break").length;
  const stockClips = clips.filter(c => c.visual_type === "stock").length;
  const aiClips = clips.filter(c => c.visual_type === "ai_image").length;
  const textFlashes = clips.filter(c => c.visual_type === "text_flash").length;

  // Extract videoBible from storyboard for era-aware image routing
  const videoBible = storyboardResult.videoBible || {};
  const videoEra = videoBible.era || "modern";
  const isHistoricalEra = videoEra !== "modern" && videoEra !== "timeless" && videoEra !== "";
  const bannedVisuals = videoBible.banned_visuals || [];
  const imagePrefix = videoBible.image_search_prefix || "";

  if (isHistoricalEra) {
    console.log(chalk.cyan(`  📜 Historical era detected: ${videoBible.era_specific || videoEra} — Pexels bypassed, using Brave+AI only`));
  }

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
    // NOTE: quote_overlay, overlay_caption, polaroid_stack are NOT here
    // — they render over fetched images and need the pipeline to fetch them
  ];

  const webImageAvailable = isWebSearchAvailable();
  if (webImageAvailable) {
    console.log(chalk.gray("  🌐 Web Image Search enabled (Brave)"));
  }

  // Track used images by path AND content fingerprint to catch all duplicates.
  // Path-only misses: same image URL downloaded twice to different filenames.
  const usedImagePaths = new Set();
  const usedImageHashes = new Set();

  const getImageFingerprint = (filePath) => {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(4096);
      const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
      fs.closeSync(fd);
      return buf.slice(0, bytesRead).toString('hex');
    } catch { return null; }
  };

  const isImageDuplicate = (filePath) => {
    if (!filePath) return false;
    if (usedImagePaths.has(filePath)) return true;
    const hash = getImageFingerprint(filePath);
    return !!(hash && usedImageHashes.has(hash));
  };

  const markImageUsed = (filePath) => {
    if (!filePath) return;
    usedImagePaths.add(filePath);
    const hash = getImageFingerprint(filePath);
    if (hash) usedImageHashes.add(hash);
  };

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

    // FIX D: If stock query is < 3 words, it's too vague — rebuild from narrated sentence.
    // "doctor" → "doctor examining patient reviewing red meat nutrition study, medical office"
    // Only fires for stock clips with vague queries — targeted, not every clip.
    if (
      clip.visual_type === "stock" &&
      clip.text &&
      (clip.search_query || "").split(/\s+/).filter(Boolean).length < 3
    ) {
      try {
        const qResp = await axios.post(
          "https://api.anthropic.com/v1/messages",
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 60,
            messages: [{
              role: "user",
              content: `Narrator says: "${clip.text.slice(0, 150)}"
${(isHistoricalEra && videoBible.era_specific) ? `ERA: ${videoBible.era_specific} — period-accurate only, no modern elements` : ""}

Write a 5-8 word image search query showing what a viewer SEES while hearing this.
Be specific about the scene, not just the subject.
Good: "ancient roman senate debate marble columns dramatic" (not "roman")
Good: "doctor reviewing nutrition research red meat study" (not "doctor")
Good: "woman eating steak restaurant satisfied expression" (not "food")
Return ONLY the search query.`
            }],
          },
          { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, timeout: 8000 }
        );
        const newQ = qResp.data.content[0].text.trim().replace(/['"]/g, "").slice(0, 100);
        if (newQ.split(/\s+/).length >= 3) {
          clip.search_query = (isHistoricalEra && imagePrefix)
            ? `${imagePrefix} ${newQ}`
            : newQ;
        }
      } catch { /* keep original query if this fails */ }
    }

    const s = ora(`Clip ${i + 1}: "${clip.search_query || clip.ai_prompt || ''}"...`).start();
    const baseName = `clip-${i + 1}`;
    const photoPath = path.join(assetsDir, `${baseName}.jpg`);
    const aiPath = path.join(assetsDir, `${baseName}-ai.jpg`);
    const webPath = path.join(assetsDir, `${baseName}-web.jpg`);

    try {
      // Route 0: web_screenshot → treat as web_image
      if (clip.visual_type === "web_screenshot") {
        clip.visual_type = "web_image";
        clip.search_query = clip.screenshot_query || clip.search_query;
      }

      // Route 0.5: web_image → Brave search (always fresh, no cache)
      // FIX C: Apply era prefix here too — previously missing, allowed modern images in historical videos.
      if (clip.visual_type === "web_image" && clip.search_query && webImageAvailable) {
        try {
          const webQuery05 = (isHistoricalEra && imagePrefix)
            ? `${imagePrefix} ${clip.search_query}`
            : clip.search_query;
          await searchWebImage(webQuery05, webPath, { ...clip, era: videoBible.era_specific });
          if (isValidImageFile(webPath) && !isImageDuplicate(webPath)) {
            fixImageRotation(webPath);
            clip.imagePath = webPath;
            clip.isCutout = false;
            markImageUsed(webPath);
            // Multi-image b-roll for web images
            // FIX 1b: deduplicate Brave b-roll panels same as Pexels — prevents identical panels.
            if (clip.search_queries && clip.search_queries.length > 1) {
              clip.imagePaths = [webPath];
              const panelHashesW = new Set([getImageFingerprint(webPath)].filter(Boolean));
              for (let qi = 1; qi < Math.min(clip.search_queries.length, 4); qi++) {
                const extraWebPath = path.join(assetsDir, `${baseName}-web-broll-${qi}.jpg`);
                try {
                  const eraQ = (isHistoricalEra && imagePrefix)
                    ? `${imagePrefix} ${clip.search_queries[qi]}`
                    : clip.search_queries[qi];
                  await searchWebImage(eraQ, extraWebPath, { ...clip, era: videoBible.era_specific });
                  if (isValidImageFile(extraWebPath)) {
                    const hash = getImageFingerprint(extraWebPath);
                    if (hash && panelHashesW.has(hash)) { try { fs.unlinkSync(extraWebPath); } catch {} continue; }
                    if (isImageDuplicate(extraWebPath)) { try { fs.unlinkSync(extraWebPath); } catch {} continue; }
                    fixImageRotation(extraWebPath);
                    panelHashesW.add(hash);
                    markImageUsed(extraWebPath);
                    clip.imagePaths.push(extraWebPath);
                  }
                } catch {}
                if (clip.imagePaths.length >= 3) break;
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
            isHistoricalEra
              ? `${videoBible.era_specific || videoEra} historical scene: ${clip.search_query}. Period-accurate, cinematic.`
              : `Photorealistic photograph related to: ${clip.search_query}. Editorial style, high resolution.`,
            clip,
            scriptText,
            videoBible.era_specific || videoEra,
            wordTimestamps
          );
          await generateAIImage(detailedPrompt, aiPath);
          if (isValidImageFile(aiPath)) {
            fixImageRotation(aiPath);
            clip.imagePath = aiPath;
            clip.isCutout = false;
            clip.visual_type = "ai_image";
            markImageUsed(aiPath);
            s.succeed(`Clip ${i + 1}: AI 🎨 (web fallback) ${clip.display_style}`);
            continue;
          }
        } catch {
          clip.visual_type = "stock";
        }
      }

      // Route 1: ai_image → Claude refines prompt → Fal.ai (always fresh)
      if (clip.visual_type === "ai_image" && clip.ai_prompt) {
        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps);
        await generateAIImage(detailedPrompt, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        markImageUsed(aiPath);
        s.succeed(`Clip ${i + 1}: AI 🎨 ${clip.display_style}`);
        continue;
      }

      // Route 2: stock → Pexels (skip for historical eras — Pexels returns modern photos)
      let pexelsOk = false;
      if (!isHistoricalEra) {
        try {
          await fetchPhoto(clip.search_query, photoPath);
          if (isValidImageFile(photoPath)) {
            if (!isImageDuplicate(photoPath)) {
              fixImageRotation(photoPath);
              clip.imagePath = photoPath;
              clip.isCutout = false;
              pexelsOk = true;
              markImageUsed(photoPath);
              // Multi-image b-roll: fetch additional search_queries if provided
              // FIX 1a: deduplicate each panel image against all previous ones (path + content hash).
              // Without this, two different queries can return the same Pexels photo → duplicate panels.
              if (clip.search_queries && clip.search_queries.length > 1) {
                clip.imagePaths = [photoPath];
                const panelHashes = new Set([getImageFingerprint(photoPath)].filter(Boolean));
                for (let qi = 1; qi < Math.min(clip.search_queries.length, 4); qi++) {
                  const extraPath = path.join(assetsDir, `${baseName}-broll-${qi}.jpg`);
                  try {
                    await fetchPhoto(clip.search_queries[qi], extraPath);
                    if (isValidImageFile(extraPath)) {
                      const hash = getImageFingerprint(extraPath);
                      // Skip if same content as any panel already added
                      if (hash && panelHashes.has(hash)) {
                        fs.unlinkSync(extraPath);
                        continue;
                      }
                      // Skip if same content as any image in this whole video
                      if (isImageDuplicate(extraPath)) {
                        fs.unlinkSync(extraPath);
                        continue;
                      }
                      fixImageRotation(extraPath);
                      panelHashes.add(hash);
                      markImageUsed(extraPath);
                      clip.imagePaths.push(extraPath);
                    }
                  } catch {}
                  // Stop once we have 3 unique panels
                  if (clip.imagePaths.length >= 3) break;
                }
              }
              s.succeed(`Clip ${i + 1}: 📷 ${clip.display_style}${clip.imagePaths ? ` (b-roll: ${clip.imagePaths.length})` : ''}`);
            }
          }
        } catch {}
      } else {
        // Historical era: try Brave first with era-aware query
        const historicalQuery = imagePrefix ? `${imagePrefix} ${clip.search_query}` : clip.search_query;
        if (webImageAvailable) {
          try {
            await searchWebImage(historicalQuery, webPath, { ...clip, era: videoBible.era_specific });
            if (isValidImageFile(webPath) && !isImageDuplicate(webPath)) {
              const eraOk = await isImageEraAppropriate(webPath, historicalQuery, videoEra, videoBible.era_specific);
              if (eraOk) {
                fixImageRotation(webPath);
                clip.imagePath = webPath;
                clip.isCutout = false;
                pexelsOk = true;
                markImageUsed(webPath);
                s.succeed(`Clip ${i + 1}: 🌐 historical web image ${clip.display_style}`);
              }
            }
          } catch {}
        }
      }

      // Route 3: Pexels/Brave failed or era mismatch → AI generates period-accurate image
      if (!pexelsOk) {
        s.text = `Clip ${i + 1}: ${isHistoricalEra ? "Historical AI" : "Pexels miss"} → generating...`;
        const basePrompt = isHistoricalEra
          ? `${videoBible.era_specific || videoEra} historical scene: ${clip.search_query || "ancient scene"}. Period-accurate, no modern elements, cinematic, dramatic lighting, painterly quality.`
          : clip.search_query || "professional scene";
        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps);
        await generateAIImage(detailedPrompt, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        clip.visual_type = "ai_image";
        markImageUsed(aiPath);
        s.succeed(`Clip ${i + 1}: AI fallback 🎨 ${clip.display_style}`);
      }

    } catch {
      // Emergency fallback
      try {
        const emergency = isHistoricalEra
          ? `${videoBible.era_specific || "historical"} scene: ${clip.search_query || "ancient scene"}, period-accurate, dramatic lighting, epic cinematic, no modern elements, 16:9`
          : `Professional cinematic photograph, ${clip.search_query || "dramatic scene"}, clean modern aesthetic, dramatic lighting, 16:9, high quality`;
        await generateAIImage(emergency, aiPath);
        fixImageRotation(aiPath);
        clip.imagePath = aiPath;
        clip.isCutout = false;
        clip.visual_type = "ai_image";
        markImageUsed(aiPath);
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
  // Clean up invalid b-roll paths + enforce panel uniqueness by content hash
  // FIX 1c: final deduplication pass on all imagePaths arrays.
  // Catches any panels that slipped through with duplicate content.
  clips.forEach(clip => {
    if (clip.imagePaths) {
      clip.imagePaths = clip.imagePaths.filter(p => isValidImageFile(p));
      if (clip.imagePaths.length === 0) {
        clip.imagePaths = null;
      } else if (clip.imagePaths.length > 1) {
        // Deduplicate panels by content fingerprint
        const seenHashes = new Set();
        clip.imagePaths = clip.imagePaths.filter(p => {
          const h = getImageFingerprint(p);
          if (!h) return true; // can't fingerprint, keep it
          if (seenHashes.has(h)) return false; // duplicate — remove
          seenHashes.add(h);
          return true;
        });
        if (clip.imagePaths.length === 0) clip.imagePaths = null;
      }
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

  // --- Theme detection: Claude picks the best theme for the topic ---
  let theme = "blue_grid"; // safe default
  if (!options.theme) {
    const themeTopic = options.topic || projectName.replace(/-/g, " ");
    theme = await pickThemeForTopic(themeTopic, scriptText);
    if (!theme) theme = "blue_grid"; // fallback if Claude fails
  } else {
    theme = options.theme;
    console.log(chalk.blue(`🎨 Theme override: ${theme}`));
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
        `[2:a]atrim=0:${duration},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3,volume=0.0[music];` +
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
