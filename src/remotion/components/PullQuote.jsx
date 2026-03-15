import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// PullQuote — A single powerful quote, large and centered with quotation marks
// data: { quote: "exact words from script", attribution: "optional source", style: "big|minimal" }
// USE WHEN: narrator says something quotable, memorable, or attributes a quote to someone
export const PullQuote = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.quote) return null;

  const quote = data.quote.slice(0, 120);
  const attribution = data.attribution || "";

  const quoteOp = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const quoteY = interpolate(clipFrame, [0, fps * 0.5], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const attribOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = quote.length > 80 ? 32 : quote.length > 50 ? 40 : 48;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 100px" }}>
      {/* Opening quote mark */}
      <div style={{ fontSize: 120, fontFamily: "Georgia, serif", color: accent, lineHeight: 0.7, opacity: quoteOp * 0.6, alignSelf: "flex-start", marginLeft: 20 }}>"</div>
      {/* Quote text */}
      <div style={{ fontSize, fontWeight: 700, fontFamily: "Georgia, serif", color: "white", textAlign: "center", lineHeight: 1.5, letterSpacing: 0.5, opacity: quoteOp, transform: `translateY(${quoteY}px)`, fontStyle: "italic", textShadow: `0 2px 20px rgba(0,0,0,0.5)` }}>
        {quote}
      </div>
      {/* Closing quote mark */}
      <div style={{ fontSize: 120, fontFamily: "Georgia, serif", color: accent, lineHeight: 0.7, opacity: quoteOp * 0.6, alignSelf: "flex-end", marginRight: 20 }}>"</div>
      {/* Accent line */}
      <div style={{ width: lineW, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginTop: 20, marginBottom: 16 }} />
      {/* Attribution */}
      {attribution && (
        <div style={{ fontSize: 18, fontWeight: 600, color: accent, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: attribOp }}>
          — {attribution}
        </div>
      )}
    </div>
  );
};
