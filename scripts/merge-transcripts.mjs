#!/usr/bin/env node
/**
 * Merge uploaded transcripts into the video-library folder structure.
 *
 * Run this on the server after uploading transcripts:
 *   node /opt/videoforge/scripts/merge-transcripts.mjs
 *
 * Expects transcripts in: /opt/videoforge/video-library-transcripts/{videoId}/
 * Merges into:            /opt/videoforge/video-library/{videoId}/
 * Also updates metadata.json with hasTranscript + word count.
 */

import fs from 'fs';
import path from 'path';

const TRANSCRIPTS_DIR = '/opt/videoforge/video-library-transcripts';
const LIBRARY_DIR = '/opt/videoforge/video-library';

function main() {
  if (!fs.existsSync(TRANSCRIPTS_DIR)) {
    console.error(`No transcripts directory found at ${TRANSCRIPTS_DIR}`);
    console.error('Upload transcripts first: scp -r transcripts/* server:/opt/videoforge/video-library-transcripts/');
    process.exit(1);
  }

  const dirs = fs.readdirSync(TRANSCRIPTS_DIR).filter(d =>
    fs.statSync(path.join(TRANSCRIPTS_DIR, d)).isDirectory()
  );

  console.log(`\nMerging ${dirs.length} transcripts into video library...\n`);

  let merged = 0, skipped = 0, errors = 0;

  for (const videoId of dirs) {
    const srcDir = path.join(TRANSCRIPTS_DIR, videoId);
    const destDir = path.join(LIBRARY_DIR, videoId);

    if (!fs.existsSync(destDir)) {
      console.log(`  SKIP — ${videoId} (no video-library entry)`);
      skipped++;
      continue;
    }

    const srcTxt = path.join(srcDir, 'transcript.txt');
    if (!fs.existsSync(srcTxt)) {
      console.log(`  SKIP — ${videoId} (no transcript.txt)`);
      skipped++;
      continue;
    }

    try {
      // Copy all transcript files
      for (const file of ['transcript.txt', 'transcript-timestamped.txt', 'transcript.json']) {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      // Update metadata.json
      const metaPath = path.join(destDir, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const transcript = fs.readFileSync(path.join(destDir, 'transcript.txt'), 'utf-8');
        meta.hasTranscript = true;
        meta.transcriptWordCount = transcript.split(/\s+/).length;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      }

      const wordCount = fs.readFileSync(srcTxt, 'utf-8').split(/\s+/).length;
      console.log(`  OK — ${videoId} (${wordCount} words)`);
      merged++;
    } catch (err) {
      console.log(`  ERROR — ${videoId}: ${err.message}`);
      errors++;
    }
  }

  // Update index.json
  const indexPath = path.join(LIBRARY_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    for (const videoId of dirs) {
      if (index[videoId] && fs.existsSync(path.join(LIBRARY_DIR, videoId, 'transcript.txt'))) {
        index[videoId].hasTranscript = true;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`DONE: ${merged} merged, ${skipped} skipped, ${errors} errors`);
  console.log(`${'='.repeat(50)}\n`);
}

main();
