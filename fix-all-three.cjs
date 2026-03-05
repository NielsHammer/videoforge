const fs = require('fs');

const ellPath = '/opt/videoforge/src/elevenlabs.js';
let ell = fs.readFileSync(ellPath, 'utf8');
ell = ell.replace('timeOffset += chunkDuration + 0.3;', 'timeOffset += chunkDuration + 0.05;');
const oldConcat = `  try {
    execSync(\`ffmpeg -y -f concat -safe 0 -i "\${listPath}" -c copy "\${outputPath}"\`, { stdio: 'pipe' });
  } catch (e) {
    // Fallback: re-encode if copy fails
    execSync(\`ffmpeg -y -f concat -safe 0 -i "\${listPath}" -acodec libmp3lame -b:a 192k "\${outputPath}"\`, { stdio: 'pipe' });
  }`;
const newConcat = `  try {
    const n = chunkPaths.length;
    const trimmedPaths = [];
    for (let i = 0; i < chunkPaths.length; i++) {
      const trimmed = chunkPaths[i].replace('.mp3', '_trimmed.mp3');
      execSync(\`ffmpeg -y -i "\${chunkPaths[i]}" -af "silenceremove=start_periods=1:start_silence=0.04:start_threshold=-50dB:stop_periods=1:stop_silence=0.04:stop_threshold=-50dB" -acodec libmp3lame -b:a 192k "\${trimmed}"\`, { stdio: 'pipe' });
      trimmedPaths.push(trimmed);
    }
    const trimListPath = listPath.replace('.txt', '_trimmed.txt');
    fs.writeFileSync(trimListPath, trimmedPaths.map(p => \`file '\${p}'\`).join('\\n'));
    execSync(\`ffmpeg -y -f concat -safe 0 -i "\${trimListPath}" -acodec libmp3lame -b:a 192k "\${outputPath}"\`, { stdio: 'pipe' });
    trimmedPaths.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
    try { fs.unlinkSync(trimListPath); } catch(e) {}
  } catch (e) {
    try {
      execSync(\`ffmpeg -y -f concat -safe 0 -i "\${listPath}" -c copy "\${outputPath}"\`, { stdio: 'pipe' });
    } catch (e2) {
      execSync(\`ffmpeg -y -f concat -safe 0 -i "\${listPath}" -acodec libmp3lame -b:a 192k "\${outputPath}"\`, { stdio: 'pipe' });
    }
  }`;
if (ell.includes(oldConcat)) { ell = ell.replace(oldConcat, newConcat); console.log('OK 1a: elevenlabs concat'); } else { console.log('MISS 1a'); }
fs.writeFileSync(ellPath, ell);

const pipePath = '/opt/videoforge/src/pipeline.js';
let pipe = fs.readFileSync(pipePath, 'utf8');
if (pipe.includes('volume=0.18')) { pipe = pipe.replace('volume=0.18', 'volume=0.30'); console.log('OK 2: music volume -> 0.30'); } else { console.log('MISS 2'); }
fs.writeFileSync(pipePath, pipe);

const hbcPath = '/opt/videoforge/src/remotion/components/HorizontalBarChart.jsx';
let hbc = fs.readFileSync(hbcPath, 'utf8');
if (hbc.includes('width: 180,')) { hbc = hbc.replace('width: 180,', 'width: 220,'); console.log('OK 3a: HorizontalBarChart label width'); } else { console.log('MISS 3a'); }
fs.writeFileSync(hbcPath, hbc);

const cbPath = '/opt/videoforge/src/remotion/components/ComparisonBar.jsx';
let cb = fs.readFileSync(cbPath, 'utf8');
const oldLbl = `              fontSize: 28, fontWeight: 700, color: "white",\n              fontFamily: "Arial Black, Arial, sans-serif",\n              textTransform: "uppercase", letterSpacing: 3, marginBottom: 12,\n              transform: \`translateX(\${labelSlide}px)\`,`;
const newLbl = `              fontSize: 28, fontWeight: 700, color: "white",\n              fontFamily: "Arial Black, Arial, sans-serif",\n              textTransform: "uppercase", letterSpacing: 3, marginBottom: 12,\n              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",\n              transform: \`translateX(\${labelSlide}px)\`,`;
if (cb.includes(oldLbl)) { cb = cb.replace(oldLbl, newLbl); console.log('OK 3b: ComparisonBar nowrap'); } else { console.log('MISS 3b'); }
fs.writeFileSync(cbPath, cb);

const lbPath = '/opt/videoforge/src/remotion/components/Leaderboard.jsx';
let lb = fs.readFileSync(lbPath, 'utf8');
if (lb.includes('width: 200,')) { lb = lb.replace('width: 200,', 'width: 240,'); console.log('OK 3c: Leaderboard label width'); } else { console.log('MISS 3c'); }
fs.writeFileSync(lbPath, lb);

console.log('\nDone!');
