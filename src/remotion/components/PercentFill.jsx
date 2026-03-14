import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const PercentFill = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;
  const percentage = Math.min(100, Math.max(0, data.percentage || 75));
  const label = data.label || "";
  const context = data.context || "";
  const style = data.style || "circle"; // "circle" | "bar" | "liquid"

  const progress = interpolate(clipFrame, [fps * 0.2, fps * 1.8], [0, percentage / 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const currentPct = Math.round(progress * 100);
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const glow = 0.5 + Math.sin(clipFrame / fps * 2) * 0.2;

  if (style === "bar") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, padding: "0 120px" }}>
        {label && <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, marginBottom: 20 }}>{label}</div>}
        <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", lineHeight: 1, textShadow: `0 0 40px ${accent}60`, marginBottom: 24 }}>{currentPct}%</div>
        <div style={{ width: "100%", height: 24, background: "rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", border: `1px solid ${accent}30` }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent}80, ${accent})`, borderRadius: 12, boxShadow: `0 0 20px ${accent}60`, transition: "none" }} />
        </div>
        {context && <div style={{ fontSize: 20, color: accent, marginTop: 16, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>{context}</div>}
      </div>
    );
  }

  // Circle style
  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ position: "relative", width: 260, height: 260 }}>
        <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: "rotate(-90deg)" }}>
          {/* Background circle */}
          <circle cx="130" cy="130" r="100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
          {/* Progress circle */}
          <circle cx="130" cy="130" r="100" fill="none" stroke={accent} strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ filter: `drop-shadow(0 0 12px ${accent}${Math.round(glow * 200).toString(16).padStart(2, '0')})`, transition: "none" }}
          />
        </svg>
        {/* Center text */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 64, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", lineHeight: 1 }}>{currentPct}%</div>
        </div>
      </div>
      {label && <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, marginTop: 20 }}>{label}</div>}
      {context && <div style={{ fontSize: 18, color: accent, marginTop: 8, letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>{context}</div>}
    </div>
  );
};
