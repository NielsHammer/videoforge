import fs from 'fs';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
let code = fs.readFileSync(pipelineFile, 'utf8');

// ── FIX 1: Ground cinematographer prompt with video topic ──────────────────────
const oldHeader = 'You are a world-class cinematographer and visual director for YouTube documentaries. Your job is to translate a narrated sentence into a perfect image prompt for Flux AI.';
const newHeader = 'You are a world-class cinematographer creating image prompts for a YouTube video. Match the visual style to the VIDEO TOPIC — never invent a different setting or era.';

if (code.includes(oldHeader)) {
  code = code.replace(oldHeader, newHeader);
  console.log('✅ Fix 1a: cinematographer header updated');
} else {
  console.log('❌ Fix 1a not found');
}

// Replace the ERA line to include modern guard
const oldEraLine = '${isHistorical ? `ERA: ${eraContext} — period-accurate visuals ONLY. Zero modern elements.` : ""}';
const newEraLine = '${isHistorical ? `ERA: ${eraContext} — period-accurate visuals ONLY. Zero modern elements.` : `SETTING: Modern day contemporary imagery. Do NOT generate ancient, medieval, Roman, Greek, or warrior imagery unless the narrator explicitly describes those things.`}';

if (code.includes(oldEraLine)) {
  code = code.replace(oldEraLine, newEraLine);
  console.log('✅ Fix 1b: modern era guard added');
} else {
  console.log('❌ Fix 1b not found');
}

// Replace wrong example with modern one
const oldWrongExample = 'WRONG — too generic: "ancient roman scene"\nRIGHT — specific and cinematic: "fourteen-year-old boy drowning in an oversized golden throne, Germanic warriors visible through marble archway behind him, dramatic chiaroscuro lighting, low angle looking up at throne, Ridley Scott epic style"';
const newWrongExample = 'WRONG — wrong era for topic: generating Roman warriors for a gym video\nRIGHT — matches topic: "muscular athlete performing weighted squat in modern gym, dramatic side lighting highlighting muscle definition, low angle shot, sports photography style, shallow depth of field"';

if (code.includes(oldWrongExample)) {
  code = code.replace(oldWrongExample, newWrongExample);
  console.log('✅ Fix 1c: wrong example replaced');
} else {
  console.log('❌ Fix 1c not found');
}

// Add topic line after NARRATOR SAYS
const oldNarratorLine = 'NARRATOR SAYS: "${narratedSentence || basicPrompt}"';
const newNarratorLine = 'VIDEO TOPIC CONTEXT: "${basicPrompt.slice(0, 120)}"\nNARRATOR SAYS: "${narratedSentence || basicPrompt}"';

if (code.includes(oldNarratorLine)) {
  code = code.replace(oldNarratorLine, newNarratorLine);
  console.log('✅ Fix 1d: VIDEO TOPIC CONTEXT line added');
} else {
  console.log('❌ Fix 1d not found');
}

// ── FIX 2: Replace word-per-entry SRT with phrase-based ASS karaoke ────────────
// Find generateSRT and replace with ASS generator
const srtFuncStart = 'function generateSRT(wordTimestamps, outputPath) {';
const srtFuncEnd = '  fs.writeFileSync(outputPath, lines.join(\'\\n\'));\n  return outputPath;\n}';

const srtStart = code.indexOf(srtFuncStart);
const srtEnd = code.indexOf(srtFuncEnd, srtStart);

if (srtStart === -1 || srtEnd === -1) {
  console.log('❌ Fix 2: generateSRT boundaries not found');
} else {
  const newSRTFunc = `function generateSRT(wordTimestamps, outputPath) {
  if (!wordTimestamps || wordTimestamps.length === 0) return null;

  // Use ASS karaoke format — one phrase line stays on screen,
  // current word highlights yellow as spoken. No flickering.
  const toASSTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.round((s % 1) * 100);
    return h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0') + '.' + String(cs).padStart(2,'0');
  };

  // Group into phrases of 5 words — each phrase = one on-screen line
  const PHRASE_SIZE = 5;
  const phrases = [];
  for (let i = 0; i < wordTimestamps.length; i += PHRASE_SIZE) {
    const group = wordTimestamps.slice(i, i + PHRASE_SIZE);
    if (!group.length) break;
    phrases.push({ words: group, start: group[0].start, end: group[group.length-1].end + 0.15 });
  }

  const header = \`[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,56,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,3,1,2,80,80,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
\`;

  const lines = phrases.map(phrase => {
    const kText = phrase.words.map((w, wi) => {
      const nextStart = wi < phrase.words.length - 1 ? phrase.words[wi+1].start : w.end + 0.15;
      const dur = Math.max(1, Math.round((nextStart - w.start) * 100));
      return '{\\\\kf' + dur + '}' + w.word;
    }).join(' ');
    return 'Dialogue: 0,' + toASSTime(phrase.start) + ',' + toASSTime(phrase.end) + ',Default,,0,0,0,,' + kText;
  });

  const assPath = outputPath.replace(/\\.srt$/, '.ass');
  fs.writeFileSync(assPath, header + lines.join('\\n'));
  return assPath;
}`;

  code = code.slice(0, srtStart) + newSRTFunc + code.slice(srtEnd + srtFuncEnd.length);
  console.log('✅ Fix 2: generateSRT replaced with ASS karaoke generator');
}

// Fix burnSubtitles to use ass filter
const oldBurn = "const escapedSrt = srtPath.replace(/:/g, '\\\\:');\n    execSync(\n      `ffmpeg -y -i \"${videoPath}\" -vf \"subtitles='${escapedSrt}':force_style='FontName=Arial,Bold=1,FontSize=24,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BackColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=80'\" -c:a copy \"${outputPath}\"`";
const newBurn = "const escapedAss = srtPath.replace(/:/g, '\\\\:');\n    execSync(\n      `ffmpeg -y -i \"${videoPath}\" -vf \"ass='${escapedAss}'\" -c:a copy \"${outputPath}\"`";

if (code.includes(oldBurn)) {
  code = code.replace(oldBurn, newBurn);
  console.log('✅ Fix 2b: burnSubtitles uses ass filter');
} else {
  console.log('❌ Fix 2b not found — trying partial...');
  if (code.includes("subtitles='${escapedSrt}'")) {
    code = code.replace("subtitles='${escapedSrt}':force_style='FontName=Arial,Bold=1,FontSize=24,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BackColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=80'", "ass='${escapedAss}'");
    code = code.replace('const escapedSrt = srtPath', 'const escapedAss = srtPath');
    console.log('✅ Fix 2b: partial replacement done');
  }
}

// Fix pipeline to use returned ass path
const oldSrtCheck = "  if (srtGenerated && fs.existsSync(srtPath)) {\n    const burned = await burnSubtitles(finalPath, srtPath, subtitledPath);";
const newSrtCheck = "  const subFile = srtGenerated || null;\n  if (subFile && fs.existsSync(subFile)) {\n    const burned = await burnSubtitles(finalPath, subFile, subtitledPath);";

if (code.includes(oldSrtCheck)) {
  code = code.replace(oldSrtCheck, newSrtCheck);
  console.log('✅ Fix 2c: pipeline uses returned ass path');
} else {
  console.log('❌ Fix 2c not found');
}

fs.writeFileSync(pipelineFile, code);
console.log('\n✅ Done — pipeline.js saved');
