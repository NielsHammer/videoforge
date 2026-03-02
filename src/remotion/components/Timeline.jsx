import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * Timeline v24: Horizontal timeline with events that appear sequentially.
 * Props via data:
 *   events: [{ year: "2020", label: "Started investing", color: "#4a9eff" }, ...]
 *   title: "Investment Journey"
 */
export const Timeline = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.events || data.events.length < 2) return null;

  const events = data.events.slice(0, 6);
  const title = data.title || "";
  const titleOp = interpolate(clipFrame, [fps * 0.05, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const defaultColors = ["#4a9eff", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#eab308"];

  const lineX1 = 200;
  const lineX2 = 1720;
  const lineY = 440;
  const spacing = (lineX2 - lineX1) / (events.length - 1);

  // Line draws left to right
  const lineProgress = interpolate(clipFrame, [fps * 0.2, fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Title */}
      {title && (
        <div style={{ position: "absolute", top: 80, fontSize: 34, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3 }}>
          {title}
        </div>
      )}

      <svg width="1920" height="880" viewBox="0 0 1920 880">
        {/* Background line (dim) */}
        <line x1={lineX1} y1={lineY} x2={lineX2} y2={lineY} stroke="rgba(255,255,255,0.08)" strokeWidth="3" />

        {/* Animated line */}
        <line x1={lineX1} y1={lineY} x2={lineX1 + (lineX2 - lineX1) * lineProgress} y2={lineY} stroke="#4a9eff" strokeWidth="3" />

        {/* Events */}
        {events.map((ev, i) => {
          const ex = lineX1 + i * spacing;
          const delay = fps * 0.3 + i * fps * 0.25;
          const evProgress = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)),
          });
          const evOp = interpolate(clipFrame, [delay, delay + fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const color = ev.color || defaultColors[i % defaultColors.length];
          const isAbove = i % 2 === 0;

          return (
            <g key={i} opacity={evOp}>
              {/* Dot on line */}
              <circle cx={ex} cy={lineY} r={10 * evProgress} fill={color} />
              <circle cx={ex} cy={lineY} r={16 * evProgress} fill="none" stroke={color} strokeWidth="2" opacity="0.4" />

              {/* Connector line */}
              <line x1={ex} y1={lineY} x2={ex} y2={isAbove ? lineY - 70 * evProgress : lineY + 70 * evProgress} stroke={`${color}60`} strokeWidth="1.5" />

              {/* Year label */}
              <text x={ex} y={isAbove ? lineY - 85 : lineY + 95} textAnchor="middle" fill={color} fontSize="26" fontWeight="800" fontFamily="Arial Black, Arial, sans-serif">
                {ev.year}
              </text>

              {/* Description */}
              <text x={ex} y={isAbove ? lineY - 115 : lineY + 125} textAnchor="middle" fill="#ffffffcc" fontSize="22" fontWeight="700" fontFamily="Arial Black, Arial, sans-serif">
                {(ev.label || "").length > 25 ? ev.label.slice(0, 25) + "..." : ev.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
