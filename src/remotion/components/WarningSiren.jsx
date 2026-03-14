import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// WarningSiren: Flashing warning/alert card — used for shocking, negative, or alarming content
// Best for: danger stats, money mistakes, health warnings, things to avoid
// data: { headline: "WARNING", body: "90% of people fail here", icon: "⚠️" }
export const WarningSiren = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || !data.headline) return null;
  const headline = data.headline;
  const body = data.body || "";
  const icon = data.icon || "⚠️";
  const color = data.color || "#ef4444"; // default red for warnings

  // Flashing strobe on the border/glow — alternates every 12 frames
  const flash = Math.floor(clipFrame / 12) % 2 === 0;
  const glowOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const scaleIn = interpolate(clipFrame, [0, fps * 0.4, fps * 0.5], [0.85, 1.04, 1], { extrapolateRight: "clamp" });
  const opIn = interpolate(clipFrame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });
  const bodyOp = interpolate(clipFrame, [fps * 0.5, fps * 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Horizontal scanner line
  const scanY = (clipFrame * 4) % 400;

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "60px",
      opacity: opIn,
    }}>
      {/* Screen flash effect */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundColor: flash ? `${color}08` : "transparent",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 780,
        backgroundColor: "rgba(0,0,0,0.85)",
        border: `3px solid ${flash ? color : `${color}88`}`,
        borderRadius: 12,
        boxShadow: `0 0 ${flash ? 60 : 20}px ${color}${flash ? "80" : "30"}`,
        overflow: "hidden",
        transform: `scale(${scaleIn})`,
        opacity: glowOp,
      }}>
        {/* Scanner line */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: 2,
          top: scanY, backgroundColor: `${color}40`, pointerEvents: "none",
        }} />

        {/* Alert header */}
        <div style={{
          backgroundColor: `${color}${flash ? "dd" : "aa"}`,
          padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>{icon}</div>
          <div style={{
            fontSize: 22, fontWeight: 900, color: "white", letterSpacing: 4,
            textTransform: "uppercase", fontFamily: "Arial Black, Arial, sans-serif",
            flex: 1,
          }}>{headline}</div>
          {/* Blinking indicator */}
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            backgroundColor: flash ? "white" : "transparent",
            border: "2px solid white",
          }} />
        </div>

        {/* Body */}
        {body && (
          <div style={{
            padding: "24px 28px", opacity: bodyOp,
            fontSize: 32, fontWeight: 700, color: "white",
            fontFamily: "Arial, sans-serif", lineHeight: 1.4,
            borderLeft: `4px solid ${color}`,
            margin: "16px",
          }}>
            {body}
          </div>
        )}
      </div>
    </div>
  );
};
