import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "Something was watching.", label: "They were never alone." }
export const CreepZoom = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.text) return null;

  const text = data.text;
  const label = data.label || "";

  const scale = interpolate(clipFrame, [0, fps * 3], [1, 1.4], { extrapolateRight: "clamp" });
  const op = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const blur = interpolate(clipFrame, [0, fps * 0.3], [6, 0], { extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 1.0, fps * 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = text.length > 50 ? 28 : text.length > 30 ? 36 : 48;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ transform: `scale(${scale})`, opacity: op, filter: `blur(${blur}px)` }}>
        <div style={{ fontSize, fontWeight: 700, fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.5, fontStyle: "italic" }}>
          "{text}"
        </div>
      </div>
      {label && (
        <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.3)", fontFamily: "Arial, sans-serif", textAlign: "center", opacity: labelOp, marginTop: 28 }}>
          {label}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// LUXURY / WEALTH
// ═══════════════════════════════════════════════

// NetWorthReveal — Net worth slides in from darkness. Gold text, premium feel.
// data: { amount: "$400 BILLION", name: "Augustus Caesar", context: "Adjusted for inflation, 2026" }
