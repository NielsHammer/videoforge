import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

export const WordSubtitle = ({ words, clipStartTime, position = "bottom", theme = "grid" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = getTheme(theme).subtitle;

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
  const text = activeGroup.text.toUpperCase();
  const typeProgress = Math.min(1, groupElapsed / Math.min((activeGroup.end - activeGroup.start) * 0.6, 0.8));
  const visibleChars = Math.ceil(text.length * typeProgress);
  const lines = splitTwoLines(text);
  const boxOp = interpolate(groupElapsed * fps, [0, fps * 0.04], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", bottom: 40, left: "50%",
      transform: "translateX(-50%)", zIndex: 20, opacity: boxOp,
    }}>
      <div style={{
        width: 880, minHeight: 90,
        background: th.bg,
        border: th.border,
        borderRadius: th.radius,
        padding: "14px 32px",
        backdropFilter: "blur(8px)",
        boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {lines.map((line, lineIdx) => {
          const prevLen = lines.slice(0, lineIdx).join("").length;
          const lineVisible = Math.max(0, Math.min(visibleChars - prevLen, line.length));
          return (
            <div key={lineIdx} style={{
              fontSize: 34, fontWeight: 800,
              fontStyle: th.style,
              fontFamily: th.font,
              color: th.color,
              lineHeight: 1.35, textTransform: "uppercase",
              letterSpacing: -0.3,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              textAlign: "center", minHeight: 46,
            }}>
              {lineVisible > 0 ? line.slice(0, lineVisible) : "\u00A0"}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function groupWords(words) {
  const groups = [];
  let current = [];
  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const w = words[i].word;
    const isPunc = /[.!?;]$/.test(w);
    const isComma = /[,:]$/.test(w);
    const nextExists = i < words.length - 1;
    const shouldBreak = isPunc || (isComma && current.length >= 3) || !nextExists || current.length >= 6 ||
      (current.length >= 4 && nextExists && /^(and|but|or|so|the|a|an|if|when|that|which|because|while|then)$/i.test(words[i + 1]?.word));
    if (shouldBreak && current.length > 0) {
      groups.push({ text: current.map(w => w.word).join(" "), start: current[0].start, end: current[current.length - 1].end });
      current = [];
    }
  }
  if (current.length > 0) groups.push({ text: current.map(w => w.word).join(" "), start: current[0].start, end: current[current.length - 1].end });
  return groups;
}

function splitTwoLines(text) {
  if (!text) return [""];
  if (text.length <= 36) return [text];
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
