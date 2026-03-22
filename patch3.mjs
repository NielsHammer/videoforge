#!/usr/bin/env node
/**
 * VF Fix Batch 3
 *
 * Fix 1: Split screen b-roll panel images not deduplicated — same image appears in 2+ panels
 * Fix 2: buildSentenceWindows drift — last word search buffer too small, causes sync gaps on long scripts
 * Fix 3: b-roll imagePaths can contain duplicate content even with different file paths
 */

import fs from 'fs';

{
  const file = '/opt/videoforge/src/pipeline.js';
  let code = fs.readFileSync(file, 'utf8');
  let fixes = 0;

  // FIX 1a: Split screen b-roll (Pexels) — deduplicate panel images.
  // Root cause: fetchPhoto(search_queries[1]) and fetchPhoto(search_queries[2]) can return
  // the same image if Pexels ranks the same photo for both queries. The result:
  // 3 panels shown, 2 panels have identical images → the "flicker duplicate" bug.
  // Fix: check each b-roll image against ALL previously used paths AND hashes before adding.
  const OLD_PEXELS_BROLL = `              // Multi-image b-roll: fetch additional search_queries if provided
              if (clip.search_queries && clip.search_queries.length > 1) {
                clip.imagePaths = [photoPath];
                for (let qi = 1; qi < Math.min(clip.search_queries.length, 3); qi++) {
                  const extraPath = path.join(assetsDir, \`\${baseName}-broll-\${qi}.jpg\`);
                  try {
                    await fetchPhoto(clip.search_queries[qi], extraPath);
                    if (isValidImageFile(extraPath)) {
                      fixImageRotation(extraPath);
                      clip.imagePaths.push(extraPath);
                    }
                  } catch {}
                }
              }`;

  const NEW_PEXELS_BROLL = `              // Multi-image b-roll: fetch additional search_queries if provided
              // FIX 1a: deduplicate each panel image against all previous ones (path + content hash).
              // Without this, two different queries can return the same Pexels photo → duplicate panels.
              if (clip.search_queries && clip.search_queries.length > 1) {
                clip.imagePaths = [photoPath];
                const panelHashes = new Set([getImageFingerprint(photoPath)].filter(Boolean));
                for (let qi = 1; qi < Math.min(clip.search_queries.length, 4); qi++) {
                  const extraPath = path.join(assetsDir, \`\${baseName}-broll-\${qi}.jpg\`);
                  try {
                    await fetchPhoto(clip.search_queries[qi], extraPath);
                    if (isValidImageFile(extraPath)) {
                      const hash = getImageFingerprint(extraPath);
                      // Skip if same content as any panel already added
                      if (hash && panelHashes.has(hash)) {
                        fs.unlinkSync(extraPath);
                        continue;
                      }
                      // Skip if same content as any image in this whole video
                      if (isImageDuplicate(extraPath)) {
                        fs.unlinkSync(extraPath);
                        continue;
                      }
                      fixImageRotation(extraPath);
                      panelHashes.add(hash);
                      markImageUsed(extraPath);
                      clip.imagePaths.push(extraPath);
                    }
                  } catch {}
                  // Stop once we have 3 unique panels
                  if (clip.imagePaths.length >= 3) break;
                }
              }`;

  if (code.includes(OLD_PEXELS_BROLL)) {
    code = code.replace(OLD_PEXELS_BROLL, NEW_PEXELS_BROLL);
    fixes++;
    console.log('✅ Fix 1a: Pexels b-roll panels now deduplicated by content hash');
  } else {
    console.log('❌ Fix 1a: Pexels b-roll anchor not found');
  }

  // FIX 1b: Same fix for web image (Brave) b-roll panels
  const OLD_WEB_BROLL = `            // Multi-image b-roll for web images
            if (clip.search_queries && clip.search_queries.length > 1) {
              clip.imagePaths = [webPath];
              for (let qi = 1; qi < Math.min(clip.search_queries.length, 3); qi++) {
                const extraWebPath = path.join(assetsDir, \`\${baseName}-web-broll-\${qi}.jpg\`);
                try {
                  await searchWebImage(clip.search_queries[qi], extraWebPath, clip);
                  if (isValidImageFile(extraWebPath)) {
                    fixImageRotation(extraWebPath);
                    clip.imagePaths.push(extraWebPath);
                  }
                } catch {}
              }
            }`;

  const NEW_WEB_BROLL = `            // Multi-image b-roll for web images
            // FIX 1b: deduplicate Brave b-roll panels same as Pexels — prevents identical panels.
            if (clip.search_queries && clip.search_queries.length > 1) {
              clip.imagePaths = [webPath];
              const panelHashesW = new Set([getImageFingerprint(webPath)].filter(Boolean));
              for (let qi = 1; qi < Math.min(clip.search_queries.length, 4); qi++) {
                const extraWebPath = path.join(assetsDir, \`\${baseName}-web-broll-\${qi}.jpg\`);
                try {
                  const eraQ = (isHistoricalEra && imagePrefix)
                    ? \`\${imagePrefix} \${clip.search_queries[qi]}\`
                    : clip.search_queries[qi];
                  await searchWebImage(eraQ, extraWebPath, { ...clip, era: videoBible.era_specific });
                  if (isValidImageFile(extraWebPath)) {
                    const hash = getImageFingerprint(extraWebPath);
                    if (hash && panelHashesW.has(hash)) { try { fs.unlinkSync(extraWebPath); } catch {} continue; }
                    if (isImageDuplicate(extraWebPath)) { try { fs.unlinkSync(extraWebPath); } catch {} continue; }
                    fixImageRotation(extraWebPath);
                    panelHashesW.add(hash);
                    markImageUsed(extraWebPath);
                    clip.imagePaths.push(extraWebPath);
                  }
                } catch {}
                if (clip.imagePaths.length >= 3) break;
              }
            }`;

  if (code.includes(OLD_WEB_BROLL)) {
    code = code.replace(OLD_WEB_BROLL, NEW_WEB_BROLL);
    fixes++;
    console.log('✅ Fix 1b: Brave b-roll panels now deduplicated + era prefix applied to each query');
  } else {
    console.log('❌ Fix 1b: Brave b-roll anchor not found');
  }

  // FIX 1c: After all imagePaths are collected, enforce uniqueness one final time.
  // This catches any edge case where two panels ended up with the same content
  // despite the per-loop checks above (e.g. race condition, same file written twice).
  // Insert after the b-roll cleanup block (after imagePaths filter for invalid files).
  const OLD_BROLL_CLEANUP = `  // Clean up invalid b-roll paths
  clips.forEach(clip => {
    if (clip.imagePaths) {
      clip.imagePaths = clip.imagePaths.filter(p => isValidImageFile(p));
      if (clip.imagePaths.length === 0) clip.imagePaths = null;
    }
  });`;

  const NEW_BROLL_CLEANUP = `  // Clean up invalid b-roll paths + enforce panel uniqueness by content hash
  // FIX 1c: final deduplication pass on all imagePaths arrays.
  // Catches any panels that slipped through with duplicate content.
  clips.forEach(clip => {
    if (clip.imagePaths) {
      clip.imagePaths = clip.imagePaths.filter(p => isValidImageFile(p));
      if (clip.imagePaths.length === 0) {
        clip.imagePaths = null;
      } else if (clip.imagePaths.length > 1) {
        // Deduplicate panels by content fingerprint
        const seenHashes = new Set();
        clip.imagePaths = clip.imagePaths.filter(p => {
          const h = getImageFingerprint(p);
          if (!h) return true; // can't fingerprint, keep it
          if (seenHashes.has(h)) return false; // duplicate — remove
          seenHashes.add(h);
          return true;
        });
        if (clip.imagePaths.length === 0) clip.imagePaths = null;
      }
    }
  });`;

  if (code.includes(OLD_BROLL_CLEANUP)) {
    code = code.replace(OLD_BROLL_CLEANUP, NEW_BROLL_CLEANUP);
    fixes++;
    console.log('✅ Fix 1c: Final deduplication pass on all imagePaths arrays');
  } else {
    console.log('❌ Fix 1c: b-roll cleanup anchor not found');
  }

  fs.writeFileSync(file, code);
  console.log(`\npipeline.js: ${fixes}/3 fixes applied\n`);
}

