#!/usr/bin/env node
/**
 * VideoForge Transcript Fetcher — Run this on your LOCAL machine (not cloud server)
 *
 * Downloads transcripts for all videos in the VideoForge library.
 * Must be run from a non-cloud IP (your Mac, home network, etc.)
 *
 * Setup:
 *   npm install youtube-transcript
 *
 * Usage:
 *   node fetch-transcripts-local.mjs
 *
 * Then upload to server:
 *   scp -r ./transcripts/ root@YOUR_SERVER:/opt/videoforge/video-library-transcripts/
 *
 * Or use the built-in upload:
 *   node fetch-transcripts-local.mjs --upload root@YOUR_SERVER
 */

import { YoutubeTranscript } from 'youtube-transcript';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── ALL VIDEO IDS ──────────────────────────────────────────────────────────────
const VIDEO_IDS = [
  "-C_5hzJCHaY", "-um9zKf1V30", "0Bln-DSbpWU", "0L6Rcgp6j7Y", "1-B7sbmB-1w",
  "1-izXBhkiHw", "1ozN_0gYTBk", "21VlOjklczE", "2G78zkuQSc0", "2SLSser4y6U",
  "3-MSlNVqzYY", "33mfuVGDrVk", "3l6zQTbcgPs", "56AD4lejvag", "580O3Z-8ok0",
  "5gOWnldoNtY", "5rhHm6WWOIs", "69AIF--tUpk", "6VYtImsCQ44", "9JEmsSItdt4",
  "9XdBltWIe-4", "APSkB4hP73M", "Ay4fmZdZqJE", "BNfIPVjQwEA", "C6eXTvqdaro",
  "CptjZq0RaZQ", "D80KULtCbHw", "DDmZBhA-C9M", "Eq6ATHhBezw", "F9DwcURdhgQ",
  "FJFJP6EvsaQ", "FXF-nD4U5zk", "I9unIJnobQU", "Jvkt5UhmxHw", "KMbFjoHUYbA",
  "KhFlD54nQrY", "LbLLWmmL3YE", "MlD2h0BP0Jc", "NgR8fPR3vuQ", "O1sPR-UlYuo",
  "OFC8eddNCVs", "Od9OG4MGDWA", "P9iWPk7IW-M", "QHorzBmHl7g", "ROf4oNqGEUc",
  "S-6CFpiZLVM", "TLPHmHPaCiQ", "TY9dnrbQano", "UM9axnjB4Y4", "W6xjV7lejk8",
  "WEBT1shPyok", "XBcMiYK7qYY", "XjV4HYZTJB8", "YFA8AS5Cu2w", "YG9_MtPOp8w",
  "ZTMregh_428", "ZYdCnwI4IkA", "ZudTPpJCbbA", "_OmpRDWRT9U", "aFoMYz_jWcs",
  "aQNgelm7JeE", "ab8bgVo45_c", "b2_M-1YqnNI", "bq96s64K2YM", "dVnY0NF4wVo",
  "e-QmGJU1XYc", "eJyz7CRWWW0", "en-ClrgaV8U", "fmt5v-9mB5Y", "fxqcwK5OMag",
  "hASHO5ap1Sw", "hCSHuvDejGA", "i5OZQQWj5-I", "iyUR6PANjJk", "jw_CWHs2YDU",
  "k_kSCjdf8D0", "kv2JjhPVZeU", "lFFZhAIrvcc", "lRQuyCfSmeI", "lSWDYzC0BvA",
  "m00WzTsohlA", "m4WOwgUMQuc", "mqFbO8pE7qc", "oRMG_HpOAN4", "rf_EQvubKlk",
  "sargwkHeMVU", "tW13N4Hll88", "uVPoq1Svz7g", "uVzCPllwmqw", "xSw4eSjR2jY",
  "xfOT2elC2Ok", "y27B-sKIUHA"
];

const OUTPUT_DIR = './transcripts';
const DELAY_MS = 1500; // Delay between requests to avoid rate limiting

