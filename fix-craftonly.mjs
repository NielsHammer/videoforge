import fs from 'fs';
import { execSync } from 'child_process';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
const bibleFile = '/opt/videoforge/src/video-bible.js';

let pipeline = fs.readFileSync(pipelineFile, 'utf8');
let bible = fs.readFileSync(bibleFile, 'utf8');
const origPipeline = pipeline;
const origBible = bible;

// ── STEP 1: Add target_audience + emotional_arc to video bible ────────────────
const oldBibleJSON = `  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}`;
const newBibleJSON = `  "target_audience": "who watches this — age, background, knowledge level e.g. 'beginner gym-goers aged 20-35'",
  "emotional_arc": "emotional journey e.g. 'opens with shocking stat, builds tension, resolves with empowerment'",
  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}`;
if (bible.includes(oldBibleJSON)) {
  bible = bible.replace(oldBibleJSON, newBibleJSON);
  fs.writeFileSync(bibleFile, bible);
  console.log('✅ Step 1: target_audience + emotional_arc added to bible');
} else {
  console.log('❌ Step 1 not found');
}

// ── STEP 2: Replace just the craftAIPrompt function body ─────────────────────
// Find exact boundaries
const funcStart = pipeline.indexOf('async function craftAIPrompt(');
const funcEnd = pipeline.indexOf('\nasync function detectContentMode(');

if (funcStart === -1 || funcEnd === -1) {
  console.log('❌ Cannot find craftAIPrompt boundaries');
  process.exit(1);
}

const newCraftFunc = `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0, wordTimestamps = [], videoTopic = "", videoBible = {}, clipIndex = 0, totalClips = 0) {
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || clipStart + 3;

  // Exact words narrator is saying at this timestamp
  const narratedSentence = extractNarratedSentence(wordTimestamps, clipStart, clipEnd);

  // Surrounding sentences for continuity — what was said before/after
  const sentenceBefore = extractNarratedSentence(wordTimestamps, Math.max(0, clipStart - 6), clipStart);
  const sentenceAfter = extractNarratedSentence(wordTimestamps, clipEnd, clipEnd + 6);

  // Position in video — calibrates visual intensity
  const progress = totalClips > 0 ? clipIndex / totalClips : clipStart / (totalDuration || 600);
  const position = progress < 0.12 ? "HOOK (opening — punchy, attention-grabbing)"
    : progress < 0.25 ? "SETUP (establishing context and stakes)"
    : progress < 0.75 ? "MAIN CONTENT (delivering core value)"
    : progress < 0.90 ? "CLIMAX (peak insight or revelation)"
    : "CONCLUSION (resolution, call to action)";

  // Full video bible — the visual world of this video
  const bibleLines = [
    videoBible.setting         ? "Setting: "        + videoBible.setting : "",
    videoBible.era_specific    ? "Era/Period: "     + videoBible.era_specific : "",
    videoBible.visual_tone     ? "Visual tone: "    + videoBible.visual_tone : "",
    videoBible.required_visual_style ? "Style: "   + videoBible.required_visual_style : "",
    videoBible.target_audience ? "Audience: "       + videoBible.target_audience : "",
    videoBible.emotional_arc   ? "Emotional arc: "  + videoBible.emotional_arc : "",
    videoBible.banned_visuals?.length ? "NEVER show: " + videoBible.banned_visuals.slice(0,6).join(", ") : "",
  ].filter(Boolean).join("\\n");

  // Check for director-specified key visual moment
  const keyMoment = (videoBible.key_visual_moments || []).find(m =>
    narratedSentence && m.moment &&
    narratedSentence.toLowerCase().includes(m.moment.toLowerCase().slice(0, 25))
  );

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 250,
        messages: [{
          role: "user",
          content: \`You are generating ONE image prompt for a specific moment in a YouTube video.
Read all context carefully before deciding what to show.

VIDEO TITLE: "\${videoTopic || basicPrompt.slice(0, 120)}"

VIDEO CONTEXT (use this to understand the visual world of this video):
\${bibleLines || "Use the video title to infer the visual world."}

POSITION IN VIDEO: \${position}
\${sentenceBefore && sentenceBefore !== narratedSentence ? 'JUST SAID: "' + sentenceBefore.slice(0, 100) + '"' : ""}
NARRATOR SAYS NOW: "\${narratedSentence || basicPrompt}"
\${sentenceAfter && sentenceAfter !== narratedSentence ? 'COMING NEXT: "' + sentenceAfter.slice(0, 100) + '"' : ""}
\${keyMoment ? 'DIRECTOR NOTE: Show "' + keyMoment.visual_description + '"' : ""}

Generate the single best image for this exact moment. The image must:
- Fit the visual world described above — era, setting, tone, style
- Show the SPECIFIC thing the narrator describes right now (not generic)
- Feature real, relatable people — not models, not idealized
- Match what the target audience would relate to
- Use the position to calibrate tone (hook = urgent, conclusion = resolved)
- Documentary/candid style — real lighting, real moments
- 35-55 words, NO text or watermarks in image

Return ONLY the image prompt.\`
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
    const ctx = videoBible.era_specific || videoBible.setting || "";
    return \`\${ctx ? ctx + ": " : ""}\${(narratedSentence || basicPrompt).slice(0, 100)}, documentary photography, natural lighting, realistic\`;
  }
}

`;

