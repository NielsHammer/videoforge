import fs from 'fs';
import { execSync } from 'child_process';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
const bibleFile = '/opt/videoforge/src/video-bible.js';

let pipeline = fs.readFileSync(pipelineFile, 'utf8');
let bible = fs.readFileSync(bibleFile, 'utf8');
const origPipeline = pipeline;

// ── STEP 1: Update video bible ────────────────────────────────────────────────
const oldBibleJSON = `  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}`;
const newBibleJSON = `  "target_audience": "who watches this — age, background, knowledge level e.g. 'beginner gym-goers aged 20-35'",
  "emotional_arc": "emotional journey e.g. 'opens with shocking stat, builds tension, resolves with empowerment'",
  "content_warnings": ["any topics that need sensitive image handling, e.g. 'war violence', 'poverty'"]
}`;
if (bible.includes(oldBibleJSON)) {
  bible = bible.replace(oldBibleJSON, newBibleJSON);
  fs.writeFileSync(bibleFile, bible);
  console.log('✅ Step 1: bible updated');
} else {
  console.log('ℹ️  Step 1: bible already updated');
}

// ── STEP 2: Replace craftAIPrompt function ────────────────────────────────────
const funcStart = pipeline.indexOf('async function craftAIPrompt(');
const funcEnd = pipeline.indexOf('\nfunction detectContentMode(');

if (funcStart === -1 || funcEnd === -1) {
  console.log('❌ Boundaries not found:', funcStart, funcEnd);
  process.exit(1);
}

console.log(`✅ Boundaries found: ${funcStart} → ${funcEnd}`);

const newFunc = `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0, wordTimestamps = [], videoTopic = "", videoBible = {}, clipIndex = 0, totalClips = 0) {
  const clipStart = clip.start_time || 0;
  const clipEnd = clip.end_time || clipStart + 3;

  // Exact narrator sentence at this timestamp
  const narratedSentence = extractNarratedSentence(wordTimestamps, clipStart, clipEnd);

  // Surrounding context for continuity
  const sentenceBefore = extractNarratedSentence(wordTimestamps, Math.max(0, clipStart - 6), clipStart);
  const sentenceAfter = extractNarratedSentence(wordTimestamps, clipEnd, clipEnd + 6);

  // Position in video
  const progress = totalClips > 0 ? clipIndex / totalClips : clipStart / (totalDuration || 600);
  const position = progress < 0.12 ? "HOOK (opening — punchy, attention-grabbing)"
    : progress < 0.25 ? "SETUP (establishing context and stakes)"
    : progress < 0.75 ? "MAIN CONTENT (delivering core value)"
    : progress < 0.90 ? "CLIMAX (peak insight or revelation)"
    : "CONCLUSION (resolution, call to action)";

  // Full video bible context
  const bibleLines = [
    videoBible.setting            ? "Setting: "       + videoBible.setting : "",
    videoBible.era_specific       ? "Era/Period: "    + videoBible.era_specific : "",
    videoBible.visual_tone        ? "Visual tone: "   + videoBible.visual_tone : "",
    videoBible.required_visual_style ? "Style: "      + videoBible.required_visual_style : "",
    videoBible.target_audience    ? "Audience: "      + videoBible.target_audience : "",
    videoBible.emotional_arc      ? "Emotional arc: " + videoBible.emotional_arc : "",
    videoBible.banned_visuals?.length ? "NEVER show: " + videoBible.banned_visuals.slice(0,6).join(", ") : "",
  ].filter(Boolean).join("\\n");

  // Director-specified key visual moment
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

VIDEO CONTEXT (visual world of this video):
\${bibleLines || "Infer the visual world from the video title."}

POSITION IN VIDEO: \${position}
\${sentenceBefore && sentenceBefore !== narratedSentence ? 'JUST SAID: "' + sentenceBefore.slice(0, 100) + '"' : ""}
NARRATOR SAYS NOW: "\${narratedSentence || basicPrompt}"
\${sentenceAfter && sentenceAfter !== narratedSentence ? 'COMING NEXT: "' + sentenceAfter.slice(0, 100) + '"' : ""}
\${keyMoment ? 'DIRECTOR NOTE: Show "' + keyMoment.visual_description + '"' : ""}

Generate the single best image for this exact moment:
- Fit the visual world above — era, setting, tone, style, banned visuals
- Show the SPECIFIC thing the narrator describes right now
- Feature real, relatable people matching the target audience
- Documentary/candid style — real lighting, real moments
- 35-55 words, NO text or watermarks

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

pipeline = pipeline.slice(0, funcStart) + newFunc + pipeline.slice(funcEnd);
console.log('✅ Step 2: craftAIPrompt rewritten');

// ── STEP 3: Update call sites ─────────────────────────────────────────────────
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
if (pipeline.includes(oldCall1)) { pipeline = pipeline.replace(oldCall1, newCall1); console.log('✅ Step 3a'); }
else console.log('❌ Step 3a not found');

const oldCall2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps, options.topic || "");`;
const newCall2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, "", totalDuration, wordTimestamps, options.topic || "", videoBible, i, clips.length);`;
if (pipeline.includes(oldCall2)) { pipeline = pipeline.replace(oldCall2, newCall2); console.log('✅ Step 3b'); }
else console.log('❌ Step 3b not found');

const oldCall3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps, options.topic || "");`;
const newCall3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, "", totalDuration, wordTimestamps, options.topic || "", videoBible, i, clips.length);`;
if (pipeline.includes(oldCall3)) { pipeline = pipeline.replace(oldCall3, newCall3); console.log('✅ Step 3c'); }
else console.log('❌ Step 3c not found');

// Syntax check
try {
  fs.writeFileSync(pipelineFile, pipeline);
  execSync('node --check ' + pipelineFile, {stdio:'pipe'});
  const calls = (pipeline.match(/await craftAIPrompt/g)||[]).length;
  console.log(`\n✅ Syntax PASSED — ${calls} call sites`);
} catch(e) {
  console.log('\n❌ SYNTAX ERROR — restoring');
  fs.writeFileSync(pipelineFile, origPipeline);
  console.log(e.stderr?.toString()?.slice(0,300));
}
