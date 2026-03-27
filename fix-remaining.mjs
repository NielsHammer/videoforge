import fs from 'fs';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
const directorFile = '/opt/videoforge/src/director.js';

let pipeline = fs.readFileSync(pipelineFile, 'utf8');
let director = fs.readFileSync(directorFile, 'utf8');

// ═══════════════════════════════════════════════════════════════════════
// FIX 4: Director script truncation — late-video clips don't match script
// buildAssignmentPrompt passes scriptText.slice(0, 5000) — cuts off ~half
// of a 10-minute video script. Director never sees what narrator says
// in the second half, so search_queries become generic.
// FIX: Pass the full script but also inject the EXACT sentence for each
// clip window directly in the window list, so Claude always has the
// narrated text even if it can't see the full script context.
// ═══════════════════════════════════════════════════════════════════════

// Fix the script truncation in buildAssignmentPrompt
if (director.includes('SCRIPT CONTEXT (full):\n${scriptText.slice(0, 5000)}')) {
  director = director.replace(
    'SCRIPT CONTEXT (full):\n${scriptText.slice(0, 5000)}',
    'SCRIPT CONTEXT (full):\n${scriptText.slice(0, 12000)}'
  );
  console.log('✅ Fix 4a: Script context increased from 5000 to 12000 chars');
} else {
  console.log('❌ Fix 4a: script truncation not found at expected location');
}

// Fix the window list to include NARRATED TEXT prominently 
// Currently: `[${i}] ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s (${dur}s) | ${instruction} | "${w.text}"`
// The text is there but buried — make it the most prominent part
const oldWindowLine = 'return `[${i}] ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s (${dur}s) | ${instruction} | "${w.text}"`;';
const newWindowLine = 'return `[${i}] ${w.start.toFixed(2)}s-${w.end.toFixed(2)}s (${dur}s) | NARRATOR SAYS: "${w.text}" | ${instruction}`;';

if (director.includes(oldWindowLine)) {
  director = director.replace(oldWindowLine, newWindowLine);
  console.log('✅ Fix 4b: Window list now leads with NARRATOR SAYS for every clip');
} else {
  console.log('❌ Fix 4b: window line format not found');
}

// Also strengthen the search_query instruction in buildAssignmentPrompt
const oldStockInstruction = `STOCK (category: stock):
- search_query: specific scene matching EXACTLY what narrator is saying — emotion + subject + context`;
const newStockInstruction = `STOCK (category: stock):
- search_query: MUST be a LITERAL visual of what the narrator is saying in that exact window
  Example: narrator says "A man hiding behind a hedge in the dark" → search_query: "shadowy figure hiding behind hedge at night dark"
  Example: narrator says "The Roman emperor stood before his army" → search_query: "roman emperor standing before army ancient rome"
  Example: narrator says "She walked into the empty house" → search_query: "woman entering empty dark house interior"
  WRONG: generic topic keywords like "horror dark atmospheric" or "history ancient scene"
  RIGHT: literal translation of the exact sentence into a visual description`;

if (director.includes(oldStockInstruction)) {
  director = director.replace(oldStockInstruction, newStockInstruction);
  console.log('✅ Fix 4c: search_query instruction now enforces literal scene matching');
} else {
  console.log('❌ Fix 4c: stock instruction not found');
}

fs.writeFileSync(directorFile, director);
console.log('✅ director.js saved');

// ═══════════════════════════════════════════════════════════════════════
// FIX 5: Subtitle style — word-by-word with yellow highlight
// Replace the phrase-group SRT approach with individual word entries
// Each word gets its own SRT entry timed exactly to ElevenLabs timestamps
// Style: yellow bold text matching the reference images shown
// ═══════════════════════════════════════════════════════════════════════

