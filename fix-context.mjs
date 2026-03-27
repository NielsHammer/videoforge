import fs from 'fs';

const file = '/opt/videoforge/src/pipeline.js';
let code = fs.readFileSync(file, 'utf8');

// FIX 1: Pass actual video topic into craftAIPrompt as 7th argument
// Currently basicPrompt is the clip search query, not the video title
// We need options.topic to flow into craftAIPrompt

// Update craftAIPrompt signature to accept videoTopic
const oldSig = `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0, wordTimestamps = []) {`;
const newSig = `async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0, wordTimestamps = [], videoTopic = "") {`;

if (code.includes(oldSig)) {
  code = code.replace(oldSig, newSig);
  console.log('✅ Fix 1a: craftAIPrompt signature adds videoTopic param');
} else {
  console.log('❌ Fix 1a not found');
}

// Fix VIDEO TOPIC CONTEXT to use videoTopic not basicPrompt
const oldTopicLine = `VIDEO TOPIC CONTEXT: "\${basicPrompt.slice(0, 120)}"`;
const newTopicLine = `VIDEO TOPIC: "\${videoTopic || basicPrompt.slice(0, 120)}"`;

if (code.includes(oldTopicLine)) {
  code = code.replace(oldTopicLine, newTopicLine);
  console.log('✅ Fix 1b: VIDEO TOPIC now uses actual video title');
} else {
  console.log('❌ Fix 1b not found');
}

// Fix wrong example — remove the muscular athlete clickbait example
const oldWrongExample = `WRONG — wrong era for topic: generating Roman warriors for a gym video
RIGHT — matches topic: "muscular athlete performing weighted squat in modern gym, dramatic side lighting highlighting muscle definition, low angle shot, sports photography style, shallow depth of field"`;
const newWrongExample = `WRONG — wrong era: Roman warriors for a gym video
WRONG — clickbait: overdone bodybuilder posing dramatically  
RIGHT — realistic: "ordinary person performing squat in local gym, natural overhead lighting, eye-level candid shot, documentary photography style, real gym environment"
RIGHT — historical: "exhausted Roman soldier resting against stone wall, dust-covered armor, realistic portrait, candid documentary style"`;

if (code.includes(oldWrongExample)) {
  code = code.replace(oldWrongExample, newWrongExample);
  console.log('✅ Fix 1c: Wrong example replaced with realistic examples');
} else {
  console.log('❌ Fix 1c not found');
}

// FIX 2: Pass videoTopic through all 3 craftAIPrompt call sites

// Call site 1 (web_image fallback ~line 490)
const oldCall1 = `          const detailedPrompt = await craftAIPrompt(
            isHistoricalEra
              ? \`\${videoBible.era_specific || videoEra} historical scene: \${clip.search_query}. Period-accurate, cinematic.\`
              : \`Photorealistic photograph related to: \${clip.search_query}. Editorial style, high resolution.\`,
            clip,
            scriptText,
            videoBible.era_specific || videoEra,
            totalDuration,
            wordTimestamps
          );`;
const newCall1 = `          const detailedPrompt = await craftAIPrompt(
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

if (code.includes(oldCall1)) {
  code = code.replace(oldCall1, newCall1);
  console.log('✅ Fix 2a: call site 1 passes videoTopic');
} else {
  console.log('❌ Fix 2a not found');
}

// Call site 2 (ai_image route ~line 515)
const oldCall2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps);`;
const newCall2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps, options.topic || "");`;

if (code.includes(oldCall2)) {
  code = code.replace(oldCall2, newCall2);
  console.log('✅ Fix 2b: call site 2 passes videoTopic');
} else {
  console.log('❌ Fix 2b not found');
}

// Call site 3 (split/pexels fallback ~line 600)
const oldCall3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps);`;
const newCall3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps, options.topic || "");`;

if (code.includes(oldCall3)) {
  code = code.replace(oldCall3, newCall3);
  console.log('✅ Fix 2c: call site 3 passes videoTopic');
} else {
  console.log('❌ Fix 2c not found');
}

// FIX 3: Brave search queries — also update stock search to be realistic
// Lines 490/598 build stock search queries with "historical scene: ... cinematic"
// For non-historical: strip "cinematic" framing from stock queries
const oldStockQuery598 = `          ? \`\${videoBible.era_specific || "historical"} scene: \${clip.search_query || "ancient scene"}, period-accurate, dramatic lighting, epic cinematic, no modern elements, 16:9\`
          : \`Professional cinematic photograph, \${clip.search_query || "dramatic scene"}, clean modern aesthetic, dramatic lighting, 16:9, high quality\`;`;
const newStockQuery598 = `          ? \`\${videoBible.era_specific || "historical"} \${clip.search_query || "historical scene"}, period-accurate, realistic, documentary style\`
          : \`\${clip.search_query || "scene"}, realistic documentary photography, natural lighting\`;`;

if (code.includes(oldStockQuery598)) {
  code = code.replace(oldStockQuery598, newStockQuery598);
  console.log('✅ Fix 3: Stock fallback queries now use documentary/realistic style');
} else {
  console.log('❌ Fix 3 not found');
}

fs.writeFileSync(file, code);
console.log('\n✅ pipeline.js saved');
