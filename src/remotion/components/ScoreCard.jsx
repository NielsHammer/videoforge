import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// ScoreCard — Letter grade or score reveal, dramatic
// data: { grade: "F", label: "Financial Literacy", subtitle: "Most Americans score here", color: "#ef4444" }
// USE WHEN: narrator grades, rates, or scores something (e.g. "Americans get an F on financial literacy")
export const ScoreCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.grade) return null;

  const grade = data.grade;
  const gradeColor = data.color || accent;
  const label = data.label || "";
  const subtitle = data.subtitle || "";

  const circleScale = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
  const gradeOp = interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.7 + Math.sin(clipFrame / fps * 2) * 0.3;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      {/* Grade circle */}
      <div style={{
        width: 200, height: 200, borderRadius: "50%",
        border: `6px solid ${gradeColor}`,
        boxShadow: `0 0 60px ${gradeColor}${Math.round(pulse * 80).toString(16).padStart(2, "0")}, 0 0 120px ${gradeColor}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${circleScale})`,
        background: `${gradeColor}10`,
      }}>
        <div style={{ fontSize: 120, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: gradeColor, lineHeight: 1, opacity: gradeOp, textShadow: `0 0 40px ${gradeColor}80` }}>
          {grade}
        </div>
      </div>
      {/* Label */}
      {label && (
        <div style={{ fontSize: 28, fontWeight: 800, color: "white", textTransform: "uppercase", letterSpacing: 3, fontFamily: "Arial Black, Arial, sans-serif", opacity: labelOp, textAlign: "center" }}>
          {label}
        </div>
      )}
      {subtitle && (
        <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", opacity: labelOp, textAlign: "center", maxWidth: 400 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
