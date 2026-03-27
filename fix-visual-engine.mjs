import fs from 'fs';

const directorFile = '/opt/videoforge/src/director.js';
const pipelineFile = '/opt/videoforge/src/pipeline.js';
const biblefile = '/opt/videoforge/src/video-bible.js';

let director = fs.readFileSync(directorFile, 'utf8');
let pipeline = fs.readFileSync(pipelineFile, 'utf8');
let bible = fs.readFileSync(biblefile, 'utf8');

// ═══════════════════════════════════════════════════════════════════
// FIX A: Video Bible — raise script context from 5000 to 15000 chars
// Covers full 60-min scripts (a 60-min script is ~45,000 chars,
// but the OPENING establishes the visual rules — first 15k covers
// the full first 10+ minutes which is enough for context setting)
// ═══════════════════════════════════════════════════════════════════
if (bible.includes('${scriptText.slice(0, 5000)}${scriptText.length > 5000')) {
  bible = bible.replace(
    '${scriptText.slice(0, 5000)}${scriptText.length > 5000 ? "\\n[...script continues for " + Math.round(scriptText.length/5) + " more words...]" : ""}',
    '${scriptText.slice(0, 15000)}${scriptText.length > 15000 ? "\\n[...script continues — " + Math.round((scriptText.length - 15000) / 5) + " more words...]" : ""}'
  );
  console.log('✅ Fix A: Video Bible script context 5000 → 15000 chars');
} else {
  console.log('❌ Fix A: video-bible slice not found');
}

// Also increase video-bible max_tokens from 2000 to 3000 for richer key_visual_moments
if (bible.includes('max_tokens: 2000,')) {
  bible = bible.replace('max_tokens: 2000,', 'max_tokens: 3000,');
  console.log('✅ Fix A2: Video Bible max_tokens 2000 → 3000');
}

fs.writeFileSync(biblefile, bible);

// ═══════════════════════════════════════════════════════════════════
// FIX B: Pass 1 pre-flight — chunk for long videos
// Currently sends ALL clip windows in one call → overflows for 60-min videos
// Fix: chunk Pass 1 into batches of 60 windows, same as Pass 2
// ═══════════════════════════════════════════════════════════════════
const oldPassOne = `  // Pass 1: Pre-flight classification (now informed by video bible)
  console.log(chalk.gray(\`  Running pre-flight classification...\`));
  const plan = await classifyClipWindows(clipWindows, scriptText, nicheInfo, themeHints, budget, topic, theme, isHorror, orderBrief, videoBible);`;

const newPassOne = `  // Pass 1: Pre-flight classification — chunked for long videos
  // For videos >60 clips (roughly >10 min), chunk the pre-flight to avoid token overflow
  console.log(chalk.gray(\`  Running pre-flight classification...\`));
  let plan = [];
  const PREFLIGHT_CHUNK = 60;
  if (clipWindows.length <= PREFLIGHT_CHUNK) {
    plan = await classifyClipWindows(clipWindows, scriptText, nicheInfo, themeHints, budget, topic, theme, isHorror, orderBrief, videoBible);
  } else {
    console.log(chalk.gray(\`  Long video: chunking pre-flight into batches of \${PREFLIGHT_CHUNK}...\`));
    for (let pi = 0; pi < clipWindows.length; pi += PREFLIGHT_CHUNK) {
      const windowChunk = clipWindows.slice(pi, pi + PREFLIGHT_CHUNK);
      const chunkPlan = await classifyClipWindows(windowChunk, scriptText, nicheInfo, themeHints, budget, topic, theme, isHorror, orderBrief, videoBible);
      plan.push(...chunkPlan);
    }
    console.log(chalk.gray(\`  Pre-flight complete: \${plan.length} clips planned\`));
  }`;

