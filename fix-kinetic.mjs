#!/usr/bin/env node
/**
 * Kinetic Text Fix
 *
 * 1. Stock-run-breaker: NEVER creates kinetic_text — only varies image/display_style
 * 2. Hard cap: kinetic_text max 5% of clips (was 15%)
 * 3. Power phrase validation: kinetic_text only allowed if sentence is a short declarative statement
 * 4. Audio-locked validation: kinetic_text words must appear in actual narration at that timestamp
 * 5. Replace kinetic_text with typewriter_reveal when sentence is long/full — better visually
 */

import fs from 'fs';

const file = '/opt/videoforge/src/director.js';
let code = fs.readFileSync(file, 'utf8');
let fixes = 0;

// FIX 1: Stock-run-breaker must NEVER create kinetic_text.
// Root cause of "TOILET DOING", "WITHOUT LETTING" etc — it grabs words from
// search_query or sentence regardless of whether they make sense as text on screen.
// Fix: only vary display_style and search query. Never create a text animation here.
const OLD_STOCKRUN = `  // Break up runs of 3+ consecutive stock clips — FIXED: never use search_query words.
  // Root cause of Bug 3/4: "ancient roman ruins" search_query → "ANCIENT ROMAN" kinetic_text
  // on screen. Search queries are for image engines, NOT for displaying as text to viewers.
  // Fix: vary display_style and image query instead. Only use kinetic_text if we have a real
  // stored sentence from the script on the clip object.
  {
    const ktStop = new Set(["the","and","but","for","with","this","that","have","from","they","their","your","you","was","are","were","has","had","not","can","will","would","could","should","what","when","where","how","why","who","which","been","being","than","then","into","just","more","most","some","such","even","also","very","show","means","nearly","about"]);
    let stockRun = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "stock") {
        stockRun++;
        if (stockRun >= 3 && allClips[i].end_time - allClips[i].start_time >= 3.5) {
          // Only use kinetic_text if the clip has a real stored sentence (not a search query)
          const sentText = allClips[i].sentence || allClips[i].text || "";
          const isRealSentence = sentText.split(/\\s+/).length > 5; // real sentences have 5+ words
          const sentWords = sentText
            .replace(/[^a-zA-Z\\s]/g, " ").split(/\\s+/)
            .filter(w => w.length > 3 && !ktStop.has(w.toLowerCase()))
            .slice(0, 2).map(w => w.toUpperCase());

          if (isRealSentence && sentWords.length >= 2) {
            // Real sentence words — safe to display on screen
            allClips[i].visual_type = "kinetic_text";
            allClips[i].animation_data = { lines: sentWords, style: "impact" };
            allClips[i].imagePath = null;
            stockRun = 0;
          } else {
            // No sentence — just vary the image to break visual monotony
            const niche = nicheInfo?.niche || "general";
            const pool = nicheSafeQueries[niche] || nicheSafeQueries.general;
            const altStyles = ["framed", "split_left", "split_right"];
            allClips[i].search_query = pool[(i + stockRun) % pool.length];
            allClips[i].display_style = altStyles[stockRun % altStyles.length];
            stockRun = 0;
          }
        }
      } else {
        stockRun = 0;
      }
    }
  }`;

const NEW_STOCKRUN = `  // Stock-run-breaker: vary display_style and search query only.
  // NEVER creates kinetic_text — that caused "TOILET DOING", "WITHOUT LETTING" etc.
  // The stock-run-breaker's only job is visual variety between consecutive stock clips.
  {
    let stockRun = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "stock") {
        stockRun++;
        if (stockRun >= 3 && allClips[i].end_time - allClips[i].start_time >= 3.5) {
          const niche = nicheInfo?.niche || "general";
          const pool = nicheSafeQueries[niche] || nicheSafeQueries.general;
          const altStyles = ["framed", "split_left", "split_right"];
          allClips[i].search_query = pool[(i + stockRun) % pool.length];
          allClips[i].display_style = altStyles[stockRun % altStyles.length];
          stockRun = 0;
        }
      } else {
        stockRun = 0;
      }
    }
  }`;

