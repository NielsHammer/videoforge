import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// ThumbsUpReveal: Thumbs up or down with animated reveal and supporting text
// Works for: pros/cons, yes/no, win/fail, recommendations, results
// data: { type: "up" | "down" | "both", items: ["it works", "it's fast"], verdict: "DO THIS" }
export const ThumbsUpReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data) return null;
  const type = data.type || "up";
  const items = data.items || [];
  const verdict = data.verdict || "";

  const isUp = type === "up" || type === "both";
  const isDown = type === "down" || type === "both";
  const isBoth = type === "both";

  const emoji = type === "up" ? "👍" : type === "down" ? "👎" : "⚖️";
  const color = type === "up" ? "#22c55e" : type === "down" ? "#ef4444" : accent;

  const scaleIn = interpolate(clipFrame, [0, fps * 0.5, fps * 0.6], [0, 1.2, 1], { extrapolateRight: "clamp" });
  const opIn = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const verdictOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "40px 80px",
      opacity: opIn,
    }}>
      {/* Big emoji */}
      <div style={{ fontSize: 120, transform: `scale(${scaleIn})`, marginBottom: 24, filter: `drop-shadow(0 0 20px ${color}80)` }}>
        {emoji}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 700 }}>
          {items.map((item, i) => {
            const itemOp = interpolate(clipFrame, [fps * (0.4 + i * 0.2), fps * (0.7 + i * 0.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const itemX = interpolate(clipFrame, [fps * (0.4 + i * 0.2), fps * (0.7 + i * 0.2)], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, opacity: itemOp, transform: `translateX(${itemX}px)` }}>
                <div style={{ fontSize: 28, minWidth: 36 }}>{type === "down" ? "❌" : "✅"}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif" }}>{item}</div>
              </div>
            );
          })}
        </div>
      )}

      {verdict && (
        <div style={{
          marginTop: 28, padding: "12px 40px", borderRadius: 8,
          backgroundColor: `${color}30`, border: `2px solid ${color}`,
          fontSize: 32, fontWeight: 900, color: color, letterSpacing: 3,
          textTransform: "uppercase", fontFamily: "Arial Black, Arial, sans-serif",
          opacity: verdictOp,
        }}>
          {verdict}
        </div>
      )}
    </div>
  );
};