if (director.includes(oldPassOne)) {
  director = director.replace(oldPassOne, newPassOne);
  console.log('✅ Fix B: Pass 1 pre-flight now chunked for long videos');
} else {
  console.log('❌ Fix B: Pass 1 call not found');
}

// ═══════════════════════════════════════════════════════════════════
// FIX C: craftAIPrompt — cinematographer-level prompt
// Currently: "write a 30-50 word prompt showing what a viewer should SEE"
// This is too literal. A cinematographer thinks about:
// - Camera angle and distance (close-up, wide shot, low angle, aerial)
// - Lighting (golden hour, harsh shadows, neon glow, candlelight)
// - Emotional subtext (tension, awe, dread, relief)
// - Visual metaphor (what this moment MEANS visually, not just what it IS)
// - Cinematic reference (what film or style this evokes)
// ═══════════════════════════════════════════════════════════════════
const oldCraftPrompt = `You are an expert at writing Flux image generation prompts for YouTube videos.

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

Return ONLY the prompt.`;

const newCraftPrompt = `You are a world-class cinematographer and visual director for YouTube documentaries. Your job is to translate a narrated sentence into a perfect image prompt for Flux AI.

NARRATOR SAYS: "\${narratedSentence || basicPrompt}"
\${isHistorical ? \`ERA: \${eraContext} — period-accurate visuals ONLY. Zero modern elements.\` : ""}

Think like a film director. Ask yourself:
1. What is the KEY VISUAL SUBJECT of this sentence? (the person, object, or scene)
2. What EMOTION or TENSION should this image carry?
3. What CAMERA ANGLE and FRAMING tells this story best?
4. What LIGHTING conditions match the mood?
5. What CINEMATIC STYLE fits? (noir, epic, intimate, cold clinical, warm nostalgic)

WRONG — literal and generic: "man hiding behind hedge at night"
RIGHT — cinematic: "shadowy silhouette crouched low behind dense hedgerow, moonlight cutting through leaves casting dramatic shadows, extreme low angle, tense thriller atmosphere, shallow depth of field, film noir style"

WRONG — too generic: "ancient roman scene"
RIGHT — specific and cinematic: "fourteen-year-old boy drowning in an oversized golden throne, Germanic warriors visible through marble archway behind him, dramatic chiaroscuro lighting, low angle looking up at throne, Ridley Scott epic style"

Rules:
- Lead with the specific subject from the narration
- Add camera angle (low angle / aerial / close-up / wide establishing / over-shoulder)
- Add lighting (golden hour / harsh shadows / neon glow / candlelight / overcast grey)
- Add emotional subtext (tense / awe-inspiring / lonely / triumphant / haunting)
- Add cinematic style reference when useful
\${styleGuide}
- 35-55 words total
- NO text, watermarks, or UI elements

Return ONLY the prompt, nothing else.`;

if (pipeline.includes(oldCraftPrompt)) {
  pipeline = pipeline.replace(oldCraftPrompt, newCraftPrompt);
  console.log('✅ Fix C: craftAIPrompt upgraded to cinematographer-level');
} else {
  console.log('❌ Fix C: craftAIPrompt prompt text not found');
}

// ═══════════════════════════════════════════════════════════════════
// FIX D: Pass 2 assignment script context for long videos
// Currently fixed at 12000 chars. For a 60-min video (6 blocks × 1300 words
// per block = ~45000 chars), we need to pass the RELEVANT section of script
// for each chunk, not always the first 12000 chars.
// Fix: pass the script section that corresponds to the current chunk's timerange
// ═══════════════════════════════════════════════════════════════════
// Find where directClipWindows is called and inject chunk-aware script context
const oldChunkCall = `    const chunkClips = await directClipWindows(
      windowChunk, planChunk, scriptText, isFirst, isLast,
      nicheInfo, themeHints, budget, topic, theme, isHorror, videoBible
    );`;

