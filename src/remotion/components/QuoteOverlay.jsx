import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const QuoteOverlay = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.quote) return null;
  const quote = data.quote;
  const attribution = data.attribution || "";
  const style = data.style || "centered"; // "centered" | "side" | "large"

  const quoteMarkOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const textOp = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const attrOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
      {/* Opening quote mark */}
      <div style={{ fontSize: 120, fontFamily: "Georgia, serif", color: accent, lineHeight: 0.6, marginBottom: 8, opacity: quoteMarkOp, alignSelf: "flex-start" }}>"</div>

      {/* Quote text */}
      <div style={{ opacity: textOp, transform: `translateY(${textY}px)`, textAlign: "center" }}>
        <div style={{
          fontSize: style === "large" ? 52 : 38,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          color: "white",
          lineHeight: 1.5,
          fontStyle: "italic",
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}>
          {quote}
        </div>
      </div>

      {/* Accent line */}
      <div style={{ width: lineW, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, margin: "20px 0", borderRadius: 1 }} />

      {/* Attribution */}
      {attribution && (
        <div style={{ fontSize: 18, color: accent, letterSpacing: 4, textTransform: "uppercase", opacity: attrOp, fontFamily: "Arial, sans-serif", fontWeight: 700 }}>
          — {attribution}
        </div>
      )}
    </div>
  );
};
