import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// CountdownTimer — Dramatic countdown number reveal
// data: { from: 5, label: "years until retirement", subtitle: "If you start today", urgent: true }
// USE WHEN: narrator gives a time-sensitive warning, deadline, or urgency moment
export const CountdownTimer = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;

  const from = data.from || 10;
  const label = data.label || "";
  const subtitle = data.subtitle || "";
  const urgent = data.urgent !== false;
  const urgentColor = urgent ? "#ef4444" : accent;

  // Count down from `from` to 0 over the clip duration
  const currentNum = Math.ceil(interpolate(clipFrame, [fps * 0.2, fps * (from * 0.6)], [from, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const numScale = interpolate(clipFrame % fps, [0, fps * 0.15, fps * 0.5], [1.3, 1.0, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const pulse = urgent ? (0.5 + Math.sin(clipFrame * 0.3) * 0.5) : 0.3;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      {/* Ring */}
      <div style={{ width: 220, height: 220, borderRadius: "50%", border: `4px solid ${urgentColor}`, boxShadow: `0 0 60px ${urgentColor}${Math.round(pulse * 80).toString(16).padStart(2,"0")}`, display: "flex", alignItems: "center", justifyContent: "center", background: `${urgentColor}08` }}>
        <div style={{ fontSize: 130, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: urgentColor, lineHeight: 1, transform: `scale(${numScale})`, textShadow: `0 0 40px ${urgentColor}80` }}>
          {currentNum}
        </div>
      </div>
      {label && (
        <div style={{ fontSize: 24, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: 3, fontFamily: "Arial Black, Arial, sans-serif", opacity: labelOp, textAlign: "center" }}>
          {label}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", opacity: labelOp, textAlign: "center" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
