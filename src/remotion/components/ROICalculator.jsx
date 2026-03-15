import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// ROICalculator — Shows an investment growing over time
// data: { invested: "$10,000", returned: "$340,000", years: 30, rate: "10%", label: "S&P 500 average" }
// USE WHEN: narrator shows compound interest, investment returns, or wealth growth calculations
export const ROICalculator = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.invested) return null;

  const investedOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const arrowScale = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
  const returnedOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const returnedScale = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const labelOp = interpolate(clipFrame, [fps * 1.1, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "40px 80px" }}>
      {/* Input */}
      <div style={{ textAlign: "center", opacity: investedOp }}>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 6 }}>YOU INVEST</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: "rgba(255,255,255,0.7)", fontFamily: "Arial Black, Arial, sans-serif" }}>{data.invested}</div>
      </div>

      {/* Arrow + years */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${arrowScale})`, gap: 4 }}>
        <div style={{ fontSize: 36, color: accent }}>↓</div>
        <div style={{ fontSize: 14, color: accent, fontWeight: 700, letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>
          {data.years ? `${data.years} YEARS` : ""} {data.rate ? `@ ${data.rate}` : ""}
        </div>
        <div style={{ fontSize: 36, color: accent }}>↓</div>
      </div>

      {/* Output */}
      <div style={{ textAlign: "center", opacity: returnedOp, transform: `scale(${returnedScale})` }}>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 6 }}>BECOMES</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: accent, fontFamily: "Arial Black, Arial, sans-serif", textShadow: `0 0 40px ${accent}60` }}>{data.returned}</div>
      </div>

      {/* Label */}
      {data.label && (
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", fontStyle: "italic", opacity: labelOp }}>{data.label}</div>
      )}
    </div>
  );
};
