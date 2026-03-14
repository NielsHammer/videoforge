import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * SpotlightStat v1 — A single dramatic stat with spotlight, used mid-video for impact
 * data: { value: "92%", label: "of people never start", context: "Don't be one of them" }
 */
export const SpotlightStat = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;

  const value = data.value || "0";
  const label = data.label || "";
  const context = data.context || "";

  // Spotlight expands
  const spotRadius = interpolate(clipFrame, [0, fps * 0.6], [0, 800], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Value slams in
  const valueScale = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const valueOp = interpolate(clipFrame, [fps * 0.1, fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Label fades in after value
  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Context fades in last
  const contextOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulse glow
  const glow = 0.5 + Math.sin(clipFrame / fps * 2) * 0.3;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Spotlight circle */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: spotRadius * 2, height: spotRadius * 2,
        borderRadius: "50%",
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Ring */}
      <div style={{
        position: "absolute",
        width: 300, height: 300,
        borderRadius: "50%",
        border: `2px solid ${accent}${Math.round(glow * 40).toString(16).padStart(2, '0')}`,
        opacity: valueOp,
      }} />

      {/* Main value */}
      <div style={{
        fontSize: 160, fontWeight: 900,
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "white",
        lineHeight: 1,
        textAlign: "center",
        transform: `scale(${valueScale})`,
        opacity: valueOp,
        textShadow: `0 0 80px ${accent}${Math.round(glow * 255).toString(16).padStart(2, '0')}, 0 0 40px ${accent}60`,
        zIndex: 10,
      }}>
        {value}
      </div>

      {/* Label */}
      <div style={{
        fontSize: 32, fontWeight: 700,
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "rgba(255,255,255,0.85)",
        textTransform: "uppercase",
        letterSpacing: 4,
        textAlign: "center",
        marginTop: 16,
        opacity: labelOp,
        transform: `translateY(${labelY}px)`,
        maxWidth: 600,
      }}>
        {label}
      </div>

      {/* Context */}
      {context && (
        <div style={{
          fontSize: 20, fontWeight: 600,
          fontFamily: "Arial, sans-serif",
          color: accent,
          textTransform: "uppercase",
          letterSpacing: 3,
          textAlign: "center",
          marginTop: 24,
          opacity: contextOp,
          padding: "10px 24px",
          border: `1px solid ${accent}40`,
          borderRadius: 8,
        }}>
          {context}
        </div>
      )}
    </div>
  );
};
