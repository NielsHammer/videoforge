import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * KineticText v1 — Words slam onto screen one by one with impact effect
 * Used when the narrator says something punchy and important
 * data: { lines: ["STOP", "WAITING", "START NOW"], style: "impact|stack|typewriter" }
 */
export const KineticText = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.lines) return null;
  const lines = data.lines.slice(0, 4);
  const style = data.style || "impact";

  if (style === "typewriter") {
    const totalChars = lines.join("").length;
    const charsPerFrame = totalChars / (fps * 1.5);
    const charsShown = Math.floor(clipFrame * charsPerFrame);
    let remaining = charsShown;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
        {lines.map((line, i) => {
          const shown = Math.min(remaining, line.length);
          remaining = Math.max(0, remaining - line.length);
          const displayText = line.slice(0, shown);
          const showCursor = remaining === 0 && shown < line.length;
          return (
            <div key={i} style={{ fontSize: 72, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 4, lineHeight: 1.15, textAlign: "center", textShadow: `0 0 40px ${accent}60` }}>
              {displayText}{showCursor ? "|" : ""}
            </div>
          );
        })}
      </div>
    );
  }

  if (style === "stack") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 80px" }}>
        {lines.map((line, i) => {
          const delay = i * fps * 0.2;
          const progress = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
          const scale = interpolate(progress, [0, 1], [0.5, 1]);
          const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ fontSize: i === 0 ? 88 : 64, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: i === 0 ? "white" : `${accent}`, textTransform: "uppercase", letterSpacing: 3, lineHeight: 1.1, textAlign: "center", transform: `scale(${scale})`, opacity, textShadow: `0 0 30px ${accent}40` }}>
              {line}
            </div>
          );
        })}
      </div>
    );
  }

  // Default: impact — each word slams in from above
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {lines.map((line, i) => {
        const delay = i * fps * 0.15;
        const slideY = interpolate(clipFrame, [delay, delay + fps * 0.2], [-60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const opacity = interpolate(clipFrame, [delay, delay + fps * 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const shake = clipFrame === Math.round(delay) ? 3 : 0;
        return (
          <div key={i} style={{ fontSize: lines.length === 1 ? 120 : 88, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 6, lineHeight: 1, textAlign: "center", transform: `translateY(${slideY}px) translateX(${shake}px)`, opacity, textShadow: `0 0 60px ${accent}80, 0 4px 20px rgba(0,0,0,0.8)` }}>
            {line}
          </div>
        );
      })}
      {/* Accent underline */}
      <div style={{ height: 4, width: interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, borderRadius: 2, marginTop: 12 }} />
    </div>
  );
};
