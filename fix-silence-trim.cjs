const fs = require('fs');
const p = '/opt/videoforge/src/elevenlabs.js';
let ell = fs.readFileSync(p, 'utf8');

const oldConcat = `  try {
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

const newConcat = `  try {
    execSync(\`ffmpeg -y -f concat -safe 0 -i "\${listPath}" -acodec libmp3lame -b:a 192k "\${outputPath}"\`, { stdio: 'pipe' });
  } catch (e) {
    execSync(\`ffmpeg -y -f concat -safe 0 -i "\${listPath}" -c copy "\${outputPath}"\`, { stdio: 'pipe' });
  }`;

if (ell.includes(oldConcat)) {
  ell = ell.replace(oldConcat, newConcat);
  console.log('OK: removed silence trimming');
} else {
  console.log('MISS: block not found');
}
fs.writeFileSync(p, ell);
console.log('Done!');
