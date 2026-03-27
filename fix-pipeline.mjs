import fs from 'fs';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
const elevenlabsFile = '/opt/videoforge/src/elevenlabs.js';

let pipeline = fs.readFileSync(pipelineFile, 'utf8');
let elevenlabs = fs.readFileSync(elevenlabsFile, 'utf8');

// ═══════════════════════════════════════════════════════════════════════
// FIX 1: craftAIPrompt — pass wordTimestamps not scriptText
// Line 65: extractNarratedSentence(scriptText, ...) → extractNarratedSentence(wordTimestamps, ...)
// craftAIPrompt signature: (basicPrompt, clip, scriptText, eraContext, totalDuration)
// It never received wordTimestamps — we add it as 6th param and thread it through
// ═══════════════════════════════════════════════════════════════════════

// Fix the function signature to accept wordTimestamps as 6th param
if (pipeline.includes('async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0) {')) {
  pipeline = pipeline.replace(
    'async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0) {',
    'async function craftAIPrompt(basicPrompt, clip, scriptText, eraContext = "", totalDuration = 0, wordTimestamps = []) {'
  );
  console.log('✅ Fix 1a: craftAIPrompt signature updated');
} else {
  console.log('❌ Fix 1a: craftAIPrompt signature not found');
}

// Fix the call inside craftAIPrompt - use wordTimestamps not scriptText
if (pipeline.includes('const narratedSentence = extractNarratedSentence(scriptText, clipStart, clipEnd, totalDuration);')) {
  pipeline = pipeline.replace(
    'const narratedSentence = extractNarratedSentence(scriptText, clipStart, clipEnd, totalDuration);',
    'const narratedSentence = extractNarratedSentence(wordTimestamps, clipStart, clipEnd);'
  );
  console.log('✅ Fix 1b: extractNarratedSentence now receives wordTimestamps');
} else {
  console.log('❌ Fix 1b: narratedSentence call not found');
}

// Fix all 3 call sites of craftAIPrompt to pass wordTimestamps as 6th arg
// Call site 1: craftAIPrompt(basePrompt, clip, scriptText, videoBible.era_specific || videoEra, wordTimestamps)
// This one already passes wordTimestamps as 5th arg (but signature says it's totalDuration!)
// We need to check what's actually being passed

const craftCalls = pipeline.match(/await craftAIPrompt\([^)]+\)/g);
console.log('craftAIPrompt call sites found:', craftCalls?.length);
craftCalls?.forEach((c, i) => console.log(`  [${i}]: ${c.slice(0, 120)}`));

// Fix call sites - add wordTimestamps as the correct 6th argument
// Call site format: craftAIPrompt(basicPrompt, clip, scriptText, eraContext, wordTimestamps)
// But signature is: craftAIPrompt(basicPrompt, clip, scriptText, eraContext, totalDuration, wordTimestamps)
// So existing calls passing wordTimestamps as 5th arg are wrong — fix them

pipeline = pipeline.replace(
  /await craftAIPrompt\(\s*([^,]+),\s*clip,\s*scriptText,\s*([^,]+),\s*wordTimestamps\s*\)/g,
  'await craftAIPrompt($1, clip, scriptText, $2, totalDuration, wordTimestamps)'
);
console.log('✅ Fix 1c: craftAIPrompt callers updated to pass wordTimestamps as 6th arg');

fs.writeFileSync(pipelineFile, pipeline);
console.log('✅ pipeline.js saved');

// ═══════════════════════════════════════════════════════════════════════
// FIX 2: Audio chunk concat — increase gap between chunks to avoid 
// timestamp drift that causes echo. 0.05s → probe actual duration
// ═══════════════════════════════════════════════════════════════════════

// The real fix: instead of guessing chunk duration from character timestamps,
// write each chunk to disk and probe its actual duration with ffprobe
// This eliminates drift between audio file and word timestamps

const oldChunkDuration = `    const lastCharEnd = data.alignment?.character_end_times_seconds;
    const chunkDuration = lastCharEnd && lastCharEnd.length > 0
      ? lastCharEnd[lastCharEnd.length - 1]
      : (words.length > 0 ? words[words.length - 1].end - timeOffset : 0);
    timeOffset += chunkDuration + 0.05;`;

const newChunkDuration = `    // Write chunk to temp file immediately so we can probe actual audio duration
    const tmpChunkPath = path.join(path.dirname(outputPath), \`_probe_chunk_\${i}.mp3\`);
    fs.writeFileSync(tmpChunkPath, buf);
    let chunkDuration = 0;
    try {
      const probeOut = execSync(
        \`ffprobe -v quiet -print_format json -show_streams "\${tmpChunkPath}"\`,
        { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
      );
      const probeData = JSON.parse(probeOut);
      const audioStream = probeData.streams.find(s => s.codec_type === 'audio');
      if (audioStream?.duration) {
        chunkDuration = parseFloat(audioStream.duration);
      }
    } catch(probeErr) {
      // Fall back to character timestamps if probe fails
      const lastCharEnd = data.alignment?.character_end_times_seconds;
      chunkDuration = lastCharEnd && lastCharEnd.length > 0
        ? lastCharEnd[lastCharEnd.length - 1]
        : (words.length > 0 ? words[words.length - 1].end - timeOffset : 0);
    }
    try { fs.unlinkSync(tmpChunkPath); } catch(e) {}
    timeOffset += chunkDuration;`;

if (elevenlabs.includes(oldChunkDuration)) {
  elevenlabs = elevenlabs.replace(oldChunkDuration, newChunkDuration);
  console.log('✅ Fix 2: Audio chunk duration now probed from actual file (eliminates echo drift)');
} else {
  console.log('❌ Fix 2: chunk duration block not found — checking partial...');
  if (elevenlabs.includes('timeOffset += chunkDuration + 0.05;')) {
    elevenlabs = elevenlabs.replace(
      'timeOffset += chunkDuration + 0.05;',
      'timeOffset += chunkDuration;'
    );
    console.log('✅ Fix 2 (partial): removed 0.05s gap');
  }
}

fs.writeFileSync(elevenlabsFile, elevenlabs);
console.log('✅ elevenlabs.js saved');

