import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// MythFact — Shows a myth being busted by a fact
// data: { myth: "what people believe", fact: "the truth from script", label: "MYTH BUSTED" }
// USE WHEN: narrator debunks a common belief or contrasts myth vs reality
export const MythFact = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.myth || !data?.fact) return null;

  const mythOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const factOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const strikeW = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px", gap: 28 }}>
      {/* MYTH */}
      <div style={{ width: "100%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: "24px 28px", opacity: mythOp, position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#ef4444", letterSpacing: 4, textTransform: "uppercase", marginBottom: 10, fontFamily: "Arial, sans-serif" }}>MYTH</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{data.myth}</div>
        {/* Strike-through line */}
        <div style={{ position: "absolute", top: "50%", left: 0, width: `${strikeW * 100}%`, height: 3, background: "#ef4444", opacity: 0.8 }} />
      </div>

      {/* Arrow */}
      <div style={{ fontSize: 28, color: accent, opacity: factOp }}>↓</div>

      {/* FACT */}
      <div style={{ width: "100%", background: `rgba(34,197,94,0.08)`, border: `1px solid rgba(34,197,94,0.25)`, borderRadius: 16, padding: "24px 28px", opacity: factOp }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", letterSpacing: 4, textTransform: "uppercase", marginBottom: 10, fontFamily: "Arial, sans-serif" }}>REALITY</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{data.fact}</div>
      </div>

      {/* Label */}
      {data.label && (
        <div style={{ fontSize: 14, fontWeight: 800, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: labelOp }}>
          {data.label}
        </div>
      )}
    </div>
  );
};