pipeline = pipeline.slice(0, funcStart) + newCraftFunc + pipeline.slice(funcEnd + 1);

// ── STEP 3: Update all 3 call sites to pass videoBible + clipIndex ────────────

// Call site 1 (web_image fallback ~line 490)
const oldCall1 = `          const detailedPrompt = await craftAIPrompt(
            isHistoricalEra
              ? \`\${videoBible.era_specific || videoEra} historical scene: \${clip.search_query}. Period-accurate, cinematic.\`
              : \`Photograph related to: \${clip.search_query}.\`,
            clip,
            scriptText,
            videoBible.era_specific || videoEra,
            totalDuration,
            wordTimestamps,
            options.topic || ""
          );`;
const newCall1 = `          const detailedPrompt = await craftAIPrompt(
            clip.search_query || basicPrompt,
            clip, scriptText, "", totalDuration, wordTimestamps,
            options.topic || "", videoBible, i, clips.length
          );`;
if (pipeline.includes(oldCall1)) {
  pipeline = pipeline.replace(oldCall1, newCall1);
  console.log('✅ Step 3a: call site 1 updated');
} else {
  console.log('❌ Step 3a not found');
}

// Call site 2 (ai_image route)
const oldCall2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps, options.topic || "");`;
const newCall2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, "", totalDuration, wordTimestamps, options.topic || "", videoBible, i, clips.length);`;
if (pipeline.includes(oldCall2)) {
  pipeline = pipeline.replace(oldCall2, newCall2);
  console.log('✅ Step 3b: call site 2 updated');
} else {
  console.log('❌ Step 3b not found');
}

// Call site 3 (pexels/split fallback)
const oldCall3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps, options.topic || "");`;
const newCall3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, "", totalDuration, wordTimestamps, options.topic || "", videoBible, i, clips.length);`;
if (pipeline.includes(oldCall3)) {
  pipeline = pipeline.replace(oldCall3, newCall3);
  console.log('✅ Step 3c: call site 3 updated');
} else {
  console.log('❌ Step 3c not found');
}

// Syntax check — restore if broken
try {
  fs.writeFileSync(pipelineFile, pipeline);
  execSync('node --check ' + pipelineFile, {stdio:'pipe'});
  console.log('\n✅ Syntax check PASSED');
  // Verify calls exist
  const callCount = (pipeline.match(/await craftAIPrompt/g) || []).length;
  console.log(`📊 craftAIPrompt call sites: ${callCount} (expected 3)`);
} catch(e) {
  console.log('\n❌ SYNTAX ERROR — restoring');
  fs.writeFileSync(pipelineFile, origPipeline);
  console.log(e.stderr?.toString()?.slice(0, 400));
}
