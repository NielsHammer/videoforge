import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// ColdOpenDate — Cinematic date/location stamp like a film establishing shot
// HORIZONTAL: location on top, date below, centered
// Works for: history, true crime, documentary, travel, any time-specific moment
// data: { location: "ROME, ITALY", date: "SEPTEMBER 4TH — 476 AD", subtitle: "optional context" }
export const ColdOpenDate = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.date) return null;

  const location = (data.location || "").toUpperCase();
  const date = (data.date || "").toUpperCase();
  const subtitle = data.subtitle || "";

  // Staggered reveal: location → line → date → subtitle
  const locOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const locY = interpolate(clipFrame, [0, fps * 0.4], [12, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const lineW = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 280], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dateOp = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dateY = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle horizontal scan line effect
  const scanOp = interpolate(clipFrame, [0, fps * 0.2, fps * 0.4], [0.4, 0.8, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {/* Scan line flash on entry */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 48%, ${accent}20 50%, transparent 52%)`, opacity: scanOp, pointerEvents: "none" }} />

      {/* Location */}
      {location && (
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 8, color: `rgba(255,255,255,0.5)`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: locOp, transform: `translateY(${locY}px)`, marginBottom: 16 }}>
          {location}
        </div>
      )}

      {/* Accent line */}
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginBottom: 16 }} />

      {/* Date — main text */}
      <div style={{ fontSize: location ? 52 : 64, fontWeight: 900, letterSpacing: 4, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", textAlign: "center", opacity: dateOp, transform: `translateY(${dateY}px)`, lineHeight: 1.2, textShadow: `0 0 60px ${accent}40` }}>
        {date}
      </div>

      {/* Bottom line */}
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginTop: 16 }} />

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 4, color: `${accent}cc`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: subOp, marginTop: 20, textAlign: "center" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
