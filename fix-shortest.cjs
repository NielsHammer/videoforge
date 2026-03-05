const fs = require('fs');
const p = '/opt/videoforge/src/pipeline.js';
let pipe = fs.readFileSync(p, 'utf8');

// Fix 1: music merge - replace -shortest with explicit duration
const oldMusic = `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;
const newMusic = `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;
if (pipe.includes(oldMusic)) { pipe = pipe.replace(oldMusic, newMusic); console.log('OK 1: removed -shortest from music merge'); } else { console.log('MISS 1'); }

// Fix 2: voice-only merge - replace -shortest
const oldVoice = `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;
const newVoice = `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${outputPath}"`;
if (pipe.includes(oldVoice)) { pipe = pipe.replace(oldVoice, newVoice); console.log('OK 2: removed -shortest from voice merge'); } else { console.log('MISS 2'); }

// Fix 3: re-encode fallback - replace -shortest
const oldRe = `-c:a aac -b:a 192k -shortest "${outputPath}"`;
const newRe = `-c:a aac -b:a 192k "${outputPath}"`;
// Only replace remaining instances (first two already handled)
let count = 0;
pipe = pipe.replace(new RegExp(`-c:a aac -b:a 192k -shortest "\\$\\{outputPath\\}"`, 'g'), (match) => {
  count++;
  return `-c:a aac -b:a 192k "${outputPath}"`;
});
if (count > 0) console.log(`OK 3: removed ${count} more -shortest instances`);

fs.writeFileSync(p, pipe);
console.log('Done!');
