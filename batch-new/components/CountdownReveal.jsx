import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { number: 3, title: "The Richest Person in History", context: "With $400B adjusted for inflation" }
export const CountdownReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.number === undefined) return null;

  const number = data.number;
  const title = data.title || "";
  const context = data.context || "";

  const numScale = interpolate(clipFrame, [0, fps * 0.3, fps * 0.45], [2, 0.85, 1], { extrapolateRight: "clamp" });
  const numOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(clipFrame, [fps * 0.35, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [fps * 0.35, fps * 0.7], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const contextOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {/* Big number */}
      <div style={{ transform: `scale(${numScale})`, opacity: numOp }}>
        <div style={{ fontSize: 140, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: accent, lineHeight: 0.9, textShadow: `0 0 60px ${accent}80, 0 0 120px ${accent}30`, letterSpacing: -4 }}>
          #{number}
        </div>
      </div>
      <div style={{ width: lineW, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, margin: "20px 0" }} />
      <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textAlign: "center", opacity: titleOp, transform: `translateY(${titleY}px)`, lineHeight: 1.3, textTransform: "uppercase", letterSpacing: 2 }}>
        {title}
      </div>
      {context && (
        <div style={{ fontSize: 17, fontWeight: 500, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", textAlign: "center", opacity: contextOp, marginTop: 14 }}>
          {context}
        </div>
      )}
    </div>
  );
};

// SportsScoreboard — Two teams, animated scoreboard aesthetic
// data: { team1: "ROME", team2: "CARTHAGE", score1: 3, score2: 1, sport: "Battle", period: "Final" }
