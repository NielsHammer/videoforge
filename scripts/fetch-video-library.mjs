#!/usr/bin/env node
/**
 * VideoForge Video Library Fetcher
 *
 * Fetches metadata, thumbnails, descriptions, and transcripts for YouTube videos
 * and stores them in /opt/videoforge/video-library/<videoId>/
 *
 * Usage: node scripts/fetch-video-library.mjs [url1] [url2] ...
 *    or: node scripts/fetch-video-library.mjs --file urls.txt
 *    or: node scripts/fetch-video-library.mjs --all  (processes ALL_URLS below)
 */

import { Innertube } from 'youtubei.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const LIBRARY_DIR = '/opt/videoforge/video-library';
const THUMB_REFS_DIR = '/opt/videoforge/thumbnail-references/_analysis';

// ─── ALL VIDEO URLS ─────────────────────────────────────────────────────────────
const ALL_URLS = [
  // Batch 1 - "new" (thumbnail analysis focus)
  "https://www.youtube.com/watch?v=b2_M-1YqnNI",
  "https://www.youtube.com/watch?v=FXF-nD4U5zk",
  "https://www.youtube.com/watch?v=1ozN_0gYTBk",
  "https://www.youtube.com/watch?v=BNfIPVjQwEA",
  "https://www.youtube.com/watch?v=TY9dnrbQano",
  "https://www.youtube.com/watch?v=21VlOjklczE",
  "https://www.youtube.com/watch?v=1-B7sbmB-1w",
  "https://www.youtube.com/watch?v=YG9_MtPOp8w",
  "https://www.youtube.com/watch?v=NgR8fPR3vuQ",
  "https://www.youtube.com/watch?v=fmt5v-9mB5Y",
  "https://www.youtube.com/watch?v=mqFbO8pE7qc",
  "https://www.youtube.com/watch?v=CptjZq0RaZQ",
  "https://www.youtube.com/watch?v=ab8bgVo45_c",
  "https://www.youtube.com/watch?v=LbLLWmmL3YE",
  "https://www.youtube.com/watch?v=uVzCPllwmqw",
  "https://www.youtube.com/watch?v=lFFZhAIrvcc",
  "https://www.youtube.com/watch?v=QHorzBmHl7g",
  "https://www.youtube.com/watch?v=F9DwcURdhgQ",
  "https://www.youtube.com/watch?v=FJFJP6EvsaQ",
  "https://www.youtube.com/watch?v=DDmZBhA-C9M",
  "https://www.youtube.com/watch?v=33mfuVGDrVk",
  "https://www.youtube.com/watch?v=S-6CFpiZLVM",
  "https://www.youtube.com/watch?v=O1sPR-UlYuo",
  "https://www.youtube.com/watch?v=sargwkHeMVU",
  "https://www.youtube.com/watch?v=5gOWnldoNtY",
  "https://www.youtube.com/watch?v=69AIF--tUpk",
  "https://www.youtube.com/watch?v=kv2JjhPVZeU",
  "https://www.youtube.com/watch?v=580O3Z-8ok0",
  // Batch 2 - top performing scripts
  "https://www.youtube.com/watch?v=D80KULtCbHw",
  "https://www.youtube.com/watch?v=k_kSCjdf8D0",
  "https://www.youtube.com/watch?v=bq96s64K2YM",
  "https://www.youtube.com/watch?v=m4WOwgUMQuc",
  "https://www.youtube.com/watch?v=6VYtImsCQ44",
  "https://www.youtube.com/watch?v=eJyz7CRWWW0",
  "https://www.youtube.com/watch?v=APSkB4hP73M",
  // Batch 3 - "new 2.0"
  "https://www.youtube.com/watch?v=tW13N4Hll88",
  "https://www.youtube.com/watch?v=i5OZQQWj5-I",
  "https://www.youtube.com/watch?v=P9iWPk7IW-M",
  "https://www.youtube.com/watch?v=rf_EQvubKlk",
  "https://www.youtube.com/watch?v=ZudTPpJCbbA",
  "https://www.youtube.com/watch?v=0L6Rcgp6j7Y",
  "https://www.youtube.com/watch?v=e-QmGJU1XYc",
  "https://www.youtube.com/watch?v=ZTMregh_428",
  "https://www.youtube.com/watch?v=9JEmsSItdt4",
  "https://www.youtube.com/watch?v=I9unIJnobQU",
  "https://www.youtube.com/watch?v=XBcMiYK7qYY",
  "https://www.youtube.com/watch?v=2G78zkuQSc0",
  "https://www.youtube.com/watch?v=3l6zQTbcgPs",
  "https://www.youtube.com/watch?v=m00WzTsohlA",
  "https://www.youtube.com/watch?v=WEBT1shPyok",
  "https://www.youtube.com/watch?v=W6xjV7lejk8",
  "https://www.youtube.com/watch?v=en-ClrgaV8U",
  "https://www.youtube.com/watch?v=hCSHuvDejGA",
  "https://www.youtube.com/watch?v=OFC8eddNCVs",
  "https://www.youtube.com/watch?v=ZYdCnwI4IkA",
  "https://www.youtube.com/watch?v=xfOT2elC2Ok",
  "https://www.youtube.com/watch?v=5rhHm6WWOIs",
  "https://www.youtube.com/watch?v=2SLSser4y6U",
  "https://www.youtube.com/watch?v=KMbFjoHUYbA",
  "https://www.youtube.com/watch?v=Ay4fmZdZqJE",
  "https://www.youtube.com/watch?v=jw_CWHs2YDU",
  "https://www.youtube.com/watch?v=C6eXTvqdaro",
  "https://www.youtube.com/watch?v=-C_5hzJCHaY",
  "https://www.youtube.com/watch?v=1-izXBhkiHw",
  "https://www.youtube.com/watch?v=XjV4HYZTJB8",
  "https://www.youtube.com/watch?v=lSWDYzC0BvA",
  "https://www.youtube.com/watch?v=Jvkt5UhmxHw",
  "https://www.youtube.com/watch?v=56AD4lejvag",
  "https://www.youtube.com/watch?v=KhFlD54nQrY",
  "https://www.youtube.com/watch?v=YFA8AS5Cu2w",
  "https://www.youtube.com/watch?v=oRMG_HpOAN4",
  "https://www.youtube.com/watch?v=aFoMYz_jWcs",
  "https://www.youtube.com/watch?v=hASHO5ap1Sw",
  "https://www.youtube.com/watch?v=3-MSlNVqzYY",
  "https://www.youtube.com/watch?v=TLPHmHPaCiQ",
  "https://www.youtube.com/watch?v=_OmpRDWRT9U",
  "https://www.youtube.com/watch?v=aQNgelm7JeE",
  "https://www.youtube.com/watch?v=y27B-sKIUHA",
  "https://www.youtube.com/watch?v=fxqcwK5OMag",
  "https://www.youtube.com/watch?v=uVPoq1Svz7g",
  "https://www.youtube.com/watch?v=lRQuyCfSmeI",
  "https://www.youtube.com/watch?v=iyUR6PANjJk",
  "https://www.youtube.com/watch?v=Eq6ATHhBezw",
  "https://www.youtube.com/watch?v=-um9zKf1V30",
  "https://www.youtube.com/watch?v=ROf4oNqGEUc",
  "https://www.youtube.com/watch?v=Od9OG4MGDWA",
  "https://www.youtube.com/watch?v=UM9axnjB4Y4",
  "https://www.youtube.com/watch?v=dVnY0NF4wVo",
  "https://www.youtube.com/watch?v=0Bln-DSbpWU",
  "https://www.youtube.com/watch?v=9XdBltWIe-4",
  "https://www.youtube.com/watch?v=MlD2h0BP0Jc",
  "https://www.youtube.com/watch?v=xSw4eSjR2jY",
];

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch {}
      reject(err);
    });
  });
}

