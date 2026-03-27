import fs from 'fs';

const file = '/opt/videoforge/src/pipeline.js';
let code = fs.readFileSync(file, 'utf8');

// Fix call site 1 (line ~476): web_image fallback → AI
// Currently: craftAIPrompt(basicPrompt, clip, scriptText, eraContext, wordTimestamps)
// Missing: totalDuration as 5th arg
const old1 = `          const detailedPrompt = await craftAIPrompt(
            isHistoricalEra
              ? \`\${videoBible.era_specific || videoEra} historical scene: \${clip.search_query}. Period-accurate, cinematic.\`
              : \`Photorealistic photograph related to: \${clip.search_query}. Editorial style, high resolution.\`,
            clip,
            scriptText,
            videoBible.era_specific || videoEra,
            wordTimestamps
          );`;

const new1 = `          const detailedPrompt = await craftAIPrompt(
            isHistoricalEra
              ? \`\${videoBible.era_specific || videoEra} historical scene: \${clip.search_query}. Period-accurate, cinematic.\`
              : \`Photorealistic photograph related to: \${clip.search_query}. Editorial style, high resolution.\`,
            clip,
            scriptText,
            videoBible.era_specific || videoEra,
            totalDuration,
            wordTimestamps
          );`;

if (code.includes(old1)) {
  code = code.replace(old1, new1);
  console.log('✅ Fix: web_image fallback craftAIPrompt — totalDuration arg added');
} else {
  console.log('❌ Call site 1 not found');
}

// Fix call site 2 (line ~502): ai_image route
// Currently: craftAIPrompt(clip.ai_prompt, clip, scriptText, eraContext, wordTimestamps)
const old2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps);`;
const new2 = `        const detailedPrompt = await craftAIPrompt(clip.ai_prompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps);`;

if (code.includes(old2)) {
  code = code.replace(old2, new2);
  console.log('✅ Fix: ai_image route craftAIPrompt — totalDuration arg added');
} else {
  console.log('❌ Call site 2 not found');
}

// Fix call site 3 (line ~589): split/pexels fallback
const old3 = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps);`;
if (code.includes(old3)) {
  console.log('ℹ️  Call site 3 already correct — skipping');
} else {
  // Try without totalDuration
  const old3b = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps);`;
  const new3b = `        const detailedPrompt = await craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, totalDuration, wordTimestamps);`;
  if (code.includes(old3b)) {
    code = code.replace(old3b, new3b);
    console.log('✅ Fix: split fallback craftAIPrompt — totalDuration arg added');
  } else {
    console.log('❌ Call site 3 not found in either form');
  }
}

// Verify all 3 calls now have 6 args
const calls = code.match(/await craftAIPrompt\([^)]+\)/gs) || [];
console.log(`\nVerification — ${calls.length} craftAIPrompt calls found:`);
calls.forEach((c, i) => {
  const args = c.split(',').length;
  console.log(`  [${i+1}] ${args} args: ${c.slice(0,80).replace(/\n/g,' ')}...`);
});

fs.writeFileSync(file, code);
console.log('\n✅ pipeline.js saved');
