import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { words: ["The", "die", "is", "cast"], emphasis: [3] (indices to highlight in accent color) }
export const WordByWord = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.words?.length) return null;

  const words = data.words.slice(0, 12);
  const emphasis = new Set(data.emphasis || []);
  const framesPerWord = fps * 0.35;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", justifyContent: "center", alignItems: "center" }}>
        {words.map((word, i) => {
          const wordStart = i * framesPerWord;
          const op = interpolate(clipFrame, [wordStart, wordStart + fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(clipFrame, [wordStart, wordStart + fps * 0.2], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const isEmphasis = emphasis.has(i);
          const fontSize = words.length > 8 ? 52 : words.length > 5 ? 64 : 80;
          return (
            <span key={i} style={{ display: "inline-block", fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: isEmphasis ? accent : "white", textTransform: "uppercase", letterSpacing: 2, opacity: op, transform: `translateY(${y}px)`, textShadow: isEmphasis ? `0 0 30px ${accent}80` : "0 2px 20px rgba(0,0,0,0.5)" }}>
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// BoldClaim — Full-screen single bold sentence. Slams in, holds 2s, fades out.
// CENTERED. Maximum visual impact. For the most important line in the video.
// data: { text: "Rome didn't fall. It murdered itself.", accent_word: "murdered" }