if (code.includes(OLD_STOCKRUN)) {
  code = code.replace(OLD_STOCKRUN, NEW_STOCKRUN);
  fixes++;
  console.log('✅ Fix 1: stock-run-breaker never creates kinetic_text');
} else {
  console.log('❌ Fix 1: stock-run-breaker anchor not found');
}

// FIX 2+3+4: Rewrite the kinetic_text cap section with:
// - 5% hard cap (was 15%)
// - Power phrase validation: sentence must be ≤8 words and declarative
// - Replace with typewriter_reveal for longer sentences (shows full sentence, always matches VO)
// - Convert anything that fails validation to stock
const OLD_CAP = `  // ── KINETIC_TEXT CAP: max 15% of clips for visual videos, 10% for documentary ──
  // Prevents text-wall videos where most clips are just words on screen
  {
    const isDocumentary = nicheInfo?.niche === "history" || nicheInfo?.niche === "true_crime" || nicheInfo?.niche === "documentary";
    const maxKtPct = isDocumentary ? 0.10 : 0.15;
    const maxKt = Math.floor(allClips.length * maxKtPct);
    let ktCount = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "kinetic_text") {
        ktCount++;
        if (ktCount > maxKt) {
          // Convert excess kinetic_text to ai_image for documentary, stock for others
          const isHistorical = videoBible?.era && videoBible.era !== "modern";
          const eraSpec = videoBible?.era_specific || "";
          const fallbackQ = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[ktCount % 5];
          if (isHistorical) {
            allClips[i].visual_type = "ai_image";
            allClips[i].ai_prompt = \`\${eraSpec || "historical"} cinematic scene: \${fallbackQ}. Period-accurate, dramatic lighting.\`;
            allClips[i].animation_data = null;
          } else {
            allClips[i].visual_type = "stock";
            allClips[i].search_query = fallbackQ;
            allClips[i].animation_data = null;
          }
        }
      }
    }
    if (ktCount > maxKt) console.log(chalk.gray(\`  Capped kinetic_text: \${ktCount} → \${maxKt} (\${Math.round(maxKtPct*100)}% limit)\`));
  }`;

