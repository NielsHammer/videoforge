import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

export const GlitchText = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.text) return null;
  const text = data.text;
  const subtitle = data.subtitle || "";

  // Glitch triggers at random intervals
  const glitchPhase = Math.floor(clipFrame / 7);
  const isGlitching = glitchPhase % 4 === 0 && clipFrame > fps * 0.3;
  const glitchX = isGlitching ? (Math.sin(clipFrame * 17) * 8) : 0;
  const glitchX2 = isGlitching ? (Math.cos(clipFrame * 13) * -6) : 0;

  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(clipFrame, [0, fps * 0.2], [1.1, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity }}>
      {/* Red channel offset */}
      {isGlitching && (
        <div style={{ position: "absolute", fontSize: 80, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "rgba(255,0,0,0.5)", textTransform: "uppercase", letterSpacing: 4, transform: `translateX(${glitchX}px) scale(${scale})`, userSelect: "none", mixBlendMode: "screen" }}>
          {text}
        </div>
      )}
      {/* Cyan channel offset */}
      {isGlitching && (
        <div style={{ position: "absolute", fontSize: 80, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "rgba(0,255,255,0.5)", textTransform: "uppercase", letterSpacing: 4, transform: `translateX(${glitchX2}px) scale(${scale})`, userSelect: "none", mixBlendMode: "screen" }}>
          {text}
        </div>
      )}
      {/* Main text */}
      <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 4, textAlign: "center", transform: `scale(${scale})`, textShadow: `0 0 40px ${accent}60`, position: "relative", zIndex: 2 }}>
        {text}
      </div>
      {subtitle && (
        <div style={{ fontSize: 22, color: accent, letterSpacing: 6, textTransform: "uppercase", marginTop: 16, fontFamily: "Arial, sans-serif", opacity: interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
