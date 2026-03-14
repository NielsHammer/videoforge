import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// CountUp: Animated number that counts from 0 (or start) to target value
// Works for any numeric stat: percentages, dollars, followers, years, etc.
// data: { value: 10000000, prefix: "$", suffix: "M", label: "in revenue", decimals: 0, duration: 2.5 }
export const CountUp = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || data.value === undefined) return null;

  const target = Number(data.value);
  const start = Number(data.start || 0);
  const duration = (data.duration || 2) * fps;
  const prefix = data.prefix || "";
  const suffix = data.suffix || "";
  const label = data.label || "";
  const decimals = data.decimals !== undefined ? data.decimals : 0;

  const progress = interpolate(clipFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: (t) => t < 0.8 ? t / 0.8 * 0.9 : 0.9 + (t - 0.8) / 0.2 * 0.1, // fast then slow
  });

  const current = start + (target - start) * progress;
  const displayValue = decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString();

  const scaleIn = interpolate(clipFrame, [0, fps * 0.4], [0.6, 1], { extrapolateRight: "clamp" });
  const opIn = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "60px",
      opacity: opIn,
    }}>
      {/* Glowing ring */}
      <div style={{
        width: 280, height: 280, borderRadius: "50%",
        border: `3px solid ${accent}`,
        boxShadow: `0 0 60px ${accent}40, inset 0 0 60px ${accent}10`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        transform: `scale(${scaleIn})`,
        marginBottom: 30,
      }}>
        <div style={{
          fontSize: target >= 1000000 ? 56 : target >= 10000 ? 68 : 82,
          fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif",
          color: "white", lineHeight: 1, textAlign: "center",
        }}>
          <span style={{ color: accent, fontSize: "0.6em" }}>{prefix}</span>
          {displayValue}
          <span style={{ color: accent, fontSize: "0.5em" }}>{suffix}</span>
        </div>
      </div>
      {label && (
        <div style={{
          fontSize: 28, fontWeight: 700, color: `rgba(255,255,255,0.85)`,
          letterSpacing: 3, textTransform: "uppercase", textAlign: "center",
          opacity: labelOp, fontFamily: "Arial, sans-serif",
          borderTop: `2px solid ${accent}60`, paddingTop: 16,
        }}>
          {label}
        </div>
      )}
    </div>
  );
};
