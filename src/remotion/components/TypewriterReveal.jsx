import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

export const TypewriterReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.text) return null;
  const text = data.text;
  const subtitle = data.subtitle || "";
  const speed = data.speed || 1;
  const charsToShow = Math.floor(clipFrame * (text.length / (fps * 2 / speed)));
  const displayed = text.slice(0, Math.min(charsToShow, text.length));
  const showCursor = charsToShow <= text.length;
  const subtitleOp = interpolate(clipFrame, [fps * 2.2, fps * 2.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
      <div style={{ fontSize: 68, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 4, textAlign: "center", lineHeight: 1.2, textShadow: `0 0 40px ${accent}40` }}>
        {displayed}
        {showCursor && <span style={{ opacity: Math.floor(clipFrame / 8) % 2 === 0 ? 1 : 0, color: accent }}>|</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: 24, fontWeight: 600, color: `rgba(255,255,255,0.7)`, marginTop: 20, letterSpacing: 3, textTransform: "uppercase", opacity: subtitleOp, fontFamily: "Arial, sans-serif" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
