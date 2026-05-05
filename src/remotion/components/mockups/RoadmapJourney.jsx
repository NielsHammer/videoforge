import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * RoadmapJourney — a horizontal path with waypoints that light up in sequence.
 * data: { title: "optional", steps: [{ label: "Arrive", icon: "✈️", detail: "optional" }], current: 2 }
 */
export const RoadmapJourney = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const steps = (data.steps || []).slice(0, 6);
  const current = data.current ?? steps.length; // how many are "done"
  const n = steps.length;
  const accent = "#4a9eff";

  const titleOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Positions
  const startX = 200;
  const endX = 1720;
  const cy = 520;
  const stepW = n > 1 ? (endX - startX) / (n - 1) : 0;

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0 }}>
        {title && (
          <div style={{ position: "absolute", top: 100, width: "100%", textAlign: "center", opacity: titleOp }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</div>
          </div>
        )}

        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          {/* Track line (background) */}
          <line x1={startX} y1={cy} x2={endX} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth={4} strokeLinecap="round" />

          {/* Active track line */}
          {n > 1 && (() => {
            const activeEnd = startX + (Math.min(current, n) - 1) * stepW;
            const lineProgress = interpolate(clipFrame, [fps * 0.3, fps * (0.3 + n * 0.25)], [startX, activeEnd], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
            });
            return <line x1={startX} y1={cy} x2={lineProgress} y2={cy} stroke={accent} strokeWidth={4} strokeLinecap="round" />;
          })()}

          {/* Waypoints */}
          {steps.map((step, i) => {
            const x = startX + i * stepW;
            const delay = 0.3 + i * 0.25;
            const dotScale = interpolate(clipFrame, [fps * delay, fps * (delay + 0.25)], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)),
            });
            const isActive = i < current;

            return (
              <g key={i} transform={`translate(${x}, ${cy})`}>
                <circle r={20 * dotScale} fill={isActive ? accent : "rgba(255,255,255,0.1)"} stroke={isActive ? accent : "rgba(255,255,255,0.2)"} strokeWidth={2} />
                {isActive && <circle r={30 * dotScale} fill="none" stroke={accent} strokeWidth={1} opacity={0.3} />}
              </g>
            );
          })}
        </svg>

        {/* Labels below dots */}
        {steps.map((step, i) => {
          const x = startX + i * stepW;
          const delay = 0.35 + i * 0.25;
          const labelOp = interpolate(clipFrame, [fps * delay, fps * (delay + 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isActive = i < current;

          return (
            <div key={i} style={{
              position: "absolute",
              left: x - 100, top: cy + 50, width: 200,
              textAlign: "center", opacity: labelOp,
            }}>
              {step.icon && <div style={{ fontSize: 36, marginBottom: 6 }}>{step.icon}</div>}
              <div style={{ fontSize: 22, fontWeight: 600, color: isActive ? "#fff" : "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>{step.label}</div>
              {step.detail && <div style={{ fontSize: 16, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif", marginTop: 4 }}>{step.detail}</div>}
            </div>
          );
        })}
      </div>
    </AnimatedBg>
  );
};
