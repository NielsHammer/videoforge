import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { value: "1,229", label: "YEARS OF ROMAN RULE", suffix: "YEARS", color: "accent|red|green|white" }
export const ZoomStat = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.value) return null;

  const value = String(data.value);
  const label = (data.label || "").toUpperCase();
  const colorMap = { accent, red: "#ef4444", green: "#22c55e", white: "white", gold: "#f59e0b" };
  const color = colorMap[data.color] || accent;

  // Value zooms from 10% to 100%
  const scale = interpolate(clipFrame, [0, fps * 0.6], [0.08, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.expo) });
  const opacity = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  // Label fades in after number arrives
  const labelOp = interpolate(clipFrame, [fps * 0.55, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(clipFrame, [fps * 0.55, fps * 0.9], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Font size based on value length
  const valueFontSize = value.length > 8 ? 80 : value.length > 5 ? 110 : value.length > 3 ? 140 : 180;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity, transformOrigin: "center center" }}>
        <div style={{ fontSize: valueFontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color, textAlign: "center", lineHeight: 0.9, textShadow: `0 0 80px ${color}80, 0 0 160px ${color}30`, letterSpacing: -2 }}>
          {value}
        </div>
      </div>
      {label && (
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 5, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", textAlign: "center", opacity: labelOp, transform: `translateY(${labelY}px)`, marginTop: 24, padding: "0 60px" }}>
          {label}
        </div>
      )}
    </div>
  );
};

// SplitText — Screen tears in two halves revealing contrasting phrases
// VERTICAL SPLIT: left half | right half. Max 30 chars each side.
// data: { left: "RICH MINDSET", right: "POOR MINDSET", leftColor: "accent|green|white", rightColor: "red|white" }
