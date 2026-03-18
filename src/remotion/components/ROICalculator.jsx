import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const ROICalculator = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const invested = data.invested || "$10,000";
  const returned = data.returned || "$340,000";
  const years = data.years || 30;
  const rate = data.rate || "10%";
  const label = data.label || "S&P 500 average";

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  const investedOp = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const investedY = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [30, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const arrowScale = interpolate(clipFrame, [fps * 0.4, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  const returnedOp = interpolate(clipFrame, [fps * 0.55, fps * 0.85], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const returnedScale = interpolate(clipFrame, [fps * 0.55, fps * 0.85], [0.7, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.3)),
  });

  const detailsOp = interpolate(clipFrame, [fps * 0.9, fps * 1.1], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, gap: 8,
    }}>
      {/* Invested */}
      <div style={{
        opacity: investedOp, transform: `translateY(${investedY}px)`,
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 400,
          fontSize: 18, color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase", letterSpacing: 3, marginBottom: 8,
        }}>You invest</div>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 900,
          fontSize: 72, color: "#ffffff",
          textShadow: "0 2px 0 rgba(0,0,0,0.5)",
        }}>{invested}</div>
      </div>

      {/* Arrow */}
      <div style={{
        transform: `scale(${arrowScale})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        margin: "8px 0",
      }}>
        <div style={{ width: 2, height: 40, background: `linear-gradient(to bottom, rgba(255,255,255,0.1), ${accent})` }} />
        <div style={{ fontSize: 28, color: accent }}>↓</div>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 16, color: accent,
          background: `${accent}22`, padding: "4px 16px", borderRadius: 20,
          border: `1px solid ${accent}44`,
        }}>{years} years @ {rate}</div>
        <div style={{ width: 2, height: 40, background: `linear-gradient(to bottom, ${accent}, rgba(255,255,255,0.1))` }} />
      </div>

      {/* Returned */}
      <div style={{
        opacity: returnedOp, transform: `scale(${returnedScale})`,
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 400,
          fontSize: 18, color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase", letterSpacing: 3, marginBottom: 8,
        }}>You get back</div>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 900,
          fontSize: 96, color: "#22c55e",
          textShadow: `0 0 60px #22c55e44, 0 4px 0 rgba(0,0,0,0.5)`,
          lineHeight: 1,
        }}>{returned}</div>
      </div>

      {/* Source label */}
      <div style={{
        opacity: detailsOp, marginTop: 16,
        fontFamily: "sans-serif", fontWeight: 400,
        fontSize: 16, color: "rgba(255,255,255,0.35)",
        fontStyle: "italic",
      }}>{label}</div>
    </div>
  );
};
