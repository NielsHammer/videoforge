import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// LoadingBar — Dramatic filling progress bar with label
// data: { label: "Americans Living Paycheck to Paycheck", value: 78, suffix: "%", color: "#ef4444", subtitle: "As of 2024" }
// USE WHEN: narrator reveals a large percentage or proportion that should feel alarming or impactful
export const LoadingBar = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (data?.value === undefined) return null;

  const target = Math.min(Math.max(data.value, 0), 100);
  const barW = interpolate(clipFrame, [fps * 0.3, fps * 1.2], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const labelOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const numOp = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barColor = data.color || accent;
  const glowPulse = 0.5 + Math.sin(clipFrame / fps * 3) * 0.5;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 80px", gap: 24 }}>
      {data.label && (
        <div style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4, opacity: labelOp }}>{data.label}</div>
      )}

      {/* Bar container */}
      <div style={{ position: "relative" }}>
        <div style={{ height: 36, background: "rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: `${barW}%`, height: "100%", background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, borderRadius: 18, boxShadow: `0 0 ${20 + glowPulse * 20}px ${barColor}60`, transition: "none", position: "relative" }}>
            {/* Shimmer */}
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 40, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }} />
          </div>
        </div>
        {/* Percentage label */}
        <div style={{ position: "absolute", right: `${100 - barW}%`, top: "50%", transform: "translate(50%, -50%)", fontSize: 18, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", opacity: numOp, whiteSpace: "nowrap", paddingLeft: 12 }}>
          {Math.round(barW)}{data.suffix || "%"}
        </div>
      </div>

      {data.subtitle && (
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", opacity: labelOp }}>{data.subtitle}</div>
      )}
    </div>
  );
};
