import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// ReactionFace: A large emoji reaction that bounces/animates in — adds emotion and humor
// Works for: shocking facts, funny moments, wins, fails, transitions
// data: { emoji: "🤯", label: "Mind = Blown", style: "bounce" }
// styles: "bounce", "spin", "slam", "float"
export const ReactionFace = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || !data.emoji) return null;
  const emoji = data.emoji;
  const label = data.label || "";
  const style = data.style || "bounce";

  let transform = "";
  let opacity = 1;

  if (style === "slam") {
    // Slams in from above, slight bounce
    const y = interpolate(clipFrame, [0, fps * 0.25, fps * 0.35, fps * 0.45], [-400, 20, -10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const scale = interpolate(clipFrame, [fps * 0.2, fps * 0.28, fps * 0.35], [1, 1.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    transform = `translateY(${y}px) scale(${scale})`;
    opacity = interpolate(clipFrame, [0, fps * 0.1], [0, 1], { extrapolateRight: "clamp" });
  } else if (style === "bounce") {
    const baseIn = interpolate(clipFrame, [0, fps * 0.4], [0.3, 1], { extrapolateRight: "clamp" });
    const bounce = 1 + 0.06 * Math.sin(clipFrame * 0.18);
    transform = `scale(${baseIn * bounce})`;
    opacity = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  } else if (style === "spin") {
    const deg = interpolate(clipFrame, [0, fps * 0.6], [-180, 0], { extrapolateRight: "clamp" });
    const scale = interpolate(clipFrame, [0, fps * 0.4], [0.5, 1], { extrapolateRight: "clamp" });
    transform = `rotate(${deg}deg) scale(${scale})`;
    opacity = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  } else { // float
    const floatY = Math.sin(clipFrame * 0.08) * 12;
    const scale = interpolate(clipFrame, [0, fps * 0.4], [0.5, 1], { extrapolateRight: "clamp" });
    transform = `translateY(${floatY}px) scale(${scale})`;
    opacity = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  }

  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Ripple rings emanating from emoji on slam
  const ripple1 = style === "slam" ? interpolate(clipFrame, [fps * 0.25, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const ripple1Op = style === "slam" ? interpolate(clipFrame, [fps * 0.25, fps * 0.9], [0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Ripple effect for slam */}
      {style === "slam" && (
        <div style={{
          position: "absolute", width: `${200 + ripple1 * 300}px`, height: `${200 + ripple1 * 300}px`,
          borderRadius: "50%", border: `3px solid ${accent}`,
          opacity: ripple1Op, pointerEvents: "none",
        }} />
      )}

      <div style={{ transform, opacity, fontSize: 160, lineHeight: 1, textAlign: "center" }}>
        {emoji}
      </div>

      {label && (
        <div style={{
          fontSize: 36, fontWeight: 900, color: "white", marginTop: 20,
          letterSpacing: 3, textTransform: "uppercase", textAlign: "center",
          opacity: labelOp, fontFamily: "Arial Black, Arial, sans-serif",
          textShadow: `0 0 20px ${accent}80`,
        }}>
          {label}
        </div>
      )}
    </div>
  );
};
