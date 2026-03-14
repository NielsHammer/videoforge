import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const WordScatter = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.words) return null;
  const words = data.words.slice(0, 8);
  const centerWord = data.centerWord || "";

  // Each word flies in from a random-but-seeded position
  const wordConfigs = words.map((word, i) => {
    const seed = i * 137.5;
    const angle = (seed % 360) * (Math.PI / 180);
    const dist = 400 + (i * 60) % 200;
    const startX = Math.cos(angle) * dist;
    const startY = Math.sin(angle) * dist;
    const delay = i * fps * 0.08;
    return { word, startX, startY, delay, i };
  });

  const centerOp = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const centerScale = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {wordConfigs.map(({ word, startX, startY, delay, i }) => {
        const progress = interpolate(clipFrame, [delay, delay + fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const x = startX * (1 - progress);
        const y = startY * (1 - progress);
        const opacity = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const fontSize = 20 + (i % 3) * 12;
        const colors = ["rgba(255,255,255,0.6)", "rgba(255,255,255,0.4)", accent + "cc"];
        return (
          <div key={i} style={{
            position: "absolute",
            fontSize, fontWeight: 700,
            fontFamily: "Arial Black, Arial, sans-serif",
            color: colors[i % colors.length],
            textTransform: "uppercase",
            letterSpacing: 2,
            transform: `translate(${x}px, ${y}px)`,
            opacity,
            whiteSpace: "nowrap",
          }}>
            {word}
          </div>
        );
      })}
      {centerWord && (
        <div style={{
          fontSize: 72, fontWeight: 900,
          fontFamily: "Arial Black, Arial, sans-serif",
          color: "white", textTransform: "uppercase",
          letterSpacing: 4, textAlign: "center",
          opacity: centerOp,
          transform: `scale(${centerScale})`,
          textShadow: `0 0 60px ${accent}80`,
          zIndex: 10,
        }}>
          {centerWord}
        </div>
      )}
    </div>
  );
};
