import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const ScoreCard = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const grade = data.grade || "F";
  const label = data.label || "Financial Literacy";
  const subtitle = data.subtitle || "";
  const color = data.color || "#ef4444";

  // Card slams in
  const scale = interpolate(clipFrame, [0, fps * 0.2, fps * 0.3], [0, 1.1, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.1], [0, 1], { extrapolateRight: "clamp" });

  // Grade letter drops in with bounce
  const gradeY = interpolate(clipFrame, [fps * 0.15, fps * 0.4], [-80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });
  const gradeOp = interpolate(clipFrame, [fps * 0.15, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const textOp = interpolate(clipFrame, [fps * 0.4, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Pulse glow
  const glow = 0.6 + Math.sin(clipFrame / fps * 2.5) * 0.4;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${scale})`, opacity,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 0,
      }}>
        {/* Card */}
        <div style={{
          width: 380, padding: "50px 60px",
          background: `${color}10`,
          border: `3px solid ${color}`,
          borderRadius: 20,
          display: "flex", flexDirection: "column", alignItems: "center",
          boxShadow: `0 0 ${60 * glow}px ${color}44`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Header strip */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 8, background: color,
          }} />

          {/* Label */}
          <div style={{
            fontFamily: "sans-serif", fontWeight: 700,
            fontSize: 18, color: "rgba(255,255,255,0.6)",
            textTransform: "uppercase", letterSpacing: 4,
            marginBottom: 24,
          }}>{label}</div>

          {/* Grade */}
          <div style={{
            transform: `translateY(${gradeY}px)`, opacity: gradeOp,
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 200, lineHeight: 1,
            color: color,
            textShadow: `0 0 80px ${color}66`,
          }}>{grade}</div>

          {/* Subtitle */}
          {subtitle && (
            <div style={{
              opacity: textOp, marginTop: 20,
              padding: "10px 24px",
              background: `${color}20`,
              borderRadius: 8,
              fontFamily: "sans-serif", fontWeight: 600,
              fontSize: 20, color: "rgba(255,255,255,0.8)",
              textAlign: "center",
            }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};
