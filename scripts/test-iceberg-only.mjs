import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import fs from 'fs';

const outDir = '/opt/videoforge/output/thumb-creative-challenge-2';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

await generateThumbnailV2(
  outDir,
  "7 Layers of the Dark Web Explained",
  "dark web layers iceberg explained",
  "Educational explainer about the layers of the internet. Surface web (Google, YouTube), Deep Web (databases, private networks), and the Dark Web (Tor, .onion sites). Goes through 7 increasingly hidden layers: 1) Surface Web, 2) Bergie Web, 3) Deep Web, 4) Charter Web, 5) Marianas Web, 6) Level 6 (The Fog), 7) The Primarch System. Each layer is more hidden and dangerous than the last.",
  "tech",
  "educational"
);
