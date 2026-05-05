import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * ScaleBalance — two items being weighed on a balance scale.
 * The heavier side tilts down with satisfying physics.
 * data: { left: { label: "Cost", value: "$4,200" }, right: { label: "Experience", value: "Priceless" }, winner: "left|right|balanced" }
 */
export const ScaleBalance = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const left = data.left || { label: "A", value: "" };
  const right = data.right || { label: "B", value: "" };
  const winner = data.winner || "balanced";

  const tiltTarget = winner === "left" ? -12 : winner === "right" ? 12 : 0;
  const tilt = interpolate(clipFrame, [fps * 0.5, fps * 1.5], [0, tiltTarget], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)),
  });
  const scale = springIn(clipFrame, fps, 0.1);
  const labelOp = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const valueOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cx = 960, cy = 480;
  const beamW = 600;
  const accent = "#4a9eff";

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080">
          {/* Fulcrum */}
          <polygon points={`${cx},${cy + 30} ${cx - 40},${cy + 90} ${cx + 40},${cy + 90}`} fill="rgba(255,255,255,0.15)" />
          <line x1={cx} y1={cy + 90} x2={cx} y2={cy + 160} stroke="rgba(255,255,255,0.1)" strokeWidth={4} />

          {/* Beam */}
          <g transform={`rotate(${tilt}, ${cx}, ${cy})`}>
            <line x1={cx - beamW} y1={cy} x2={cx + beamW} y2={cy} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeLinecap="round" />

            {/* Left pan */}
            <line x1={cx - beamW} y1={cy} x2={cx - beamW - 60} y2={cy + 80} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
            <line x1={cx - beamW} y1={cy} x2={cx - beamW + 60} y2={cy + 80} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
            <ellipse cx={cx - beamW} cy={cy + 85} rx={80} ry={16} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />

            {/* Right pan */}
            <line x1={cx + beamW} y1={cy} x2={cx + beamW - 60} y2={cy + 80} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
            <line x1={cx + beamW} y1={cy} x2={cx + beamW + 60} y2={cy + 80} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
            <ellipse cx={cx + beamW} cy={cy + 85} rx={80} ry={16} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
          </g>
        </svg>

        {/* Labels positioned above the pans */}
        <div style={{ position: "absolute", left: cx - beamW - 200, top: cy - 160, width: 400, textAlign: "center", opacity: labelOp }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: winner === "left" ? accent : "#fff", fontFamily: "Inter, sans-serif" }}>{left.label}</div>
          <div style={{ fontSize: 42, fontWeight: 800, color: winner === "left" ? accent : "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif", marginTop: 8, opacity: valueOp }}>
            {left.value}
          </div>
        </div>
        <div style={{ position: "absolute", left: cx + beamW - 200, top: cy - 160, width: 400, textAlign: "center", opacity: labelOp }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: winner === "right" ? accent : "#fff", fontFamily: "Inter, sans-serif" }}>{right.label}</div>
          <div style={{ fontSize: 42, fontWeight: 800, color: winner === "right" ? accent : "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif", marginTop: 8, opacity: valueOp }}>
            {right.value}
          </div>
        </div>
      </div>
    </AnimatedBg>
  );
};
