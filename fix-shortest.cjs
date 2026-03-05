const fs = require('fs');
const p = '/opt/videoforge/src/pipeline.js';
let pipe = fs.readFileSync(p, 'utf8');

// Fix 1: music merge - replace -shortest with nothing (video drives length)
// Also fix amix duration=first to duration=longest
const old1 = `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]` +
  `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;
const new1 = `[voice][music]amix=inputs=2:duration=longest:dropout_transition=2[aout]` +
  `" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;

if (pipe.includes(old1)) {
  pipe = pipe.replace(old1, new1);
  console.log('OK 1: fixed music merge duration');
} else {
  console.log('MISS 1');
}

// Fix 2: voice-only merge - remove -shortest
const old2 = '`ffmpeg -y -i "${videoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`';
const new2 = '`ffmpeg -y -i "${videoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${outputPath}"`';

if (pipe.includes(old2)) {
  pipe = pipe.replace(old2, new2);
  console.log('OK 2: fixed voice-only merge');
} else {
  console.log('MISS 2');
}

fs.writeFileSync(p, pipe);
console.log('Done!');
