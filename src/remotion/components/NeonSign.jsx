import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// NeonSign: Text with flickering neon glow effect — dramatic, edgy emphasis
// Best for: shocking stats, warnings, bold claims, urban/nightlife/finance topics
// data: { text: "THE TRUTH", subtitle: "nobody talks about", flicker: true }
export const NeonSign = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || !data.text) return null;
  const text = data.text;
  const subtitle = data.subtitle || "";
  const shouldFlicker = data.flicker !== false;

  // Flicker pattern: mostly on with occasional brief off moments
  const flickerFrames = [3, 4, 12, 13, 28, 45, 46, 60, 61];
  const isFlickering = shouldFlicker && flickerFrames.includes(clipFrame % 70);

  const masterGlow = interpolate(clipFrame, [0, fps * 0.6], [0, 1], { extrapolateRight: "clamp" });
  // Pulsing glow intensity
  const pulse = 0.7 + 0.3 * Math.sin(clipFrame * 0.15);
  const glowIntensity = masterGlow * (isFlickering ? 0.15 : pulse);

  const glowStr = `0 0 10px ${accent}, 0 0 30px ${accent}, 0 0 60px ${accent}${Math.round(glowIntensity * 255).toString(16).padStart(2, "0")}`;
  const subtitleOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "60px",
      backgroundColor: "rgba(0,0,0,0.4)",
    }}>
      {/* Decorative top line */}
      <div style={{ width: 200, height: 2, backgroundColor: accent, boxShadow: `0 0 10px ${accent}`, marginBottom: 30, opacity: glowIntensity }} />

      <div style={{
        fontSize: text.length > 12 ? 88 : 110,
        fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif",
        color: isFlickering ? `rgba(255,255,255,0.1)` : "white",
        textTransform: "uppercase", letterSpacing: 6, textAlign: "center",
        lineHeight: 1.1,
        textShadow: isFlickering ? "none" : glowStr,
        opacity: masterGlow,
      }}>
        {text}
      </div>

      {/* Decorative bottom line */}
      <div style={{ width: 200, height: 2, backgroundColor: accent, boxShadow: `0 0 10px ${accent}`, marginTop: 30, opacity: glowIntensity }} />

      {subtitle && (
        <div style={{
          fontSize: 24, fontWeight: 600, color: `rgba(255,255,255,0.7)`,
          letterSpacing: 4, textTransform: "uppercase", marginTop: 20,
          opacity: subtitleOp, fontFamily: "Arial, sans-serif",
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
