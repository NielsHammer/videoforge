import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// BigNumber — A single massive number taking up most of the screen
// data: { value: "$8,400", label: "Average American Savings", context: "That's it. That's all.", prefix: "", suffix: "" }
// USE WHEN: narrator reveals a single shocking or impactful number that deserves full visual emphasis
export const BigNumber = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.value) return null;

  const numScale = interpolate(clipFrame, [0, fps * 0.5], [3, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const numOp = interpolate(clipFrame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contextOp = interpolate(clipFrame, [fps * 0.9, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const val = String(data.value);
  const fontSize = val.length > 8 ? 80 : val.length > 5 ? 100 : 120;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      {/* The number */}
      <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: accent, lineHeight: 1, opacity: numOp, transform: `scale(${numScale})`, textShadow: `0 0 80px ${accent}60, 0 0 160px ${accent}20` }}>
        {data.prefix || ""}{val}{data.suffix || ""}
      </div>

      {/* Label */}
      {data.label && (
        <div style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: labelOp, textAlign: "center", maxWidth: 600 }}>
          {data.label}
        </div>
      )}

      {/* Context */}
      {data.context && (
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", fontFamily: "Arial, sans-serif", fontStyle: "italic", opacity: contextOp, textAlign: "center" }}>
          {data.context}
        </div>
      )}
    </div>
  );
};
