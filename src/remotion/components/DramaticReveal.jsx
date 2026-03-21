import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "He had 23 minutes left to live", label: "THE TRUTH" }
export const DramaticReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.text) return null;

  const text = data.text;
  const label = (data.label || "").toUpperCase();

  const blur = interpolate(clipFrame, [0, fps * 1.2], [20, 0], { extrapolateRight: "clamp" });
  const op = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(clipFrame, [0, fps * 1.0], [1.05, 1], { extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = text.length > 80 ? 28 : text.length > 50 ? 36 : text.length > 30 ? 44 : 56;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ fontSize, fontWeight: 700, fontFamily: "Georgia, serif", color: "white", textAlign: "center", lineHeight: 1.5, opacity: op, filter: `blur(${blur}px)`, transform: `scale(${scale})`, fontStyle: "italic" }}>
        "{text}"
      </div>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 6, color: accent, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: labelOp, marginTop: 28 }}>
          {label}
        </div>
      )}
    </div>
  );
};

// RedlineCross — Statement appears, then a thick red line crosses through it
// CENTERED. Perfect for "they said X but the truth is..." moments.
// data: { wrong: "The barbarians destroyed Rome", right: "Rome destroyed itself" }
