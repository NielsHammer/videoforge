import fs from 'fs';
import path from 'path';

const ASSET_CACHE_DIR = '/opt/videoforge/asset-cache';

// Ensure cache dir exists
fs.mkdirSync(ASSET_CACHE_DIR, { recursive: true });

export function getCacheKey(query) {
  return query.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-').slice(0, 80);
}

export function getCachedAsset(query) {
  const cachePath = path.join(ASSET_CACHE_DIR, `${getCacheKey(query)}.jpg`);
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 5000) {
    return cachePath;
  }
  return null;
}

export function saveCachedAsset(query, sourcePath) {
  try {
    const cachePath = path.join(ASSET_CACHE_DIR, `${getCacheKey(query)}.jpg`);
    if (!fs.existsSync(cachePath)) {
      fs.copyFileSync(sourcePath, cachePath);
    }
  } catch (e) { /* non-fatal */ }
}
