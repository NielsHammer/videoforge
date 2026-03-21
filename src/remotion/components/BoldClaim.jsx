import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "Rome didn't fall. It murdered itself.", accent_word: "murdered" }
export const BoldClaim = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.text) return null;

  const text = data.text;
  const accentWord = data.accent_word || "";

  const op = interpolate(clipFrame, [0, fps * 0.25, fps * 1.8, fps * 2.2], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const scale = interpolate(clipFrame, [0, fps * 0.25], [0.92, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const fontSize = text.length > 80 ? 28 : text.length > 55 ? 36 : text.length > 35 ? 44 : 56;

  // Split text to highlight accent_word
  const renderText = () => {
    if (!accentWord) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${accentWord})`, "i"));
    return parts.map((part, i) =>
      part.toLowerCase() === accentWord.toLowerCase()
        ? <span key={i} style={{ color: accent, textShadow: `0 0 30px ${accent}80` }}>{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textAlign: "center", lineHeight: 1.35, opacity: op, transform: `scale(${scale})`, textShadow: "0 2px 20px rgba(0,0,0,0.6)", letterSpacing: 1 }}>
        {renderText()}
      </div>
    </div>
  );
};

// UnderlineSlam — Text slams in, then a thick underline draws underneath it
// CENTERED. One punchy phrase with visual emphasis on the underline.
// data: { text: "400% MORE SPENDING", subtext: "in just 20 years", underlineColor: "accent|red|green" }
