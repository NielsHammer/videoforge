/**
 * Script Enhancer — adds SSML breaks and pacing cues to scripts
 * before sending to ElevenLabs for more human-like voiceovers.
 * 
 * Supports Multilingual v2 model features:
 * - <break time="Xs" /> — natural pauses up to 3s
 * - Em-dashes (—) — slight dramatic pauses
 * - Ellipsis (...) — hesitation/suspense
 * - Punctuation emphasis (! ?) — energy/intonation
 */

import chalk from "chalk";

// ═══════════════════════════════════════════
// BREAK RULES — where to insert pauses
// ═══════════════════════════════════════════

/**
 * Enhance a script with SSML breaks for natural pacing.
 * Does NOT change the actual words — only adds pauses between them.
 * 
 * @param {string} scriptText - Raw script text
 * @param {string} mood - Detected mood (horror, motivational, etc.)
 * @returns {string} Enhanced script with SSML breaks
 */
export function enhanceScript(scriptText, mood = "default") {
  let enhanced = scriptText;

  // Get mood-specific pause durations
  const pauses = getPauseDurations(mood);

  // 1. Add break after the first sentence (intro hook pause)
  enhanced = addIntroBreak(enhanced, pauses.introBreak);

  // 2. Add breaks between paragraphs (double newlines)
  enhanced = addParagraphBreaks(enhanced, pauses.paragraphBreak);

  // 3. Add breaks before numbered items (Number 1, #2, First, etc.)
  enhanced = addNumberedBreaks(enhanced, pauses.numberedBreak);

  // 4. Add breaks before dramatic reveal words
  enhanced = addDramaticBreaks(enhanced, pauses.dramaticBreak, mood);

  // 5. Add breaks after questions (let them land)
  enhanced = addQuestionBreaks(enhanced, pauses.questionBreak);

  // 6. Add a closing pause before the final sentence
  enhanced = addClosingBreak(enhanced, pauses.closingBreak);

  // Count breaks added
  const breakCount = (enhanced.match(/<break/g) || []).length;
  
  // Safety: too many breaks can cause ElevenLabs to speed up or glitch
  // Max ~1 break per 100 characters
  const maxBreaks = Math.floor(scriptText.length / 100);
  if (breakCount > maxBreaks) {
    console.log(chalk.yellow(`⚠️  Too many breaks (${breakCount}), trimming to ${maxBreaks}`));
    enhanced = trimExcessBreaks(enhanced, maxBreaks);
  }

  if (breakCount > 0) {
    console.log(chalk.blue(`✨ Script enhanced: ${breakCount} natural pauses added (${mood} mood)`));
  }

  return enhanced;
}

// ═══════════════════════════════════════════
// MOOD-SPECIFIC PAUSE DURATIONS
// ═══════════════════════════════════════════

function getPauseDurations(mood) {
  const durations = {
    horror: {
      introBreak: "1.5s",
      paragraphBreak: "1.0s",
      numberedBreak: "0.8s",
      dramaticBreak: "1.0s",
      questionBreak: "0.8s",
      closingBreak: "1.5s",
    },
    motivational: {
      introBreak: "1.0s",
      paragraphBreak: "0.7s",
      numberedBreak: "0.6s",
      dramaticBreak: "0.5s",
      questionBreak: "0.6s",
      closingBreak: "1.0s",
    },
    calm: {
      introBreak: "1.2s",
      paragraphBreak: "0.8s",
      numberedBreak: "0.7s",
      dramaticBreak: "0.6s",
      questionBreak: "0.7s",
      closingBreak: "1.2s",
    },
    dramatic: {
      introBreak: "1.5s",
      paragraphBreak: "0.9s",
      numberedBreak: "0.8s",
      dramaticBreak: "1.0s",
      questionBreak: "0.8s",
      closingBreak: "1.5s",
    },
    entertainment: {
      introBreak: "0.8s",
      paragraphBreak: "0.6s",
      numberedBreak: "0.7s",
      dramaticBreak: "0.4s",
      questionBreak: "0.5s",
      closingBreak: "0.8s",
    },
    upbeat: {
      introBreak: "0.6s",
      paragraphBreak: "0.5s",
      numberedBreak: "0.5s",
      dramaticBreak: "0.3s",
      questionBreak: "0.4s",
      closingBreak: "0.6s",
    },
    default: {
      introBreak: "1.0s",
      paragraphBreak: "0.7s",
      numberedBreak: "0.6s",
      dramaticBreak: "0.5s",
      questionBreak: "0.6s",
      closingBreak: "1.0s",
    },
  };

  return durations[mood] || durations.default;
}

