#!/usr/bin/env node
/**
 * VF Root Cause Fix — Batch 2
 *
 * Fix A: clip.text not preserved through validateAndSyncClips
 * Fix B: craftAIPrompt uses proportional estimate — replace with exact word timestamps
 * Fix C: Route 0.5 (web_image) ignores era prefix — modern images slip in
 * Fix D: Stock search queries too vague — rebuild from narrated sentence
 * Fix E: Audio/video sync — +300ms on sentence end for ElevenLabs trailing audio
 * Fix F: Era prefix not injected into all search queries in validateAndSyncClips
 */

import fs from 'fs';

// ─── DIRECTOR.JS ─────────────────────────────────────────────────────────────
{
  const file = '/opt/videoforge/src/director.js';
  let code = fs.readFileSync(file, 'utf8');
  let fixes = 0;

  // FIX A: Preserve window.text on each output clip.
  // validateAndSyncClips forces timing fields but drops the sentence text.
  // Everything downstream that needs the real narrated sentence gets undefined.
  const OLD_A = `    // FORCE timing to match window exactly
    clip.start_time = window.start;
    clip.end_time = window.end;
    clip.subtitle_words = [];`;

  const NEW_A = `    // FORCE timing to match window exactly
    clip.start_time = window.start;
    clip.end_time = window.end;
    clip.subtitle_words = [];
    // FIX A: carry the narrated sentence onto every clip object.
    // Without this, craftAIPrompt, stock-run-breaker, and kinetic text all get undefined.
    if (window.text && !clip.text) clip.text = window.text;`;

  if (code.includes(OLD_A)) { code = code.replace(OLD_A, NEW_A); fixes++; console.log('✅ Fix A: clip.text preserved from window'); }
  else console.log('❌ Fix A: anchor not found');

  // FIX F part 1: Add videoBible param to validateAndSyncClips signature
  const OLD_F1 = `function validateAndSyncClips(clips, windows, nicheInfo) {`;
  const NEW_F1 = `function validateAndSyncClips(clips, windows, nicheInfo, videoBible = {}) {`;

  if (code.includes(OLD_F1)) { code = code.replace(OLD_F1, NEW_F1); fixes++; console.log('✅ Fix F1: validateAndSyncClips signature updated'); }
  else console.log('❌ Fix F1: signature not found');

  // FIX F part 2: Pass videoBible at the call site inside directClipWindows (line 1780)
  const OLD_F2 = `    clips = validateAndSyncClips(clips, windows, nicheInfo);`;
  const NEW_F2 = `    clips = validateAndSyncClips(clips, windows, nicheInfo, videoBible);`;

  if (code.includes(OLD_F2)) { code = code.replace(OLD_F2, NEW_F2); fixes++; console.log('✅ Fix F2: validateAndSyncClips now receives videoBible at call site'); }
  else console.log('❌ Fix F2: call site not found');

  // FIX F part 3: Inject era prefix into ALL stock search queries at sanitisation time.
  // Root cause: director generates "doctor nutrition" with no era context.
  // The pipeline's historical Brave route only adds the prefix at fetch time,
  // but the stored query on the clip remains era-blind.
  const OLD_F3 = `    let q = (clip.search_query || "").toLowerCase();
    banned.forEach(b => { q = q.replace(new RegExp(\`\\\\b\${b}\\\\b\`, "gi"), "").trim(); });
    if (bannedVisuals.some(b => q.includes(b))) {
      q = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[Math.floor(Math.random() * 5)];
    }
    if (q.length < 3) {
      q = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[i % 5];
    }
    clip.search_query = q;`;

  const NEW_F3 = `    let q = (clip.search_query || "").toLowerCase();
    banned.forEach(b => { q = q.replace(new RegExp(\`\\\\b\${b}\\\\b\`, "gi"), "").trim(); });
    if (bannedVisuals.some(b => q.includes(b))) {
      q = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[Math.floor(Math.random() * 5)];
    }
    if (q.length < 3) {
      q = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[i % 5];
    }
    // FIX F3: For historical eras, prepend the era prefix to every stock search query.
    // Root cause: "doctor" → modern Pexels/Brave result in a Roman Empire video.
    // The pipeline's Brave route adds the prefix at fetch time but the stored query is era-blind.
    // Fix it here so the query is correct for ALL downstream uses.
    {
      const eraPrefix = videoBible?.image_search_prefix || "";
      const isHistEra = videoBible?.era && videoBible.era !== "modern" && videoBible.era !== "timeless" && videoBible.era !== "";
      if (isHistEra && eraPrefix && !q.startsWith(eraPrefix.toLowerCase())) {
        q = \`\${eraPrefix.toLowerCase()} \${q}\`.trim().slice(0, 100);
      }
    }
    clip.search_query = q;`;

  if (code.includes(OLD_F3)) { code = code.replace(OLD_F3, NEW_F3); fixes++; console.log('✅ Fix F3: era prefix injected into all search queries'); }
  else console.log('❌ Fix F3: query sanitisation anchor not found');

  // FIX E: Add 300ms to every sentence end time to account for ElevenLabs trailing audio.
  // Root cause: timestamps mark when the last character ends, but audio continues ~300ms.
  // Clips cut exactly at word end → last syllable plays over the NEXT visual.
  const OLD_E = `    const startTime = filteredTimestamps[startWordIdx]?.start ?? 0;
    const endTime = filteredTimestamps[endWordIdx]?.end ?? startTime + 2;

    if (endTime > startTime + 0.3) {
      sentences.push({
        text: sentence,
        start: parseFloat(startTime.toFixed(2)),
        end: parseFloat(endTime.toFixed(2)),
        duration: parseFloat((endTime - startTime).toFixed(2)),
        wordCount: sentenceWords.length,
      });
    }`;

  const NEW_E = `    const startTime = filteredTimestamps[startWordIdx]?.start ?? 0;
    const rawEndTime = filteredTimestamps[endWordIdx]?.end ?? startTime + 2;
    // FIX E: +300ms to account for ElevenLabs trailing audio after last word timestamp.
    // Without this, last syllable of narration plays over the next visual.
    const endTime = rawEndTime + 0.3;

    if (endTime > startTime + 0.3) {
      sentences.push({
        text: sentence,
        start: parseFloat(startTime.toFixed(2)),
        end: parseFloat(endTime.toFixed(2)),
        duration: parseFloat((endTime - startTime).toFixed(2)),
        wordCount: sentenceWords.length,
      });
    }`;

  if (code.includes(OLD_E)) { code = code.replace(OLD_E, NEW_E); fixes++; console.log('✅ Fix E: +300ms sentence end padding for audio sync'); }
  else console.log('❌ Fix E: sentence timing anchor not found');

  fs.writeFileSync(file, code);
  console.log(`\ndirector.js: ${fixes}/5 fixes applied\n`);
}

