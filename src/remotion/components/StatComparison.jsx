import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// StatComparison — Two large statistics side by side for direct comparison
// data: { left: { value: "96%", label: "never reach $1M", color: "#ef4444" }, right: { value: "4%", label: "achieve wealth", color: "#22c55e" }, title: "The Gap" }
// USE WHEN: narrator contrasts two specific statistics or proportions
export const StatComparison = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.left || !data?.right) return null;

  const leftOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const leftScale = interpolate(clipFrame, [0, fps * 0.4], [0.5, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const rightOp = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const rightScale = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const titleOp = interpolate(clipFrame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });
  const dividerH = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const left = data.left;
  const right = data.right;
  const leftColor = left.color || "#ef4444";
  const rightColor = right.color || accent;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", gap: 24 }}>
      {data.title && (
        <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp }}>
          {data.title}
        </div>
      )}
      <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 0 }}>
        {/* Left stat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", opacity: leftOp, transform: `scale(${leftScale})` }}>
          <div style={{ fontSize: left.value.length > 5 ? 72 : 96, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: leftColor, lineHeight: 1, textShadow: `0 0 40px ${leftColor}60` }}>
            {left.value}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 2, fontFamily: "Arial, sans-serif", marginTop: 12, textAlign: "center", maxWidth: 200 }}>
            {left.label}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 2, height: 120 * dividerH, background: `linear-gradient(to bottom, transparent, ${accent}60, transparent)`, flexShrink: 0 }} />

        {/* Right stat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", opacity: rightOp, transform: `scale(${rightScale})` }}>
          <div style={{ fontSize: right.value.length > 5 ? 72 : 96, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: rightColor, lineHeight: 1, textShadow: `0 0 40px ${rightColor}60` }}>
            {right.value}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 2, fontFamily: "Arial, sans-serif", marginTop: 12, textAlign: "center", maxWidth: 200 }}>
            {right.label}
          </div>
        </div>
      </div>
    </div>
  );
};