// ═══════════════════════════════════════════
// INDIVIDUAL ENHANCEMENT FUNCTIONS
// ═══════════════════════════════════════════

/** Add a pause after the first sentence (let the hook land) */
function addIntroBreak(text, duration) {
  // Find end of first sentence
  const match = text.match(/^([^.!?]+[.!?])/);
  if (match) {
    const firstSentence = match[0];
    return text.replace(firstSentence, `${firstSentence} <break time="${duration}" />`);
  }
  return text;
}

/** Add pauses between paragraphs */
function addParagraphBreaks(text, duration) {
  // Replace double newlines with break + newline
  return text.replace(/\n\n+/g, ` <break time="${duration}" />\n\n`);
}

/** Add pauses before numbered items */
function addNumberedBreaks(text, duration) {
  // Before "Number X", "#X", "First,", "Second,", "Third," etc.
  const pattern = /(?<=[.!?]\s)((?:Number\s+\d|#\d|First[,:]|Second[,:]|Third[,:]|Fourth[,:]|Fifth[,:]|Sixth[,:]|Seventh[,:]|Eighth[,:]|Ninth[,:]|Tenth[,:]|Next[,:]|Finally[,:]))/gi;
  return text.replace(pattern, `<break time="${duration}" /> $1`);
}

/** Add pauses before dramatic reveal words */
function addDramaticBreaks(text, duration, mood) {
  // Different dramatic words per mood
  const dramaticWords = {
    horror: /(?<=[.!?]\s)(But then|Suddenly|No one expected|The truth is|What they found|And then|It was too late|Behind the door|In the darkness)/gi,
    motivational: /(?<=[.!?]\s)(But here's the thing|The truth is|What most people don't realize|And that's when everything changed|Here's what separates|The secret is|But it gets better)/gi,
    dramatic: /(?<=[.!?]\s)(But then|Everything changed|What happened next|No one saw it coming|The truth is|Against all odds)/gi,
    default: /(?<=[.!?]\s)(But here's the thing|The truth is|What most people don't realize|Here's where it gets interesting|And that changed everything|But there's a catch|The real question is)/gi,
  };

  const pattern = dramaticWords[mood] || dramaticWords.default;
  return text.replace(pattern, `<break time="${duration}" /> $1`);
}

/** Add pauses after questions (let them sink in) */
function addQuestionBreaks(text, duration) {
  // After a question mark, before the next sentence starts
  return text.replace(/(\?)\s+(?=[A-Z])/g, `$1 <break time="${duration}" /> `);
}

/** Add a closing pause before the last sentence */
function addClosingBreak(text, duration) {
  // Find the last sentence boundary
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 3) {
    const lastSentence = sentences[sentences.length - 1];
    const lastIndex = text.lastIndexOf(lastSentence);
    if (lastIndex > 0) {
      return text.slice(0, lastIndex) + `<break time="${duration}" /> ` + lastSentence;
    }
  }
  return text;
}

/** Remove excess breaks to prevent ElevenLabs glitching */
function trimExcessBreaks(text, maxBreaks) {
  let count = 0;
  return text.replace(/<break time="[^"]*" \/>/g, (match) => {
    count++;
    return count <= maxBreaks ? match : "";
  });
}

// ═══════════════════════════════════════════
// UTILITY: Preview enhanced script (for debugging)
// ═══════════════════════════════════════════
export function previewEnhancement(scriptText, mood = "default") {
  const enhanced = enhanceScript(scriptText, mood);
  console.log(chalk.gray("\n--- ORIGINAL (first 300 chars) ---"));
  console.log(scriptText.slice(0, 300));
  console.log(chalk.gray("\n--- ENHANCED (first 400 chars) ---"));
  console.log(enhanced.slice(0, 400));
  console.log(chalk.gray("\n--- STATS ---"));
  const breaks = (enhanced.match(/<break/g) || []).length;
  console.log(`Breaks added: ${breaks}`);
  console.log(`Original length: ${scriptText.length} chars`);
  console.log(`Enhanced length: ${enhanced.length} chars`);
  return enhanced;
}
