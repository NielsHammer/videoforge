import fs from 'fs';
import { execSync } from 'child_process';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
const bibleFile = '/opt/videoforge/src/video-bible.js';

let pipeline = fs.readFileSync(pipelineFile, 'utf8');
let bible = fs.readFileSync(bibleFile, 'utf8');
const origPipeline = pipeline;
const origBible = bible;

// ═══════════════════════════════════════════════════════════════════
// STEP 1: Add target_audience and emotional_arc to video bible prompt
// These are critical for image generation context
// ═══════════════════════════════════════════════════════════════════
const oldBibleJSON = `  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}`;
const newBibleJSON = `  "target_audience": "who is watching this — age, background, knowledge level, e.g. 'beginner gym-goers aged 20-35' or 'history enthusiasts'",
  "emotional_arc": "the emotional journey of this video — e.g. 'starts with shock/curiosity, builds tension, resolves with empowerment'",
  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}`;

if (bible.includes(oldBibleJSON)) {
  bible = bible.replace(oldBibleJSON, newBibleJSON);
  console.log('✅ Step 1: target_audience + emotional_arc added to video bible');
} else {
  console.log('❌ Step 1: bible JSON structure not found');
}

fs.writeFileSync(bibleFile, bible);

// ═══════════════════════════════════════════════════════════════════
// STEP 2: Completely rewrite craftAIPrompt
// Remove ALL niche/era/modern detection rules
// Replace with pure context-driven reasoning
// ═══════════════════════════════════════════════════════════════════
const oldCraftFunc = pipeline.slice(
  pipeline.indexOf('async function craftAIPrompt('),
  pipeline.indexOf('\nasync function detectContentMode(')
);

const newCraftFunc = `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0, wordTimestamps = [], videoTopic = "", videoBible = {}, clipIndex = 0, totalClips = 0) {
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || clipStart + 3;

  // What the narrator is saying at this exact moment
  const narratedSentence = extractNarratedSentence(wordTimestamps, clipStart, clipEnd);

  // Surrounding context — what was said just before and after
  const sentenceBefore = extractNarratedSentence(wordTimestamps, Math.max(0, clipStart - 6), clipStart);
  const sentenceAfter = extractNarratedSentence(wordTimestamps, clipEnd, clipEnd + 6);

  // Position in video — helps calibrate visual intensity and tone
  const progress = totalClips > 0 ? clipIndex / totalClips : clipStart / (totalDuration || 600);
  const position = progress < 0.12 ? "HOOK — first impression, must grab attention"
    : progress < 0.25 ? "SETUP — establishing context and stakes"
    : progress < 0.75 ? "MAIN CONTENT — delivering core value"
    : progress < 0.90 ? "CLIMAX — peak insight or revelation"
    : "CONCLUSION — resolution and call to action";

  // Full video bible context
  const bibleDetails = [
    videoBible.setting ? \`Setting: \${videoBible.setting}\` : "",
    videoBible.era_specific ? \`Era/Period: \${videoBible.era_specific}\` : "",
    videoBible.visual_tone ? \`Visual tone: \${videoBible.visual_tone}\` : "",
    videoBible.required_visual_style ? \`Required style: \${videoBible.required_visual_style}\` : "",
    videoBible.target_audience ? \`Audience: \${videoBible.target_audience}\` : "",
    videoBible.emotional_arc ? \`Emotional arc: \${videoBible.emotional_arc}\` : "",
    videoBible.banned_visuals?.length ? \`NEVER show: \${videoBible.banned_visuals.slice(0,5).join(", ")}\` : "",
  ].filter(Boolean).join("\\n");

  // Check if there's a key visual moment defined for this clip
  const keyMoment = (videoBible.key_visual_moments || []).find(m =>
    narratedSentence && m.moment && narratedSentence.toLowerCase().includes(m.moment.toLowerCase().slice(0, 20))
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

VIDEO TITLE: "\${videoTopic || basicPrompt.slice(0, 120)}"
VIDEO CONTEXT:
\${bibleDetails || "No bible available — use video title to infer context"}

POSITION IN VIDEO: \${position}
\${sentenceBefore && sentenceBefore !== narratedSentence ? \`JUST BEFORE: "\${sentenceBefore.slice(0, 100)}"\` : ""}
NOW (narrator says): "\${narratedSentence || basicPrompt}"
\${sentenceAfter && sentenceAfter !== narratedSentence ? \`COMING NEXT: "\${sentenceAfter.slice(0, 100)}"\` : ""}
\${keyMoment ? \`DIRECTOR'S NOTE: Show "\${keyMoment.visual_description}"\` : ""}

Generate the perfect image for this exact moment. Think:
1. What does the video context tell you about the visual world of this video?
2. What is the narrator describing RIGHT NOW — the specific subject, action, or concept?
3. What kind of person would be watching this? Show imagery they relate to.
4. What camera angle and lighting fits the emotional tone at this point in the video?

The image must:
- Match the visual world established by the video context (era, setting, style)
- Show the SPECIFIC thing described — not a generic version
- Feature REAL, RELATABLE people — not models or idealized imagery
- Use documentary/candid style — real lighting, real moments, real people
- Be 35-55 words, no text or watermarks

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
    // Fallback: use what we know from context
    const ctx = videoBible.era_specific || videoBible.setting || "";
    return \`\${ctx ? ctx + ": " : ""}\${narratedSentence || basicPrompt}.slice(0, 100)}, documentary photography, natural lighting, realistic\`;
  }
}

`;

if (oldCraftFunc.length > 100) {
  pipeline = pipeline.replace(oldCraftFunc, newCraftFunc);
  console.log('✅ Step 2: craftAIPrompt completely rewritten — pure context, no niche rules');
} else {
  console.log('❌ Step 2: could not find craftAIPrompt boundaries');
}

// ═══════════════════════════════════════════════════════════════════
// STEP 3: Update all 3 call sites to pass videoBible + clipIndex
// ═══════════════════════════════════════════════════════════════════

// Call site 1 (web_image fallback)
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

// Syntax check
try {
  fs.writeFileSync(pipelineFile, pipeline);
  execSync('node --check ' + pipelineFile, {stdio:'pipe'});
  console.log('\n✅ Syntax check PASSED — ready to deploy');
} catch(e) {
  console.log('\n❌ SYNTAX ERROR — restoring original');
  fs.writeFileSync(pipelineFile, origPipeline);
  console.log(e.stderr?.toString()?.slice(0, 400));
}
