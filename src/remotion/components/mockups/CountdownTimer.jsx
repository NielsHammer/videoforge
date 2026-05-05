import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * CountdownTimer — dramatic countdown from N to 0 (or a specific target).
 * The number ticks down with each beat and the final number gets a glow punch.
 * data: { from: 10, to: 0, label: "days until deadline", unit: "DAYS", context: "optional" }
 */
export const CountdownTimer = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const from = Number(data.from ?? 10);
  const to = Number(data.to ?? 0);
  const label = data.label || "";
  const unit = data.unit || "";
  const context = data.context || "";

  const range = from - to;
  // Countdown runs from 0.3s to 2.0s of the clip
  const progress = interpolate(clipFrame, [fps * 0.3, fps * 2.0], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad),
  });
  const currentVal = Math.round(from - progress * range);
  const isDone = currentVal <= to;

  const scale = springIn(clipFrame, fps, 0.1);
  const labelOp = interpolate(clipFrame, [fps * 0.15, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const finalGlow = isDone ? breathe(clipFrame, fps, 1.0) : 0;

  const accent = isDone ? "#ef4444" : "#4a9eff";

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        {/* Unit label above */}
        {unit && (
          <div style={{ opacity: labelOp, marginBottom: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", letterSpacing: 6, textTransform: "uppercase" }}>
              {unit}
            </div>
          </div>
        )}

        {/* Big number */}
        <div style={{
          fontSize: 200, fontWeight: 800, fontFamily: "Inter, sans-serif",
          color: accent,
          textShadow: isDone
            ? `0 0 ${60 + finalGlow * 40}px ${accent}60, 0 0 120px ${accent}30`
            : `0 0 40px ${accent}20`,
          lineHeight: 1,
          transform: `scale(${isDone ? 1.05 + finalGlow * 0.05 : 1})`,
        }}>
          {Math.max(currentVal, to)}
        </div>

        {/* Label below */}
        <div style={{ opacity: labelOp, marginTop: 20 }}>
          <div style={{ fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
            {label}
          </div>
        </div>

        {context && (
          <div style={{ opacity: labelOp, marginTop: 12 }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>{context}</div>
          </div>
        )}
      </div>
    </AnimatedBg>
  );
};
