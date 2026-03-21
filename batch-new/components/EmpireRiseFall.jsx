import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { label: "Roman Empire", peak: "27 BC", fall: "476 AD", peakFrame: 0.5 (where peak is, 0-1) }
export const EmpireRiseFall = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.label) return null;

  const label = data.label;
  const peak = data.peak || "";
  const fall = data.fall || "";
  const peakAt = data.peakFrame || 0.5; // fraction of clip where peak occurs
  const totalDuration = fps * 3;

  // Power level: rises to peak then falls
  const peakFrame = totalDuration * peakAt;
  let power;
  if (clipFrame <= peakFrame) {
    power = interpolate(clipFrame, [0, peakFrame], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  } else {
    power = interpolate(clipFrame, [peakFrame, totalDuration], [1, 0.05], { extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  }

  const isRising = clipFrame <= peakFrame;
  const barColor = isRising ? accent : "#ef4444";

  const labelOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const peakLabelOp = interpolate(clipFrame, [peakFrame - fps * 0.3, peakFrame + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 5, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: labelOp, marginBottom: 24 }}>
        {label} — POWER OVER TIME
      </div>

      {/* Power label */}
      <div style={{ fontSize: 64, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: barColor, marginBottom: 20, textShadow: `0 0 30px ${barColor}60` }}>
        {Math.round(power * 100)}%
      </div>

      {/* Bar track */}
      <div style={{ width: "100%", height: 20, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${power * 100}%`, background: `linear-gradient(90deg, ${barColor}80, ${barColor})`, borderRadius: 10, boxShadow: `0 0 20px ${barColor}60`, transition: "width 0.05s" }} />
      </div>

      {/* Timeline labels */}
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        {peak && <div style={{ fontSize: 12, fontWeight: 700, color: `${accent}cc`, letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>{peak}</div>}
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 2, fontFamily: "Arial, sans-serif", opacity: peakLabelOp }}>PEAK POWER</div>
        {fall && <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444cc", letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>{fall}</div>}
      </div>
    </div>
  );
};

// CoinDrop — Gold coins rain down then scatter. Wealth/debt/treasury narrative.
// ANIMATED. Coins fall from top with physics-like bounce.
// data: { count: 12, label: "ROME'S TREASURY", sublabel: "depleted in 50 years" }