// ─── PIPELINE.JS ─────────────────────────────────────────────────────────────
{
  const file = '/opt/videoforge/src/pipeline.js';
  let code = fs.readFileSync(file, 'utf8');
  let fixes = 0;

  // FIX B: Replace proportional sentence estimator with exact word timestamp lookup.
  // The old extractNarratedSentence divided script into sentences and mapped clip time
  // proportionally — drifts badly because scripts aren't evenly paced.
  // New: scan wordTimestamps for words in the clip's time window. Exact, no drift.
  const OLD_B_FUNC = `// FIX B: Extract the exact words being narrated at clipStart..clipEnd using word timestamps.
// Previous approach: proportional estimation from script position — drifts badly.
// New approach: look up which words fall in the clip's time window using ElevenLabs timestamps.
// wordTimestamps = [{word, start, end}, ...] — already computed, exact, no approximation needed.
function extractNarratedSentence(wordTimestamps, clipStart, clipEnd) {
  if (!wordTimestamps || wordTimestamps.length === 0) return "";
  // Extend the window slightly to catch words at exact boundaries
  const start = Math.max(0, clipStart - 0.1);
  const end = clipEnd + 0.3;
  const wordsInWindow = wordTimestamps.filter(w => w.start >= start && w.start <= end);
  if (wordsInWindow.length === 0) {
    // Fallback: find the closest words by proximity
    const closest = wordTimestamps
      .filter(w => Math.abs(w.start - clipStart) < 3.0)
      .slice(0, 15);
    return closest.map(w => w.word).join(" ").trim();
  }
  return wordsInWindow.map(w => w.word).join(" ").trim().slice(0, 250);
}`;

  // This was written by the previous patch — update it to handle both clip.text and timestamp lookup
  if (code.includes(OLD_B_FUNC)) {
    // Already has the improved version from patch 1, just make sure signature matches
    fixes++;
    console.log('✅ Fix B: extractNarratedSentence already updated by previous patch');
  } else {
    // Not found — this is the old version, need to fully replace
    const ORIG_B_FUNC = `// Extract the sentence being narrated at clipStart..clipEnd.
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
}`;

    const NEW_B_FUNC = `// FIX B: Exact word timestamp lookup — replaces proportional estimation.
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
}`;

    if (code.includes(ORIG_B_FUNC)) {
      code = code.replace(ORIG_B_FUNC, NEW_B_FUNC);
      fixes++;
      console.log('✅ Fix B: extractNarratedSentence replaced with exact timestamp lookup');
    } else {
      console.log('❌ Fix B: extractNarratedSentence not found in either form');
    }
  }

  // FIX B part 2: Update craftAIPrompt signature to use wordTimestamps not totalDuration
  // Check which version we have (the previous patch may have already updated it)
  const HAS_TOTAL_DUR = code.includes(`async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0)`);
  const HAS_WORD_TS = code.includes(`async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", wordTimestamps = [])`);

  if (HAS_TOTAL_DUR) {
    // Update from totalDuration to wordTimestamps
    code = code.replace(
      `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0) {
  // Extract what the narrator is actually saying at this clip's timestamp
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || clipStart + 3;
  const isHistorical = eraContext && eraContext !== "modern" && eraContext !== "";

  // FIX Bug 1: get the specific sentence being narrated here, not the generic search_query.
  // Before: every clip got "ancient roman empire scene: ancient roman ruins" → same image.
  // After: each clip gets the actual narrator sentence → specific, varied prompts.
  const narratedSentence = extractNarratedSentence(scriptText, clipStart, clipEnd, totalDuration);`,
      `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", wordTimestamps = []) {
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || clipStart + 3;
  const isHistorical = eraContext && eraContext !== "modern" && eraContext !== "";
  // FIX B: prefer clip.text (set by Fix A), then fall back to exact timestamp lookup.
  const narratedSentence = clip.text || extractNarratedSentence(wordTimestamps, clipStart, clipEnd);`
    );
    fixes++;
    console.log('✅ Fix B2: craftAIPrompt now uses wordTimestamps');
  } else if (HAS_WORD_TS) {
    // Already updated — but make sure it uses clip.text first
    if (!code.includes('const narratedSentence = clip.text || extractNarratedSentence(wordTimestamps')) {
      code = code.replace(
        `const narratedSentence = extractNarratedSentence(wordTimestamps, clipStart, clipEnd);`,
        `// FIX B: prefer clip.text (set by Fix A) first, then exact timestamp lookup\n  const narratedSentence = clip.text || extractNarratedSentence(wordTimestamps, clipStart, clipEnd);`
      );
    }
    fixes++;
    console.log('✅ Fix B2: craftAIPrompt already uses wordTimestamps, clip.text priority added');
  } else {
    console.log('❌ Fix B2: craftAIPrompt signature not found in either form');
  }

  // FIX B part 3: Update craftAIPrompt callers — pass wordTimestamps instead of totalDuration
  // Handle both old (totalDuration) and new (wordTimestamps) forms
  let callerFixed = 0;
  const callerPairs = [
    // If still using totalDuration form
    [`videoBible.era_specific || videoEra,\n            totalDuration\n          )`,
     `videoBible.era_specific || videoEra,\n            wordTimestamps\n          )`],
    [`craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration)`,
     `craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps)`],
    [`craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration)`,
     `craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps)`],
  ];
  for (const [o, n] of callerPairs) {
    if (code.includes(o)) { code = code.replace(o, n); callerFixed++; }
  }
  if (callerFixed > 0) { fixes++; console.log(`✅ Fix B3: updated ${callerFixed} craftAIPrompt callers to pass wordTimestamps`); }
  else console.log('ℹ️  Fix B3: callers already updated or not found');

  // FIX C: Route 0.5 (web_image) ignores era context — era prefix not applied.
  // A clip typed "web_image" goes straight to Brave with the raw query, no era prefix.
  // This is the route that fires for all historical video clips that Claude marks web_image.
  const OLD_C = `      // Route 0.5: web_image → Brave search (always fresh, no cache)
      if (clip.visual_type === "web_image" && clip.search_query && webImageAvailable) {
        try {
          await searchWebImage(clip.search_query, webPath, clip);`;

  const NEW_C = `      // Route 0.5: web_image → Brave search (always fresh, no cache)
      // FIX C: Apply era prefix here too — previously missing, allowed modern images in historical videos.
      if (clip.visual_type === "web_image" && clip.search_query && webImageAvailable) {
        try {
          const webQuery05 = (isHistoricalEra && imagePrefix)
            ? \`\${imagePrefix} \${clip.search_query}\`
            : clip.search_query;
          await searchWebImage(webQuery05, webPath, { ...clip, era: videoBible.era_specific });`;

  if (code.includes(OLD_C)) { code = code.replace(OLD_C, NEW_C); fixes++; console.log('✅ Fix C: Route 0.5 now applies era prefix for historical videos'); }
  else console.log('❌ Fix C: Route 0.5 anchor not found');

  // FIX D: Vague stock search queries rebuilt from narrated sentence.
  // Root cause of TA-01104: "doctor" → random woman running.
  // When a stock clip has a query under 3 words, we ask Claude for a specific visual description.
  // This fires only for vague queries — not for every clip (would be too slow).
  const OLD_D = `    const s = ora(\`Clip \${i + 1}: "\${clip.search_query || clip.ai_prompt || ''}\"...\`).start();
    const baseName = \`clip-\${i + 1}\`;`;

  const NEW_D = `    // FIX D: If stock query is < 3 words, it's too vague — rebuild from narrated sentence.
    // "doctor" → "doctor examining patient reviewing red meat nutrition study, medical office"
    // Only fires for stock clips with vague queries — targeted, not every clip.
    if (
      clip.visual_type === "stock" &&
      clip.text &&
      (clip.search_query || "").split(/\\s+/).filter(Boolean).length < 3
    ) {
      try {
        const qResp = await axios.post(
          "https://api.anthropic.com/v1/messages",
          {
            model: "claude-sonnet-4-20250514",
            max_tokens: 60,
            messages: [{
              role: "user",
              content: \`Narrator says: "\${clip.text.slice(0, 150)}"
\${(isHistoricalEra && videoBible.era_specific) ? \`ERA: \${videoBible.era_specific} — period-accurate only, no modern elements\` : ""}

Write a 5-8 word image search query showing what a viewer SEES while hearing this.
Be specific about the scene, not just the subject.
Good: "ancient roman senate debate marble columns dramatic" (not "roman")
Good: "doctor reviewing nutrition research red meat study" (not "doctor")
Good: "woman eating steak restaurant satisfied expression" (not "food")
Return ONLY the search query.\`
            }],
          },
          { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, timeout: 8000 }
        );
        const newQ = qResp.data.content[0].text.trim().replace(/['"]/g, "").slice(0, 100);
        if (newQ.split(/\\s+/).length >= 3) {
          clip.search_query = (isHistoricalEra && imagePrefix)
            ? \`\${imagePrefix} \${newQ}\`
            : newQ;
        }
      } catch { /* keep original query if this fails */ }
    }

    const s = ora(\`Clip \${i + 1}: "\${clip.search_query || clip.ai_prompt || ''}\"...\`).start();
    const baseName = \`clip-\${i + 1}\`;`;

  if (code.includes(OLD_D)) { code = code.replace(OLD_D, NEW_D); fixes++; console.log('✅ Fix D: vague stock queries rebuilt from narrated sentence'); }
  else console.log('❌ Fix D: clip loop start anchor not found');

  fs.writeFileSync(file, code);
  console.log(`\npipeline.js: ${fixes}/5 fixes applied`);
}

console.log(`
All done. Run in SSH terminal:
  pm2 restart videoforge-worker
  git add -A
  git commit -m "Root cause fixes batch 2: clip.text preserved, exact timestamp lookup, era prefix on all routes, semantic search queries, audio sync +300ms"
  git push
`);