async function downloadThumbnail(videoId, destDir) {
  const sizes = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'];
  for (const size of sizes) {
    const url = `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
    const dest = path.join(destDir, `thumbnail.jpg`);
    try {
      await downloadFile(url, dest);
      const stats = fs.statSync(dest);
      // YouTube returns a small placeholder for missing maxres
      if (stats.size > 5000) {
        return { path: dest, quality: size };
      }
      fs.unlinkSync(dest);
    } catch {}
  }
  return null;
}

async function fetchVideoMetadata(yt, videoId) {
  const info = await yt.getInfo(videoId);
  const pi = info.primary_info;
  const si = info.secondary_info;

  const title = pi?.title?.toString() || '';
  const viewCountStr = pi?.view_count?.view_count?.toString() || '';
  const viewCount = parseInt(viewCountStr.replace(/[^0-9]/g, '')) || 0;
  const shortViews = pi?.view_count?.short_view_count?.toString() || '';
  const likeCount = info.basic_info?.like_count || 0;
  const relativeDate = pi?.relative_date?.toString() || pi?.published?.toString() || '';
  const description = si?.description?.toString() || '';
  const channel = si?.owner?.author?.name || '';
  const channelUrl = si?.owner?.author?.url || '';
  const tags = info.basic_info?.tags || [];

  // Try to get transcript
  let transcript = null;
  try {
    const transcriptData = await info.getTranscript();
    const segments = transcriptData?.transcript?.content?.body?.initial_segments;
    if (segments && segments.length > 0) {
      transcript = segments.map(s => ({
        text: s.snippet?.text?.toString() || '',
        start: s.start_ms ? parseInt(s.start_ms) / 1000 : 0,
        duration: s.end_ms && s.start_ms ? (parseInt(s.end_ms) - parseInt(s.start_ms)) / 1000 : 0
      })).filter(s => s.text);
    }
  } catch {}

  return {
    videoId,
    title,
    channel,
    channelUrl,
    viewCount,
    shortViews,
    likeCount,
    relativeDate,
    description,
    tags,
    transcript,
    fetchedAt: new Date().toISOString()
  };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────────

async function processVideo(yt, url, index, total) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    console.log(`  [${index}/${total}] SKIP - invalid URL: ${url}`);
    return { videoId: null, status: 'invalid_url' };
  }

  const videoDir = path.join(LIBRARY_DIR, videoId);
  const metaPath = path.join(videoDir, 'metadata.json');

  // Skip if already fully processed
  if (fs.existsSync(metaPath)) {
    const existing = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    if (existing.title && existing.description) {
      console.log(`  [${index}/${total}] CACHED - ${videoId} "${existing.title.substring(0, 50)}..."`);
      return { videoId, status: 'cached', title: existing.title };
    }
  }

  fs.mkdirSync(videoDir, { recursive: true });

  try {
    // Fetch metadata
    console.log(`  [${index}/${total}] FETCHING - ${videoId}...`);
    const meta = await fetchVideoMetadata(yt, videoId);

    // Download thumbnail
    const thumbResult = await downloadThumbnail(videoId, videoDir);
    if (thumbResult) {
      meta.thumbnailQuality = thumbResult.quality;
      meta.thumbnailPath = thumbResult.path;
    }

    // Also copy thumbnail to _analysis dir for the analysis pipeline
    if (thumbResult && fs.existsSync(thumbResult.path)) {
      const analysisThumb = path.join(THUMB_REFS_DIR, `${videoId}.jpg`);
      if (!fs.existsSync(analysisThumb)) {
        fs.copyFileSync(thumbResult.path, analysisThumb);
      }
    }

    // Save full transcript as separate file if available
    if (meta.transcript) {
      const fullText = meta.transcript.map(s => s.text).join(' ');
      fs.writeFileSync(path.join(videoDir, 'transcript.txt'), fullText, 'utf-8');
      fs.writeFileSync(path.join(videoDir, 'transcript.json'), JSON.stringify(meta.transcript, null, 2), 'utf-8');
      meta.hasTranscript = true;
      meta.transcriptWordCount = fullText.split(/\s+/).length;
      delete meta.transcript; // Don't bloat metadata.json
    } else {
      meta.hasTranscript = false;
    }

    // Save metadata
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    console.log(`  [${index}/${total}] OK - "${meta.title?.substring(0, 60)}" (${meta.shortViews}, ${meta.hasTranscript ? 'has transcript' : 'no transcript'})`);
    return { videoId, status: 'ok', title: meta.title, views: meta.shortViews };

  } catch (err) {
    console.log(`  [${index}/${total}] ERROR - ${videoId}: ${err.message}`);
    // Save partial data so we know we tried
    fs.writeFileSync(metaPath, JSON.stringify({ videoId, error: err.message, fetchedAt: new Date().toISOString() }, null, 2), 'utf-8');
    return { videoId, status: 'error', error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let urls;

  if (args.includes('--all')) {
    urls = ALL_URLS;
  } else if (args.includes('--file')) {
    const filePath = args[args.indexOf('--file') + 1];
    urls = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim() && l.includes('youtube'));
  } else if (args.length > 0) {
    urls = args.filter(a => a.includes('youtube'));
  } else {
    console.log('Usage: node scripts/fetch-video-library.mjs --all');
    console.log('       node scripts/fetch-video-library.mjs --file urls.txt');
    console.log('       node scripts/fetch-video-library.mjs <url1> <url2> ...');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`VideoForge Video Library Fetcher`);
  console.log(`Processing ${urls.length} videos`);
  console.log(`Output: ${LIBRARY_DIR}`);
  console.log(`${'='.repeat(60)}\n`);

  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  fs.mkdirSync(THUMB_REFS_DIR, { recursive: true });

  const yt = await Innertube.create();

  const results = { ok: 0, cached: 0, error: 0, invalid: 0 };

  for (let i = 0; i < urls.length; i++) {
    const result = await processVideo(yt, urls[i], i + 1, urls.length);
    results[result.status === 'ok' ? 'ok' : result.status === 'cached' ? 'cached' : result.status === 'error' ? 'error' : 'invalid']++;

    // Small delay to avoid rate limiting
    if (result.status === 'ok') {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Build index file
  const index = {};
  const dirs = fs.readdirSync(LIBRARY_DIR).filter(d =>
    fs.statSync(path.join(LIBRARY_DIR, d)).isDirectory()
  );
  for (const dir of dirs) {
    const metaPath = path.join(LIBRARY_DIR, dir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (meta.title) {
          index[dir] = {
            title: meta.title,
            channel: meta.channel,
            views: meta.shortViews || meta.viewCount,
            hasTranscript: meta.hasTranscript || false,
            hasThumbnail: fs.existsSync(path.join(LIBRARY_DIR, dir, 'thumbnail.jpg'))
          };
        }
      } catch {}
    }
  }
  fs.writeFileSync(path.join(LIBRARY_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE: ${results.ok} fetched, ${results.cached} cached, ${results.error} errors, ${results.invalid} invalid`);
  console.log(`Index: ${Object.keys(index).length} videos in ${LIBRARY_DIR}/index.json`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
