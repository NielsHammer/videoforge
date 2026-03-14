import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const TrendArrow = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;
  const direction = data.direction || "up"; // "up" | "down"
  const label = data.label || "";
  const value = data.value || "";
  const context = data.context || "";
  const isUp = direction === "up";
  const color = isUp ? "#22c55e" : "#ef4444";

  const arrowProgress = interpolate(clipFrame, [fps * 0.1, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const scaleIn = interpolate(clipFrame, [0, fps * 0.3], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const bounce = Math.sin(clipFrame / fps * 2) * (isUp ? -5 : 5);
  const valueOp = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const arrowPath = isUp
    ? `M 100 ${200 - arrowProgress * 140} L 100 200 M 60 ${80 - arrowProgress * 100} L 100 ${20 - arrowProgress * 120} L 140 ${80 - arrowProgress * 100}`
    : `M 100 ${60 + arrowProgress * 140} L 100 60 M 60 ${180 + arrowProgress * 80} L 100 ${220 + arrowProgress * 100} L 140 ${180 + arrowProgress * 80}`;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity }}>
      {/* Arrow SVG */}
      <div style={{ transform: `scale(${scaleIn}) translateY(${bounce}px)` }}>
        <svg width="200" height="240" viewBox="0 0 200 240">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d={arrowPath} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
        </svg>
      </div>

      {/* Value */}
      {value && (
        <div style={{ fontSize: 72, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color, lineHeight: 1, opacity: valueOp, textShadow: `0 0 40px ${color}60` }}>
          {value}
        </div>
      )}

      {/* Label */}
      {label && (
        <div style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 3, marginTop: 12, opacity: valueOp, fontFamily: "Arial, sans-serif" }}>
          {label}
        </div>
      )}

      {context && (
        <div style={{ fontSize: 18, color: `rgba(255,255,255,0.5)`, marginTop: 8, fontFamily: "Arial, sans-serif", opacity: valueOp }}>
          {context}
        </div>
      )}
    </div>
  );
};
