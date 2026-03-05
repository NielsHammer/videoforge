import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOFORGE_DIR = '/opt/videoforge';
const PORT = 3001;

const app = express();
app.use('/output', express.static(path.join(VIDEOFORGE_DIR, 'output'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[fileserver] Running on port ${PORT}`);
});
