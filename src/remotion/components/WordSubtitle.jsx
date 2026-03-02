import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * Determines if a word should be highlighted in the accent color.
 * Checks the UPPERCASED display text against patterns.
 */
function shouldHighlight(word) {
  const clean = word.replace(/[.,!?;:'"]/g, "").trim();
  if (!clean) return false;

  // Pure numbers
  if (/^\$?\d[\d,.]*[%kKmMbBtT]?$/.test(clean)) return true;

  // Number words (including hyphenated like NINETY-FIVE)
  const numberWords = /^(ZERO|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|THIRTY|FORTY|FIFTY|SIXTY|SEVENTY|EIGHTY|NINETY|HUNDRED|THOUSAND|MILLION|BILLION|TRILLION|FIRST|SECOND|THIRD|FOURTH|FIFTH)$/;
  // Split hyphenated words and check each part
  const parts = clean.split("-");
  if (parts.some(p => numberWords.test(p))) return true;

  // Impact/buzz words
  const buzzwords = /^(NEVER|ALWAYS|EVERY|NOBODY|EVERYONE|EVERYTHING|NOTHING|IMPOSSIBLE|GUARANTEED|PROVEN|SECRET|CRITICAL|DANGEROUS|DEADLY|MASSIVE|INSANE|INCREDIBLE|SHOCKING|SURPRISING|EXACTLY|TRIPLE|DOUBLE|HALF|PERCENT|WORST|BEST|MOST|LEAST|FASTEST|SLOWEST|BIGGEST|SMALLEST|HIGHEST|LOWEST|STRONGEST|KILLS|DESTROYS|ELIMINATES|SKYROCKETS|PLUMMETS|EXPLODES|CRASHES|TOXIC|ESSENTIAL|CRUCIAL|ULTIMATE|PERMANENT|INSTANT|DRAMATIC|EXTREME)$/;
  if (buzzwords.test(clean)) return true;

  // Units and measurements
  if (/^(TEASPOONS?|GRAMS?|POUNDS?|CALORIES?|PERCENT|HOURS?|DAYS?|WEEKS?|MONTHS?|YEARS?|MINUTES?|SECONDS?|DOLLARS?|BPM|MG|KG|ML)$/.test(clean)) return true;

  return false;
}

export const WordSubtitle = ({ words, clipStartTime, position = "bottom", theme = "blue_grid" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accentColor = th.accent || "#44ddee";

  if (!words || words.length === 0) return null;

  const currentTime = clipStartTime + frame / fps;
  const groups = groupWords(words);

  let activeGroup = null;
  for (let i = groups.length - 1; i >= 0; i--) {
    if (currentTime >= groups[i].start - 0.05 && currentTime <= groups[i].end + 0.3) {
      activeGroup = groups[i];
      break;
    }
  }
  if (!activeGroup) return null;

  const groupElapsed = currentTime - activeGroup.start;
  const boxOp = interpolate(groupElapsed * fps, [0, fps * 0.04], [0, 1], { extrapolateRight: "clamp" });

  const isSplitRight = position === "split_right";
  const isSplitLeft = position === "split_left";
  const isSplit = isSplitRight || isSplitLeft;

  const text = activeGroup.words.map(w => w.word).join(" ").toUpperCase();
  const maxChars = isSplit ? 26 : 38;
  const lines = splitTwoLines(text, maxChars);

  // Typewriter
  const typeProgress = Math.min(1, groupElapsed / Math.min((activeGroup.end - activeGroup.start) * 0.6, 0.8));
  const visibleChars = Math.ceil(text.length * typeProgress);

  // Container
  let containerStyle;
  if (isSplitRight) {
    containerStyle = { position: "absolute", top: 0, bottom: 0, right: 0, width: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px", zIndex: 50, opacity: boxOp };
  } else if (isSplitLeft) {
    containerStyle = { position: "absolute", top: 0, bottom: 0, left: 0, width: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 40px", zIndex: 50, opacity: boxOp };
  } else {
    containerStyle = { position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 50, opacity: boxOp };
  }

  const boxStyle = isSplit
    ? { width: "100%", maxWidth: 800, minHeight: 80, background: "rgba(0,0,0,0.72)", border: `1px solid ${accentColor}18`, borderRadius: 18, padding: "22px 32px", backdropFilter: "blur(12px)", boxShadow: "0 8px 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }
    : { width: 920, maxWidth: "90vw", minHeight: 90, background: "rgba(0,0,0,0.75)", border: `1px solid ${accentColor}15`, borderRadius: 14, padding: "14px 36px", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" };

  const fontSize = isSplit ? 34 : 38;

  const renderLine = (line, lineIdx, prevLen) => {
    const lineVisible = Math.max(0, Math.min(visibleChars - prevLen, line.length));
    if (lineVisible <= 0) return <div key={lineIdx} style={{ minHeight: fontSize * 1.3 }}>{"\u00A0"}</div>;

    const visibleText = line.slice(0, lineVisible);
    const lineWords = visibleText.split(/(\s+)/);

    return (
      <div key={lineIdx} style={{
        fontSize, fontWeight: 900,
        fontFamily: "'Arial Black', Arial, sans-serif",
        lineHeight: 1.3, textTransform: "uppercase", letterSpacing: 0.5,
        textAlign: "center", minHeight: fontSize * 1.3,
        wordBreak: "break-word", overflowWrap: "break-word", maxWidth: "100%",
        WebkitFontSmoothing: "antialiased",
      }}>
        {lineWords.map((segment, si) => {
          if (/^\s+$/.test(segment)) return <span key={si}> </span>;
          const isHL = shouldHighlight(segment);
          return (
            <span key={si} style={{
              color: isHL ? accentColor : "#ffffff",
              textShadow: isHL
                ? `0 0 12px ${accentColor}88, 0 0 30px ${accentColor}44, 0 2px 4px rgba(0,0,0,0.9)`
                : "0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)",
            }}>
              {segment}
            </span>
          );
        })}
      </div>
    );
  };

  let charOffset = 0;
  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        {lines.map((line, idx) => {
          const prevLen = charOffset;
          charOffset += line.length;
          return renderLine(line, idx, prevLen);
        })}
      </div>
    </div>
  );
};

/**
 * Group words into subtitle display phrases.
 * MINIMUM 4 WORDS per group to prevent tiny boxes.
 * Break at sentence-ending punctuation or natural phrase boundaries.
 */
function groupWords(words) {
  const groups = [];
  let current = [];

  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const w = words[i].word;
    const isPunc = /[.!?;]$/.test(w);
    const isComma = /[,:]$/.test(w);
    const nextExists = i < words.length - 1;
    const atEnd = !nextExists;
    const nextWord = nextExists ? words[i + 1].word.toLowerCase() : "";

    // MINIMUM 4 words — never break before this unless at end of all words
    if (current.length < 4 && !atEnd) continue;

    // Don't break at period if next word is a continuation word (mid-sentence period)
    const continueWords = /^(but|and|or|so|yet|nor|because|since|while|although|however|then|that|which|where|when|who|what|how|if)$/;
    const isPuncBreak = isPunc && !continueWords.test(nextWord);

    const shouldBreak = atEnd || current.length >= 6 ||
      (isPuncBreak && current.length >= 4) ||
      (isComma && current.length >= 5) ||
      (current.length >= 5 && nextExists && /^(and|but|or|so|if|when|that|which|because|while|then|now|here|this|your|the)$/i.test(nextWord));

    if (shouldBreak) {
      groups.push({
        text: current.map(w => w.word).join(" "),
        words: [...current],
        start: current[0].start,
        end: current[current.length - 1].end,
      });
      current = [];
    }
  }

  // Merge leftovers into previous group
  if (current.length > 0) {
    if (current.length < 4 && groups.length > 0) {
      const last = groups[groups.length - 1];
      last.words = [...last.words, ...current];
      last.text = last.words.map(w => w.word).join(" ");
      last.end = current[current.length - 1].end;
    } else {
      groups.push({
        text: current.map(w => w.word).join(" "),
        words: [...current],
        start: current[0].start,
        end: current[current.length - 1].end,
      });
    }
  }

  return groups;
}

function splitTwoLines(text, maxLineLen = 38) {
  if (!text) return [""];
  if (text.length <= maxLineLen) return [text];
  const words = text.split(/\s+/);
  if (words.length <= 3) return [text];
  const mid = text.length / 2;
  let bestSplit = 0, bestDiff = Infinity, pos = 0;
  const noBreak = new Set(["A","AN","THE","OF","IN","ON","AT","TO","FOR","IS","IF","BY","OR","AND","BUT","YOUR","MY","THEIR"]);
  for (let i = 0; i < words.length - 1; i++) {
    pos += words[i].length + 1;
    const diff = Math.abs(pos - mid);
    const penalty = noBreak.has(words[i + 1]) ? 8 : 0;
    if (diff + penalty < bestDiff) { bestDiff = diff + penalty; bestSplit = i + 1; }
  }
  return [words.slice(0, bestSplit).join(" "), words.slice(bestSplit).join(" ")];
}