async function fetchTranscript(videoId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) return null;
    return segments.map(s => ({
      text: s.text,
      offset: s.offset,    // ms
      duration: s.duration  // ms
    }));
  } catch (err) {
    return { error: err.message };
  }
}

function formatTranscriptText(segments) {
  return segments.map(s => s.text).join(' ')
    .replace(/\s+/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function formatTranscriptTimestamped(segments) {
  return segments.map(s => {
    const sec = Math.floor((s.offset || 0) / 1000);
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    const ts = `${String(min).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    return `[${ts}] ${s.text}`;
  }).join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const uploadTarget = args.includes('--upload') ? args[args.indexOf('--upload') + 1] : null;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`VideoForge Transcript Fetcher (LOCAL)`);
  console.log(`Processing ${VIDEO_IDS.length} videos`);
  console.log(`Output: ${path.resolve(OUTPUT_DIR)}`);
  console.log(`${'='.repeat(60)}\n`);

  const results = { ok: 0, error: 0, noTranscript: 0 };

  for (let i = 0; i < VIDEO_IDS.length; i++) {
    const videoId = VIDEO_IDS[i];
    const videoDir = path.join(OUTPUT_DIR, videoId);

    // Skip if already fetched
    if (fs.existsSync(path.join(videoDir, 'transcript.txt'))) {
      console.log(`  [${i + 1}/${VIDEO_IDS.length}] CACHED — ${videoId}`);
      results.ok++;
      continue;
    }

    console.log(`  [${i + 1}/${VIDEO_IDS.length}] FETCHING — ${videoId}...`);

    const data = await fetchTranscript(videoId);

    if (!data) {
      console.log(`  [${i + 1}/${VIDEO_IDS.length}] NO TRANSCRIPT — ${videoId}`);
      results.noTranscript++;
      continue;
    }

    if (data.error) {
      console.log(`  [${i + 1}/${VIDEO_IDS.length}] ERROR — ${videoId}: ${data.error}`);
      results.error++;
      // Small delay even on error
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    // Save transcript files
    fs.mkdirSync(videoDir, { recursive: true });

    // Plain text (for feeding to AI)
    const plainText = formatTranscriptText(data);
    fs.writeFileSync(path.join(videoDir, 'transcript.txt'), plainText);

    // Timestamped version (for reference)
    const timestamped = formatTranscriptTimestamped(data);
    fs.writeFileSync(path.join(videoDir, 'transcript-timestamped.txt'), timestamped);

    // Raw JSON segments (for programmatic use)
    fs.writeFileSync(path.join(videoDir, 'transcript.json'), JSON.stringify(data, null, 2));

    const wordCount = plainText.split(/\s+/).length;
    console.log(`  [${i + 1}/${VIDEO_IDS.length}] OK — ${videoId} (${wordCount} words)`);
    results.ok++;

    // Rate limit delay
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE: ${results.ok} transcripts, ${results.error} errors, ${results.noTranscript} unavailable`);
  console.log(`Files saved to: ${path.resolve(OUTPUT_DIR)}/`);
  console.log(`${'='.repeat(60)}\n`);

  // Upload if requested
  if (uploadTarget) {
    console.log(`Uploading to ${uploadTarget}...`);
    try {
      // First, copy transcripts into the video-library folder structure on the server
      const cmd = `scp -r ${OUTPUT_DIR}/* ${uploadTarget}:/opt/videoforge/video-library-transcripts/`;
      console.log(`Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
      console.log('Upload complete!');
      console.log('Now run on the server: node /opt/videoforge/scripts/merge-transcripts.mjs');
    } catch (err) {
      console.error('Upload failed:', err.message);
      console.log(`\nManual upload:\n  scp -r ${OUTPUT_DIR}/* ${uploadTarget}:/opt/videoforge/video-library-transcripts/`);
    }
  } else {
    console.log(`To upload to your server:`);
    console.log(`  scp -r ${OUTPUT_DIR}/* YOUR_SERVER:/opt/videoforge/video-library-transcripts/`);
    console.log(`Then run on the server:`);
    console.log(`  node /opt/videoforge/scripts/merge-transcripts.mjs`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