const oldGenerateSRT = `function generateSRT(wordTimestamps, outputPath) {
  if (!wordTimestamps || wordTimestamps.length === 0) return null;

  const toSRTTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return \`\${String(h).padStart(2,'0')}:\${String(m).padStart(2,'0')}:\${String(s).padStart(2,'0')},\${String(ms).padStart(3,'0')}\`;
  };

  // Group words into short phrases (3-5 words) for clean subtitle blocks
  const PHRASE_MAX = 5;
  const phrases = [];
  let i = 0;
  while (i < wordTimestamps.length) {
    const group = wordTimestamps.slice(i, i + PHRASE_MAX);
    if (group.length === 0) break;
    phrases.push({
      text: group.map(w => w.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end + 0.05, // tiny pad for last word
    });
    i += PHRASE_MAX;
  }

  // Write SRT
  const lines = phrases.map((p, idx) =>
    \`\${idx + 1}\\n\${toSRTTime(p.start)} --> \${toSRTTime(p.end)}\\n\${p.text}\\n\`
  );
  fs.writeFileSync(outputPath, lines.join('\\n'));
  return outputPath;
}`;

const newGenerateSRT = `function generateSRT(wordTimestamps, outputPath) {
  if (!wordTimestamps || wordTimestamps.length === 0) return null;

  const toSRTTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return \`\${String(h).padStart(2,'0')}:\${String(m).padStart(2,'0')}:\${String(s).padStart(2,'0')},\${String(ms).padStart(3,'0')}\`;
  };

  // Build rolling window subtitles: show a line of ~6 words at a time.
  // The CURRENT word being spoken is shown in FULL CAPS to highlight it.
  // This creates the typewriter/word-highlight effect from the reference images.
  // Window: show 3 words before current + current + 2 words after = context line
  const WINDOW_BEFORE = 3;
  const WINDOW_AFTER = 2;
  const entries = [];

  for (let i = 0; i < wordTimestamps.length; i++) {
    const curr = wordTimestamps[i];
    // Build the context window around current word
    const windowStart = Math.max(0, i - WINDOW_BEFORE);
    const windowEnd = Math.min(wordTimestamps.length - 1, i + WINDOW_AFTER);
    const windowWords = [];
    for (let j = windowStart; j <= windowEnd; j++) {
      if (j === i) {
        // Current word — uppercase and bold via SRT formatting
        windowWords.push(wordTimestamps[j].word.toUpperCase());
      } else {
        windowWords.push(wordTimestamps[j].word);
      }
    }
    const text = windowWords.join(' ');
    // Each entry lasts exactly as long as that word is spoken
    const start = curr.start;
    const end = i < wordTimestamps.length - 1
      ? wordTimestamps[i + 1].start  // end when next word starts
      : curr.end + 0.1;
    if (end > start) {
      entries.push({ text, start, end });
    }
  }

  const lines = entries.map((p, idx) =>
    \`\${idx + 1}\\n\${toSRTTime(p.start)} --> \${toSRTTime(p.end)}\\n\${p.text}\\n\`
  );
  fs.writeFileSync(outputPath, lines.join('\\n'));
  return outputPath;
}`;

if (pipeline.includes(oldGenerateSRT)) {
  pipeline = pipeline.replace(oldGenerateSRT, newGenerateSRT);
  console.log('✅ Fix 5a: Subtitle style updated to word-by-word highlight');
} else {
  console.log('❌ Fix 5a: old generateSRT not found');
}

// Fix subtitle styling to match reference images: yellow bold text
const oldSubtitleStyle = `'FontName=Arial,Bold=1,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,Outline=2,Shadow=1,Alignment=2,MarginV=60'`;
const newSubtitleStyle = `'FontName=Arial,Bold=1,FontSize=24,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BackColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=80'`;
// &H0000FFFF = yellow in BGR format (FFmpeg/ASS uses BGR)

if (pipeline.includes(oldSubtitleStyle)) {
  pipeline = pipeline.replace(oldSubtitleStyle, newSubtitleStyle);
  console.log('✅ Fix 5b: Subtitle color changed to yellow bold matching reference images');
} else {
  console.log('❌ Fix 5b: subtitle style string not found');
}

fs.writeFileSync(pipelineFile, pipeline);
console.log('✅ pipeline.js saved');