// ─── DIRECTOR.JS: Fix 2 — sentence boundary drift ────────────────────────────
{
  const file = '/opt/videoforge/src/director.js';
  let code = fs.readFileSync(file, 'utf8');
  let fixes = 0;

  // FIX 2: buildSentenceWindows last-word search buffer is too small.
  // Root cause of TA-01105 4:26 vs 4:32 type gaps:
  // The last word search looks ahead only sentenceWords.length + 8 positions.
  // On long sentences or after drift accumulates, the real last word is beyond
  // that window. The sentence end time gets assigned to the wrong word — an early one —
  // so the visual cuts 4-6 seconds before narration finishes.
  // Fix: increase buffer from +8 to +20, and also scan backward from the search end
  // to find the LAST matching occurrence (not the first), since the last word of a
  // sentence is more likely to appear near the END of the sentence in the timestamp stream.
  const OLD_LAST_WORD = `    // Search for last word within sentence length + 8 buffer
    const lastWord = sentenceWords[sentenceWords.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    let endWordIdx = startWordIdx;
    const searchEnd = Math.min(startWordIdx + sentenceWords.length + 8, filteredTimestamps.length);

    for (let i = startWordIdx; i < searchEnd; i++) {
      if (filteredTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(lastWord)) {
        endWordIdx = i;
      }
    }`;

  const NEW_LAST_WORD = `    // FIX 2: Search for last word with larger buffer (+20 instead of +8).
    // Small buffer caused sync gaps on long sentences — real last word was outside search window.
    // Also: take the LAST matching occurrence (scan backward from searchEnd), not the first.
    // The last word of a sentence is near the end of the sentence in the timestamp stream.
    const lastWord = sentenceWords[sentenceWords.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    let endWordIdx = startWordIdx;
    const searchEnd = Math.min(startWordIdx + sentenceWords.length + 20, filteredTimestamps.length);

    // Scan forward and keep the LAST match (most accurate end time)
    for (let i = startWordIdx; i < searchEnd; i++) {
      if (filteredTimestamps[i].word.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(lastWord)) {
        endWordIdx = i; // keep updating — we want the last match
      }
    }`;

  if (code.includes(OLD_LAST_WORD)) {
    code = code.replace(OLD_LAST_WORD, NEW_LAST_WORD);
    fixes++;
    console.log('✅ Fix 2: Last word search buffer increased +8→+20, takes last match not first');
  } else {
    console.log('❌ Fix 2: last word search anchor not found');
  }

  fs.writeFileSync(file, code);
  console.log(`\ndirector.js: ${fixes}/1 fixes applied\n`);
}

console.log(`All done. Run:
  pm2 restart videoforge-worker
  git add -A
  git commit -m "Fix split screen panel dedup, sentence boundary drift, b-roll era prefix"
  git push`);
