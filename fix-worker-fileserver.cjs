const fs = require('fs');
const path = '/opt/videoforge/src/worker.js';
let w = fs.readFileSync(path, 'utf8');

// Remove express import
w = w.replace("import express from 'express';\n", '');

// Remove file server block
const oldServer = `// File server for video delivery
const app = express();
app.use('/output', express.static(path.join(VIDEOFORGE_DIR, 'output'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
  }
}));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.listen(FILE_SERVER_PORT, '0.0.0.0', () => {
  log(\`File server running on https://files.tubeautomate.com\`);
});`;

if (w.includes(oldServer)) {
  w = w.replace(oldServer, '');
  console.log('OK: removed file server from worker');
} else {
  console.log('MISS: could not find file server block - check manually');
}

// Remove unused constants
w = w.replace("const SERVER_IP = '178.156.209.219';\n", '');
w = w.replace("const FILE_SERVER_PORT = 3001;\n", '');

// Update log line
w = w.replace(
  "log(`File server: https://files.tubeautomate.com`);",
  "log('Worker started. File server runs separately.');"
);

fs.writeFileSync(path, w);
console.log('Done!');
