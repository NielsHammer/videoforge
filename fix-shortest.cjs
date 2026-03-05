const fs = require('fs');
const p = '/opt/videoforge/src/pipeline.js';
let pipe = fs.readFileSync(p, 'utf8');

let count = 0;
pipe = pipe.replace(/-shortest /g, () => { count++; return ''; });
console.log(`Removed ${count} instances of -shortest`);
fs.writeFileSync(p, pipe);
console.log('Done!');
