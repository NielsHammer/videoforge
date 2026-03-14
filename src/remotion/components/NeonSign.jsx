import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// NeonSign: Glowing neon text — dramatic, edgy emphasis
// Flicker is OFF by default. Use flicker:true only for intentionally glitchy moments.
// data: { text: "THE TRUTH", subtitle: "nobody talks about", flicker: false }
export const NeonSign = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || !data.text) return null;
  const text = data.text;
  const subtitle = data.subtitle || "";
  // Flicker defaults OFF — looks broken to most viewers
  const shouldFlicker = data.flicker === true;

  // Smooth pulse — glow breathes in and out naturally
  const masterIn = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 0.75 + 0.25 * Math.sin(clipFrame * 0.08);
  const glowIntensity = masterIn * pulse;

  // Only flicker if explicitly requested, and very subtly
  const flickerFrames = [8, 9, 45, 46];
  const isFlickering = shouldFlicker && flickerFrames.includes(clipFrame % 80);
  const finalGlow = isFlickering ? glowIntensity * 0.4 : glowIntensity;

  const glowStr = `0 0 10px ${accent}, 0 0 30px ${accent}${Math.round(finalGlow * 180).toString(16).padStart(2, "0")}, 0 0 60px ${accent}${Math.round(finalGlow * 100).toString(16).padStart(2, "0")}`;
  const subtitleOp = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "60px",
    }}>
      <div style={{ width: 180, height: 2, backgroundColor: accent, boxShadow: `0 0 10px ${accent}`, marginBottom: 30, opacity: glowIntensity * 0.8 }} />
      <div style={{
        fontSize: text.length > 14 ? 80 : text.length > 10 ? 96 : 114,
        fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif",
        color: "white", textTransform: "uppercase", letterSpacing: 6, textAlign: "center",
        lineHeight: 1.1, textShadow: glowStr, opacity: masterIn,
      }}>
        {text}
      </div>
      <div style={{ width: 180, height: 2, backgroundColor: accent, boxShadow: `0 0 10px ${accent}`, marginTop: 30, opacity: glowIntensity * 0.8 }} />
      {subtitle && (
        <div style={{
          fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.75)",
          letterSpacing: 4, textTransform: "uppercase", marginTop: 20,
          opacity: subtitleOp, fontFamily: "Arial, sans-serif",
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
