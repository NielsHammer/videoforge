import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { streak: 21, label: "DAY STREAK", unit: "days", color: "accent|green|gold" }
export const HabitChain = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.streak) return null;

  const streak = Math.min(data.streak, 30);
  const label = (data.label || "DAY STREAK").toUpperCase();
  const colorMap = { accent, green: "#22c55e", gold: "#f59e0b", red: "#ef4444" };
  const color = colorMap[data.color] || accent;

  const revealed = Math.floor(interpolate(clipFrame, [fps * 0.2, fps * 1.5], [0, streak], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const numOp = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });

  const cols = Math.min(10, streak);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 5, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: labelOp, marginBottom: 20 }}>
        {label}
      </div>
      {/* Big number */}
      <div style={{ fontSize: 96, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color, opacity: numOp, textShadow: `0 0 40px ${color}60`, lineHeight: 1, marginBottom: 20 }}>
        {streak}
      </div>
      {/* Chain dots */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: cols * 36 }}>
        {Array.from({ length: streak }, (_, i) => {
          const isRevealed = i < revealed;
          const dotDelay = fps * (0.2 + i * (1.3 / streak));
          const dotScale = interpolate(clipFrame, [dotDelay, dotDelay + fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
          return (
            <div key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: isRevealed ? color : "rgba(255,255,255,0.1)", transform: `scale(${dotScale})`, boxShadow: isRevealed ? `0 0 8px ${color}60` : "none" }} />
          );
        })}
      </div>
      {data.unit && (
        <div style={{ fontSize: 13, fontWeight: 600, color: `${color}80`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3, marginTop: 16, opacity: labelOp }}>
          {data.unit} in a row
        </div>
      )}
    </div>
  );
};

// LevelUp — Video game style level up. XP bar fills, rank rises.
// data: { level: 47, rank: "EXPERT", xp: 8400, maxXp: 10000, badge: "⚔️" }