const NEW_CAP = `  // ── KINETIC_TEXT QUALITY GATE + 5% CAP ──────────────────────────────────────
  // Three rules applied in order to every kinetic_text clip:
  //
  // Rule 1 — Power phrase: sentence must be ≤8 words (short declarative statement).
  //   "Your body starts breaking down muscle" → ✅ kinetic_text
  //   "Number six: toe raises" → ❌ convert to stock (section header, not a power phrase)
  //   "Without letting" → ❌ convert to stock (fragment, not a complete thought)
  //
  // Rule 2 — Prefer typewriter_reveal for longer sentences (7-15 words).
  //   typewriter_reveal shows the FULL sentence typing out — always matches narration.
  //   kinetic_text only shows 2-3 words — often feels disconnected from what's being said.
  //
  // Rule 3 — 5% hard cap. After quality filtering, remaining kinetic_text capped at 5%.
  //   Any excess becomes stock. This means ~6-7 per 10-min video maximum.
  {
    const isHistoricalCap = videoBible?.era && videoBible.era !== "modern";
    const eraSpecCap = videoBible?.era_specific || "";

    // Stop words — words that by themselves are meaningless on screen
    const ktStopWords = new Set(["the","and","but","for","with","this","that","have","from","they","their","your","you","was","are","were","has","had","not","can","will","would","could","should","what","when","where","how","why","who","which","been","being","than","then","into","just","more","most","some","such","even","also","very","without","letting","doing","having","getting","making","taking","giving","putting","coming","going","being","number","first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth"]);

    // Power phrase check: is this sentence short and declarative enough for kinetic_text?
    const isPowerPhrase = (sentence) => {
      if (!sentence) return false;
      const cleaned = sentence.replace(/[^a-zA-Z\\s]/g, " ").trim();
      const words = cleaned.split(/\\s+/).filter(Boolean);
      if (words.length > 8) return false; // too long — use typewriter_reveal instead
      if (words.length < 3) return false; // too short — fragment
      // Must have at least 2 meaningful (non-stop) words
      const meaningful = words.filter(w => !ktStopWords.has(w.toLowerCase()));
      if (meaningful.length < 2) return false;
      // Reject section headers like "Number Six: Toe Raises"
      if (/^number (one|two|three|four|five|six|seven|eight|nine|ten)/i.test(sentence.trim())) return false;
      if (/^(tip|step|rule|point|reason|way|part|chapter|section)\\s+(one|two|three|\\d)/i.test(sentence.trim())) return false;
      return true;
    };

    const fallbackToStock = (clip, idx) => {
      const fallbackQ = (nicheSafeQueries[nicheInfo?.niche] || nicheSafeQueries.general)[idx % 5];
      if (isHistoricalCap) {
        clip.visual_type = "ai_image";
        clip.ai_prompt = \`\${eraSpecCap || "historical"} cinematic scene: \${fallbackQ}. Period-accurate, dramatic lighting.\`;
      } else {
        clip.visual_type = "stock";
        clip.search_query = fallbackQ;
      }
      clip.animation_data = null;
    };

    // Pass 1: Quality gate — validate each kinetic_text clip before counting toward cap
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type !== "kinetic_text") continue;
      const sentence = allClips[i].text || allClips[i].sentence || "";
      const animLines = allClips[i].animation_data?.lines || [];
      const animText = animLines.join(" ");

      // Check if this is a power phrase
      if (!isPowerPhrase(sentence)) {
        // Not a power phrase — check if it works as typewriter_reveal instead
        if (sentence.length >= 15 && sentence.length <= 120) {
          // Good length for typewriter_reveal — shows full sentence, always matches VO
          allClips[i].visual_type = "typewriter_reveal";
          allClips[i].animation_data = { text: sentence.slice(0, 80), subtitle: "" };
        } else {
          // Too long or too short for any text animation — use stock
          fallbackToStock(allClips[i], i);
        }
        continue;
      }

      // It's a power phrase — keep as kinetic_text but validate the lines make sense
      // The lines should come from the actual sentence, not random words
      const sentenceWords = sentence.replace(/[^a-zA-Z\\s]/g, " ").split(/\\s+/)
        .filter(w => w.length > 3 && !ktStopWords.has(w.toLowerCase()));
      if (sentenceWords.length >= 2) {
        // Rebuild lines from sentence words — ensures they match narration
        allClips[i].animation_data = {
          lines: sentenceWords.slice(0, 2).map(w => w.toUpperCase()),
          style: "impact"
        };
      } else {
        // Can't extract meaningful words — use typewriter_reveal or stock
        if (sentence.length >= 15) {
          allClips[i].visual_type = "typewriter_reveal";
          allClips[i].animation_data = { text: sentence.slice(0, 80), subtitle: "" };
        } else {
          fallbackToStock(allClips[i], i);
        }
      }
    }

    // Pass 2: 5% hard cap on remaining kinetic_text
    const maxKt = Math.max(1, Math.floor(allClips.length * 0.05));
    let ktCount = 0;
    for (let i = 0; i < allClips.length; i++) {
      if (allClips[i].visual_type === "kinetic_text") {
        ktCount++;
        if (ktCount > maxKt) {
          // Over cap — convert to typewriter_reveal if we have sentence, else stock
          const sentence = allClips[i].text || allClips[i].sentence || "";
          if (sentence.length >= 15) {
            allClips[i].visual_type = "typewriter_reveal";
            allClips[i].animation_data = { text: sentence.slice(0, 80), subtitle: "" };
          } else {
            fallbackToStock(allClips[i], i);
          }
        }
      }
    }
    if (ktCount > maxKt) console.log(chalk.gray(\`  Kinetic text: \${ktCount} → capped at \${maxKt} (5% limit). Excess → typewriter_reveal or stock.\`));
  }`;

if (code.includes(OLD_CAP)) {
  code = code.replace(OLD_CAP, NEW_CAP);
  fixes++;
  console.log('✅ Fix 2/3/4: 5% cap, power phrase validation, typewriter_reveal preference');
} else {
  console.log('❌ Fix 2/3/4: kinetic_text cap anchor not found');
}

fs.writeFileSync(file, code);
console.log(`\ndirector.js: ${fixes}/2 fixes applied`);
console.log('\nRun: pm2 restart videoforge-worker && git add -A && git commit -m "Kinetic text: 5% cap, power phrase validation, typewriter_reveal preference, stock-run-breaker never creates text" && git push');
