import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const PullQuote = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const quote = data.quote || "";
  const attribution = data.attribution || "";

  // Fade + scale in
  const scale = interpolate(clipFrame, [0, fps * 0.35], [0.92, 1], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });

  // Quote mark scale
  const markScale = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.3)),
  });

  // Attribution slides up
  const attrOp = interpolate(clipFrame, [fps * 0.5, fps * 0.75], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const attrY = interpolate(clipFrame, [fps * 0.5, fps * 0.75], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${scale})`, opacity,
        maxWidth: 860, padding: "60px 80px",
        position: "relative",
        border: `1px solid ${accent}33`,
        borderLeft: `5px solid ${accent}`,
        background: `${accent}08`,
        borderRadius: 4,
      }}>
        {/* Opening quote mark */}
        <div style={{
          position: "absolute", top: -20, left: 60,
          transform: `scale(${markScale})`,
          fontFamily: "Georgia, serif", fontWeight: 900,
          fontSize: 120, color: accent,
          lineHeight: 1, opacity: 0.4,
          pointerEvents: "none",
        }}>"</div>

        {/* Quote text */}
        <p style={{
          fontFamily: "Georgia, serif", fontStyle: "italic",
          fontWeight: 400, fontSize: 34,
          color: "rgba(255,255,255,0.95)",
          lineHeight: 1.6, margin: 0,
          position: "relative", zIndex: 1,
        }}>{quote}</p>

        {/* Attribution */}
        {attribution && (
          <div style={{
            marginTop: 32,
            opacity: attrOp, transform: `translateY(${attrY}px)`,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{
              width: 40, height: 2,
              background: accent, borderRadius: 1,
            }} />
            <span style={{
              fontFamily: "sans-serif", fontWeight: 600,
              fontSize: 20, color: accent,
              letterSpacing: 1,
            }}>{attribution}</span>
          </div>
        )}
      </div>
    </div>
  );
};
