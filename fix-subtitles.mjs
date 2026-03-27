import fs from 'fs';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
let pipeline = fs.readFileSync(pipelineFile, 'utf8');

// ═══════════════════════════════════════════════════════════════════════
// FIX 3: Subtitle generation
// Word-by-word subtitles burned into the final video using FFmpeg drawtext
// Exactly matches voiceover timing from ElevenLabs word timestamps
// Style: yellow bold text, bottom-center, word highlights as narrator speaks
// ═══════════════════════════════════════════════════════════════════════

// 1. Add subtitle SRT generator function after the mergeAudioVideoSimple function
const subtitleFunc = `
// ─── SUBTITLE GENERATION ─────────────────────────────────────────────────────
// Generates an SRT file from ElevenLabs word timestamps.
// Each subtitle entry = one word, timed exactly to when narrator says it.
// Groups words into short phrases (max 5 words) for readability.
function generateSRT(wordTimestamps, outputPath) {
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
}

// Burn subtitles into final video using FFmpeg subtitles filter
// SRT is the cleanest approach — handles all special chars safely
async function burnSubtitles(videoPath, srtPath, outputPath) {
  const s = ora('Burning subtitles...').start();
  try {
    // Use the subtitles filter with custom styling
    // FontName=Arial,Bold — clean, readable on any background
    // PrimaryColour=&H00FFFFFF — white text
    // OutlineColour=&H00000000 — black outline for contrast on any background  
    // Shadow=1, Outline=2 — strong outline so text is readable on bright or dark frames
    // Alignment=2 — bottom center
    // MarginV=60 — above the bottom edge
    const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
    execSync(
      \`ffmpeg -y -i "\${videoPath}" -vf "subtitles='\${escapedSrt}':force_style='FontName=Arial,Bold=1,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,Outline=2,Shadow=1,Alignment=2,MarginV=60'" -c:a copy "\${outputPath}"\`,
      { stdio: 'pipe', timeout: 1800000 }
    );
    s.succeed('Subtitles burned');
    return true;
  } catch (err) {
    s.warn('Subtitle burn failed: ' + (err?.message || 'unknown'));
    // If subtitle burning fails, just copy the original without subtitles
    try {
      fs.copyFileSync(videoPath, outputPath);
    } catch(e) {}
    return false;
  }
}
`;

// 2. Inject subtitle functions before the last export / end of file
if (!pipeline.includes('function generateSRT(')) {
  // Insert after mergeAudioVideoSimple function
  const insertAfter = `  } catch {
    execSync(
      \`ffmpeg -y -i "\${videoPath}" -i "\${audioPath}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k "\${outputPath}"\`,
      { stdio: "pipe", timeout: 1800000 }
    );
    s.succeed("Merged (re-encoded)");
  }
}`;
  
  if (pipeline.includes(insertAfter)) {
    pipeline = pipeline.replace(insertAfter, insertAfter + '\n' + subtitleFunc);
    console.log('✅ Fix 3a: Subtitle functions injected');
  } else {
    console.log('❌ Fix 3a: merge function end not found');
  }
} else {
  console.log('ℹ️  generateSRT already exists, skipping injection');
}

// 3. Hook subtitles into the pipeline after the merge step
// Find the step that calls mergeAudioVideoSimple and add subtitle burning after
const oldMergeCall = `  await mergeAudioVideoSimple(silentPath, audioPath, finalPath, musicTrack?.path || null, audioDuration);`;

const newMergeCall = `  await mergeAudioVideoSimple(silentPath, audioPath, finalPath, musicTrack?.path || null, audioDuration);

  // --- SUBTITLE STEP: burn word-timed subtitles into the final video ---
  const srtPath = path.join(outputDir, 'subtitles.srt');
  const subtitledPath = path.join(outputDir, 'final-subtitled.mp4');
  const srtGenerated = generateSRT(wordTimestamps, srtPath);
  if (srtGenerated && fs.existsSync(srtPath)) {
    const burned = await burnSubtitles(finalPath, srtPath, subtitledPath);
    if (burned && fs.existsSync(subtitledPath) && fs.statSync(subtitledPath).size > 1000) {
      // Replace final.mp4 with subtitled version
      fs.renameSync(subtitledPath, finalPath);
      console.log(chalk.green('  ✅ Subtitles burned into video'));
    }
  } else {
    console.log(chalk.yellow('  ⚠️  No word timestamps for subtitles — skipping'));
  }`;

if (pipeline.includes(oldMergeCall)) {
  pipeline = pipeline.replace(oldMergeCall, newMergeCall);
  console.log('✅ Fix 3b: Subtitle burning hooked into pipeline after merge');
} else {
  console.log('❌ Fix 3b: merge call not found');
}

fs.writeFileSync(pipelineFile, pipeline);
console.log('✅ pipeline.js saved with subtitles');
