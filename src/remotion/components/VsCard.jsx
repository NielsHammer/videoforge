import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// VsCard — Two opponents dramatically facing off. Left slides in, right slides in, VS explodes center.
// HORIZONTAL SPLIT: left side | VS | right side. Works at any aspect ratio.
// Works for: history (Rome vs Barbarians), finance (rich vs poor), health (good vs bad), sports
// data: { left: "ROME", right: "VISIGOTHS", leftStat: "50,000 soldiers", rightStat: "80,000 warriors", label: "476 AD" }
export const VsCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.left || !data?.right) return null;

  const left = (data.left || "").toUpperCase();
  const right = (data.right || "").toUpperCase();
  const leftStat = data.leftStat || "";
  const rightStat = data.rightStat || "";
  const label = data.label || "";

  // Left slides in from left, right from right
  const leftX = interpolate(clipFrame, [0, fps * 0.4], [-200, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const rightX = interpolate(clipFrame, [0, fps * 0.4], [200, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const leftOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const rightOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  // VS explodes in after both sides arrive
  const vsScale = interpolate(clipFrame, [fps * 0.4, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  const vsOp = interpolate(clipFrame, [fps * 0.4, fps * 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Pulse the VS
  const vsPulse = 1 + interpolate(Math.sin(clipFrame * 0.15), [-1, 1], [-0.03, 0.03]);

  const statOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 1.0, fps * 1.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Font size adapts to text length
  const leftFontSize = left.length > 12 ? 36 : left.length > 8 ? 48 : 64;
  const rightFontSize = right.length > 12 ? 36 : right.length > 8 ? 48 : 64;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px" }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", gap: 0 }}>
        {/* Left */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", opacity: leftOp, transform: `translateX(${leftX}px)` }}>
          <div style={{ fontSize: leftFontSize, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3, textAlign: "center", lineHeight: 1.1, textShadow: `0 0 30px ${accent}60` }}>
            {left}
          </div>
          {leftStat && (
            <div style={{ fontSize: 16, fontWeight: 600, color: `${accent}cc`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2, marginTop: 8, opacity: statOp, textAlign: "center" }}>
              {leftStat}
            </div>
          )}
        </div>

        {/* VS */}
        <div style={{ flexShrink: 0, width: 120, display: "flex", flexDirection: "column", alignItems: "center", opacity: vsOp, transform: `scale(${vsScale * vsPulse})` }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: accent, fontFamily: "Arial Black, Arial, sans-serif", textShadow: `0 0 40px ${accent}, 0 0 80px ${accent}60`, letterSpacing: -2 }}>
            VS
          </div>
          {/* Lightning effect */}
          <div style={{ width: 2, height: 30, background: `linear-gradient(180deg, ${accent}, transparent)`, opacity: 0.6 }} />
        </div>

        {/* Right */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", opacity: rightOp, transform: `translateX(${rightX}px)` }}>
          <div style={{ fontSize: rightFontSize, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", letterSpacing: 3, textAlign: "center", lineHeight: 1.1, textShadow: `0 0 30px rgba(255,100,100,0.6)` }}>
            {right}
          </div>
          {rightStat && (
            <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,150,150,0.8)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2, marginTop: 8, opacity: statOp, textAlign: "center" }}>
              {rightStat}
            </div>
          )}
        </div>
      </div>

      {/* Dividing line */}
      <div style={{ width: "90%", height: 1, background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`, marginTop: 32, opacity: vsOp }} />

      {/* Bottom label */}
      {label && (
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 5, color: "rgba(255,255,255,0.35)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", marginTop: 16, opacity: labelOp }}>
          {label}
        </div>
      )}
    </div>
  );
};
