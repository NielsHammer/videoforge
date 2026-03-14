import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const MoneyCounter = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#22c55e";
  if (!data) return null;
  const targetAmount = data.amount || 10000;
  const label = data.label || "per month";
  const prefix = data.prefix || "$";
  const duration = data.duration || 2;

  const progress = interpolate(clipFrame, [fps * 0.2, fps * duration], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const currentAmount = Math.round(progress * targetAmount);
  const formatted = currentAmount.toLocaleString();

  const scaleIn = interpolate(clipFrame, [0, fps * 0.3], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const glow = 0.4 + Math.sin(clipFrame / fps * 3) * 0.2;

  // Rain of dollar signs in background
  const dollarSymbols = Array.from({ length: 8 }, (_, i) => {
    const x = (i / 8) * 100;
    const y = ((clipFrame * (0.5 + i * 0.1)) % 100);
    const op = Math.min(progress * 0.3, 0.2);
    return { x, y, op, i };
  });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Background dollar signs */}
      {dollarSymbols.map(({ x, y, op, i }) => (
        <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, fontSize: 32, color: accent, opacity: op, fontWeight: 900, userSelect: "none" }}>$</div>
      ))}

      {/* Main counter */}
      <div style={{ transform: `scale(${scaleIn})`, opacity, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", marginBottom: 12, fontFamily: "Arial, sans-serif" }}>
          {label}
        </div>
        <div style={{ fontSize: 110, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", lineHeight: 1, textShadow: `0 0 60px ${accent}${Math.round(glow * 200).toString(16).padStart(2, '0')}, 0 0 30px ${accent}60` }}>
          {prefix}{formatted}
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 20, width: 400 }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent}80, ${accent})`, borderRadius: 2, boxShadow: `0 0 10px ${accent}` }} />
        </div>
      </div>
    </div>
  );
};
