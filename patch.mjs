#!/usr/bin/env node
/**
 * VF Bug Fix Patch — All bugs fixed in one pass
 *
 * Bug 1: AI images all look the same — craftAIPrompt uses generic search_query not actual sentence
 * Bug 2: Image deduplication by content hash, not just file path
 * Bug 3/4: Stock-run-breaker generates kinetic_text from search_query words (word salad on screen)
 */

import fs from 'fs';

// ─── DIRECTOR.JS: Fix Bug 3/4 ────────────────────────────────────────────────
{
  const file = '/opt/videoforge/src/director.js';
  let code = fs.readFileSync(file, 'utf8');
  let fixes = 0;

  const OLD = `  // Break up runs of 3+ consecutive stock clips by inserting kinetic_text
  {
    let stockRun = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "stock") {
        stockRun++;
        if (stockRun >= 3 && allClips[i].end_time - allClips[i].start_time >= 3.5) {
          // Convert this stock clip to kinetic_text using its search_query words
          const q = allClips[i].search_query || "";
          const words = q.split(/\\s+/).filter(w => w.length > 3 && !/^(and|the|for|with|from|into)$/.test(w)).slice(0, 2).map(w => w.toUpperCase());
          if (words.length >= 2) {
            allClips[i].visual_type = "kinetic_text";
            allClips[i].animation_data = { lines: words, style: "impact" };
            allClips[i].imagePath = null;
            stockRun = 0;
          }
        }
      } else {
        stockRun = 0;
      }
    }
  }`;

  const NEW = `  // Break up runs of 3+ consecutive stock clips — FIXED: never use search_query words.
  // Root cause of Bug 3/4: "ancient roman ruins" search_query → "ANCIENT ROMAN" kinetic_text
  // on screen. Search queries are for image engines, NOT for displaying as text to viewers.
  // Fix: vary display_style and image query instead. Only use kinetic_text if we have a real
  // stored sentence from the script on the clip object.
  {
    const ktStop = new Set(["the","and","but","for","with","this","that","have","from","they","their","your","you","was","are","were","has","had","not","can","will","would","could","should","what","when","where","how","why","who","which","been","being","than","then","into","just","more","most","some","such","even","also","very","show","means","nearly","about"]);
    let stockRun = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "stock") {
        stockRun++;
        if (stockRun >= 3 && allClips[i].end_time - allClips[i].start_time >= 3.5) {
          // Only use kinetic_text if the clip has a real stored sentence (not a search query)
          const sentText = allClips[i].sentence || allClips[i].text || "";
          const isRealSentence = sentText.split(/\\s+/).length > 5; // real sentences have 5+ words
          const sentWords = sentText
            .replace(/[^a-zA-Z\\s]/g, " ").split(/\\s+/)
            .filter(w => w.length > 3 && !ktStop.has(w.toLowerCase()))
            .slice(0, 2).map(w => w.toUpperCase());

          if (isRealSentence && sentWords.length >= 2) {
            // Real sentence words — safe to display on screen
            allClips[i].visual_type = "kinetic_text";
            allClips[i].animation_data = { lines: sentWords, style: "impact" };
            allClips[i].imagePath = null;
            stockRun = 0;
          } else {
            // No sentence — just vary the image to break visual monotony
            const niche = nicheInfo?.niche || "general";
            const pool = nicheSafeQueries[niche] || nicheSafeQueries.general;
            const altStyles = ["framed", "split_left", "split_right"];
            allClips[i].search_query = pool[(i + stockRun) % pool.length];
            allClips[i].display_style = altStyles[stockRun % altStyles.length];
            stockRun = 0;
          }
        }
      } else {
        stockRun = 0;
      }
    }
  }`;

  if (code.includes(OLD)) {
    code = code.replace(OLD, NEW);
    fixes++;
    console.log('✅ Bug 3/4 fixed: stock-run-breaker no longer puts search_query words on screen');
  } else {
    console.log('❌ Bug 3/4: anchor not found in director.js');
  }

  fs.writeFileSync(file, code);
  console.log(`director.js: ${fixes}/1 fixes applied\n`);
}

