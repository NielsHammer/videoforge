import React from "react";
import { AbsoluteFill, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const TextFlash = ({ text, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme).textFlash;
  if (!text) return null;

  const words = text.split(" ");

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        fontSize: 95, fontWeight: 900, fontStyle: "italic",
        fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        textTransform: "uppercase", textAlign: "center",
        lineHeight: 1.1, letterSpacing: -2, maxWidth: 1400, padding: "0 80px",
      }}>
        {words.map((word, i) => {
          const delay = i * fps * 0.035;
          const op = interpolate(clipFrame, [delay, delay + fps * 0.06], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const s = interpolate(clipFrame, [delay, delay + fps * 0.05, delay + fps * 0.1], [0.5, 1.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(clipFrame, [delay, delay + fps * 0.08], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <span key={i} style={{
              display: "inline-block", marginRight: 18,
              opacity: op, transform: `scale(${s}) translateY(${y}px)`,
              color: th.color,
              textShadow: `0 4px 40px rgba(0,0,0,0.9), 0 0 60px ${th.shadowColor}`,
            }}>{word}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
