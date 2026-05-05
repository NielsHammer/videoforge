import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * WarningAlert — a danger/caution/warning alert box with icon and text.
 * Elegant but attention-grabbing. No flashing — uses a slow pulse instead.
 * data: { level: "warning|danger|info", title: "Hidden Fee Alert", text: "the detail text", icon: "optional emoji" }
 */
export const WarningAlert = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const level = data.level || "warning";
  const title = data.title || "";
  const text = data.text || "";
  const icon = data.icon || (level === "danger" ? "⚠️" : level === "info" ? "ℹ️" : "⚠️");

  const colors = {
    danger:  { bg: "rgba(239,68,68,0.08)", border: "#ef4444", accent: "#ef4444", glow: "rgba(239,68,68,0.2)" },
    warning: { bg: "rgba(234,179,8,0.08)", border: "#eab308", accent: "#eab308", glow: "rgba(234,179,8,0.2)" },
    info:    { bg: "rgba(74,158,255,0.08)", border: "#4a9eff", accent: "#4a9eff", glow: "rgba(74,158,255,0.2)" },
  };
  const c = colors[level] || colors.warning;

  const scale = springIn(clipFrame, fps, 0.12);
  const textOp = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = breathe(clipFrame, fps, 0.5);
  const borderGlow = 15 + pulse * 10;

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        <div style={{
          width: 1000, padding: "50px 60px",
          background: c.bg,
          borderRadius: 20,
          border: `2px solid ${c.border}`,
          boxShadow: `0 0 ${borderGlow}px ${c.glow}, 0 30px 80px rgba(0,0,0,0.4)`,
          backdropFilter: "blur(20px)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 48 }}>{icon}</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: c.accent, fontFamily: "Inter, sans-serif", letterSpacing: 1 }}>
              {title}
            </div>
          </div>
          {/* Body */}
          <div style={{ opacity: textOp }}>
            <div style={{ fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
              {text}
            </div>
          </div>
        </div>
      </div>
    </AnimatedBg>
  );
};