// ─── PIPELINE.JS: Fix Bug 1 + Bug 2 ─────────────────────────────────────────
{
  const file = '/opt/videoforge/src/pipeline.js';
  let code = fs.readFileSync(file, 'utf8');
  let fixes = 0;

  // FIX 1: Replace craftAIPrompt — use actual narrated sentence, not generic search_query
  const OLD_CRAFT = `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "") {
  try {
    const clipStart = clip.start_time || 0;
    const clipEnd = clip.end_time || clipStart + 3;
    const isHistorical = eraContext && eraContext !== "modern" && eraContext !== "";
    const styleGuide = isHistorical
      ? \`- Style: epic historical painting meets cinematic photography, period-accurate, dramatic chiaroscuro lighting, 16:9 aspect ratio
- CRITICAL: No modern elements whatsoever — no contemporary clothing, no gym equipment, no smartphones, no modern architecture
- Include: period-accurate costumes, ancient/medieval settings, historically accurate details
- Mood: cinematic, epic, like a scene from Gladiator or Kingdom of Heaven\`
      : \`- Style: photorealistic, cinematic, 16:9 aspect ratio
- Always include "high quality, sharp focus, professional photography"\`;

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: \`You are an expert at writing prompts for AI image generation (Flux model).

Given this context from a video script, write ONE detailed image generation prompt (30-50 words) that would create the perfect visual for this moment.
\${isHistorical ? \`
ERA CONTEXT: \${eraContext} — ALL visuals must be period-accurate. This is non-negotiable.
\` : ""}
Basic concept: "\${basicPrompt}"
Script excerpt (nearby context): "\${scriptText.slice(0, 500)}"
Clip timing: \${clipStart.toFixed(1)}s - \${clipEnd.toFixed(1)}s

Rules:
- Describe a specific, concrete scene (not abstract concepts)
- Include: subject, setting, lighting, camera angle, mood
\${styleGuide}
- NO text or words in the image
- NO watermarks or logos

Return ONLY the prompt, nothing else.\`
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
    return \`\${basicPrompt}, cinematic lighting, photorealistic, 16:9 aspect ratio, professional photography, high quality, sharp focus, dark moody background\`;
  }
}`;

  const NEW_CRAFT = `// Extract the sentence being narrated at clipStart..clipEnd.
// Splits script into sentences, uses clip's proportional position in video to find the right one.
function extractNarratedSentence(scriptText, clipStart, clipEnd, totalDuration) {
  if (!scriptText || !totalDuration) return "";
  const sentences = scriptText
    .replace(/<[^>]+>/g, " ")
    .split(/(?<=[.!?])\\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  if (sentences.length === 0) return "";
  // Map clip time to sentence index proportionally
  const startRatio = Math.max(0, clipStart / totalDuration);
  const endRatio = Math.min(1, clipEnd / totalDuration);
  const startIdx = Math.floor(startRatio * sentences.length);
  const endIdx = Math.min(Math.ceil(endRatio * sentences.length), sentences.length - 1);
  return sentences.slice(Math.max(0, startIdx), endIdx + 1).join(" ").slice(0, 250);
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
    ? \`- Style: epic historical painting meets cinematic photography, period-accurate, dramatic chiaroscuro lighting, 16:9 aspect ratio
- CRITICAL: No modern elements — no contemporary clothing, no gym equipment, no smartphones, no modern architecture
- Include: period-accurate costumes, ancient/medieval settings, historically accurate details
- Mood: cinematic, epic, like a scene from Gladiator or Kingdom of Heaven\`
    : \`- Style: photorealistic, cinematic, 16:9 aspect ratio
- Always include "high quality, sharp focus, professional photography"\`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: \`You are an expert at writing Flux image generation prompts for YouTube videos.

The narrator is saying: "\${narratedSentence || basicPrompt}"
\${isHistorical ? \`ERA: \${eraContext} — period-accurate visuals only. No modern elements ever.\` : ""}

Write ONE image prompt (30-50 words) showing what a viewer should SEE while hearing that sentence.
Be SPECIFIC to what the narrator describes — not a generic era establishing shot.
Every clip in this video must look DIFFERENT — vary subject, angle, and focus.

WRONG (too generic): "Ancient Roman empire gate with soldiers, cinematic"
RIGHT (specific): "Fourteen-year-old boy on oversized golden throne, Germanic warriors visible in archway, dramatic low-angle shot"

Rules:
- Show exactly what narrator describes
- Include: specific subject, setting, lighting, camera angle
\${styleGuide}
- NO text or watermarks in image

Return ONLY the prompt.\`
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
      ? \`\${eraContext ? eraContext + ": " : ""}\${narratedSentence.slice(0, 80)}, cinematic, 16:9\`
      : \`\${basicPrompt}, cinematic lighting, photorealistic, 16:9\`;
    return fallback;
  }
}`;

  if (code.includes(OLD_CRAFT)) {
    code = code.replace(OLD_CRAFT, NEW_CRAFT);
    fixes++;
    console.log('✅ Bug 1 fixed: craftAIPrompt now uses narrated sentence per clip');
  } else {
    console.log('❌ Bug 1: craftAIPrompt anchor not found in pipeline.js');
  }

  // Update callers to pass totalDuration
  let callerCount = 0;
  const callerPatterns = [
    [
      `videoBible.era_specific || videoEra\n          )`,
      `videoBible.era_specific || videoEra,\n            totalDuration\n          )`
    ],
    [
      `await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra)`,
      `await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration)`
    ],
    [
      `await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra)`,
      `await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration)`
    ],
  ];
  for (const [oldStr, newStr] of callerPatterns) {
    if (code.includes(oldStr) && oldStr !== newStr) {
      code = code.replace(oldStr, newStr);
      callerCount++;
    }
  }
  if (callerCount > 0) {
    fixes++;
    console.log(`✅ Bug 1 callers: updated ${callerCount} craftAIPrompt calls to pass totalDuration`);
  }

  // FIX 2: Content-hash deduplication
  const OLD_SET = `  // Track used image paths within THIS video to prevent same image appearing twice
  const usedImagePaths = new Set();`;

  const NEW_SET = `  // Track used images by path AND content fingerprint to catch all duplicates.
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
  };`;

  if (code.includes(OLD_SET)) {
    code = code.replace(OLD_SET, NEW_SET);
    fixes++;
    console.log('✅ Bug 2 (part 1): added content-hash dedup helpers');
  } else {
    console.log('❌ Bug 2: usedImagePaths Set anchor not found');
  }

  // Remove inline isAlreadyUsed helper
  code = code.replace(
    /\n\s*\/\/ Helper: check if an image path was already used in this video\s*\n\s*const isAlreadyUsed = \(p\) => p && usedImagePaths\.has\(p\);\n/g,
    '\n'
  );

  // Swap all call sites
  const dupBefore = (code.match(/isAlreadyUsed\(/g) || []).length;
  const addBefore = (code.match(/usedImagePaths\.add\(/g) || []).length;
  code = code.replace(/!isAlreadyUsed\(/g, '!isImageDuplicate(');
  code = code.replace(/isAlreadyUsed\(/g, 'isImageDuplicate(');
  code = code.replace(/usedImagePaths\.add\(/g, 'markImageUsed(');
  if (dupBefore + addBefore > 0) {
    fixes++;
    console.log(`✅ Bug 2 (part 2): replaced ${dupBefore} isAlreadyUsed() + ${addBefore} usedImagePaths.add() calls`);
  }

  fs.writeFileSync(file, code);
  console.log(`\npipeline.js: ${fixes}/4 fixes applied`);
}

console.log(`
All done. Now run in SSH terminal:
  pm2 restart videoforge-worker
  git add -A
  git commit -m "Fix bugs 1-4: AI prompts use narrated sentence, kinetic_text from real sentence words only, image dedup by content hash"
  git push
`);
