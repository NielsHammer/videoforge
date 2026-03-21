import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { year: "44 BC", label: "FLASHBACK", context: "The Ides of March" }
export const FlashbackCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.year) return null;

  const year = data.year;
  const label = (data.label || "FLASHBACK").toUpperCase();
  const context = data.context || "";

  const op = interpolate(clipFrame, [0, fps * 0.3, fps * 1.5, fps * 2], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const yearOp = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const yearY = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: op }}>
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)", pointerEvents: "none" }} />
      {/* Sepia-like overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(139,109,56,0.12)", pointerEvents: "none" }} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 8, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", opacity: labelOp }}>
          ◀ {label} ▶
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, color: "white", fontFamily: "Georgia, serif", opacity: yearOp, transform: `translateY(${yearY}px)`, letterSpacing: 4, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
          {year}
        </div>
        {context && (
          <div style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.5)", fontFamily: "Georgia, serif", fontStyle: "italic", opacity: yearOp }}>
            {context}
          </div>
        )}
      </div>
    </div>
  );
};