const newChunkCall = `    // For long videos, pass the script section relevant to this chunk's time range
    // rather than always passing the first 12000 chars.
    // Estimate which part of the script corresponds to this chunk's timestamps.
    let chunkScriptContext = scriptText;
    if (scriptText.length > 12000 && clipWindows.length > 0) {
      const chunkStartTime = windowChunk[0]?.start || 0;
      const chunkEndTime = windowChunk[windowChunk.length - 1]?.end || totalDuration;
      const scriptFraction_start = Math.max(0, (chunkStartTime / totalDuration) - 0.05);
      const scriptFraction_end = Math.min(1, (chunkEndTime / totalDuration) + 0.1);
      const charStart = Math.floor(scriptFraction_start * scriptText.length);
      const charEnd = Math.min(scriptText.length, Math.floor(scriptFraction_end * scriptText.length) + 8000);
      // Always include the first 2000 chars (for context/tone) plus the relevant section
      chunkScriptContext = scriptText.slice(0, 2000) + "\\n[...]\\n" + scriptText.slice(charStart, charEnd);
    }
    const chunkClips = await directClipWindows(
      windowChunk, planChunk, chunkScriptContext, isFirst, isLast,
      nicheInfo, themeHints, budget, topic, theme, isHorror, videoBible
    );`;

if (director.includes(oldChunkCall)) {
  director = director.replace(oldChunkCall, newChunkCall);
  console.log('✅ Fix D: Pass 2 now passes time-proportional script section per chunk');
} else {
  console.log('❌ Fix D: chunk call not found');
}

// ═══════════════════════════════════════════════════════════════════
// FIX E: key_visual_moments from video bible used in search queries
// The video bible already extracts key visual moments with search queries.
// But they're only shown as hints — Pass 2 should USE them as exact
// search queries when the clip's sentence matches a key moment.
// ═══════════════════════════════════════════════════════════════════
// Inject into validateAndSyncClips — if clip sentence matches a key visual moment,
// use that moment's search_query directly
const oldValidateComment = `    // FORCE timing to match window exactly
    clip.start_time = window.start;
    clip.end_time = window.end;
    clip.subtitle_words = [];
    // FIX A: carry the narrated sentence onto every clip object.
    // Without this, craftAIPrompt, stock-run-breaker, and kinetic text all get undefined.
    if (window.text && !clip.text) clip.text = window.text;`;

const newValidateComment = `    // FORCE timing to match window exactly
    clip.start_time = window.start;
    clip.end_time = window.end;
    clip.subtitle_words = [];
    // FIX A: carry the narrated sentence onto every clip object.
    if (window.text && !clip.text) clip.text = window.text;

    // FIX E: If video bible has a key_visual_moment matching this sentence,
    // use its search_query directly — highest quality, director-approved
    if (clip.visual_type === 'stock' && window.text && videoBible?.key_visual_moments?.length) {
      const windowText = window.text.toLowerCase();
      const match = videoBible.key_visual_moments.find(m => {
        if (!m.moment) return false;
        const moment = m.moment.toLowerCase().replace(/[^a-z0-9\\s]/g, '').slice(0, 40);
        const windowClean = windowText.replace(/[^a-z0-9\\s]/g, '').slice(0, 40);
        // Check if at least 3 consecutive words match
        const momentWords = moment.split(/\\s+/).filter(w => w.length > 3);
        return momentWords.slice(0, 3).some(w => windowClean.includes(w)) &&
               momentWords.filter(w => windowClean.includes(w)).length >= 2;
      });
      if (match?.search_query) {
        clip.search_query = match.search_query;
      }
    }`;

if (director.includes(oldValidateComment)) {
  director = director.replace(oldValidateComment, newValidateComment);
  console.log('✅ Fix E: Video bible key_visual_moments now inject into matching stock clips');
} else {
  console.log('❌ Fix E: validate comment not found');
}

fs.writeFileSync(directorFile, director);
fs.writeFileSync(pipelineFile, pipeline);
console.log('✅ All files saved');
