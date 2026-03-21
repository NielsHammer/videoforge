import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "FAILED", subtext: "The Roman Republic — 509 BC to 27 BC", color: "red|green|accent|gold" }
export const StampReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.text) return null;

  const text = (data.text || "").toUpperCase();
  const subtext = data.subtext || "";
  const colorMap = { red: "#ef4444", green: "#22c55e", accent, gold: "#f59e0b", white: "white" };
  const color = colorMap[data.color] || "#ef4444";

  // Stamp: scale from 3 to 1 with a hard bounce, like a real stamp
  const scale = interpolate(clipFrame, [0, fps * 0.1, fps * 0.18, fps * 0.28], [3, 0.9, 1.05, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(clipFrame, [0, fps * 0.05], [0, 1], { extrapolateRight: "clamp" });
  // Impact ripple ring
  const ringScale = interpolate(clipFrame, [fps * 0.1, fps * 0.5], [1, 2.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringOp = interpolate(clipFrame, [fps * 0.1, fps * 0.5], [0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtextOp = interpolate(clipFrame, [fps * 0.4, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = text.length > 12 ? 60 : text.length > 8 ? 80 : text.length > 5 ? 100 : 120;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Impact ring */}
        <div style={{ position: "absolute", inset: -40, border: `4px solid ${color}`, borderRadius: 12, transform: `scale(${ringScale})`, opacity: ringOp }} />
        {/* Stamp text */}
        <div style={{ transform: `scale(${scale})`, opacity, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color, textTransform: "uppercase", letterSpacing: 8, textAlign: "center", lineHeight: 1, border: `6px solid ${color}`, padding: "16px 32px", borderRadius: 8, opacity: 0.9, textShadow: `0 0 30px ${color}60`, boxShadow: `0 0 40px ${color}30, inset 0 0 20px ${color}10` }}>
            {text}
          </div>
        </div>
      </div>
      {subtext && (
        <div style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", textAlign: "center", opacity: subtextOp, marginTop: 28, padding: "0 80px", lineHeight: 1.4 }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

// ChapterBreak — Elegant cinematic section divider. Black with thin accent line.
// FULL SCREEN. Used between major chapters/sections. Lasts 2-3 seconds.
// data: { chapter: "Chapter Two", title: "THE CRACKS NOBODY SAW" }
