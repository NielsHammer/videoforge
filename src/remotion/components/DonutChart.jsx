import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * DonutChart v24: Animated donut chart with segments that sweep in.
 * Props via data:
 *   segments: [{ label: "Stocks", value: 60, color: "#4a9eff" }, ...]
 *   title: "Portfolio Allocation"
 *   centerLabel: "100%" (shown in center)
 */
export const DonutChart = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.segments || data.segments.length === 0) return null;

  const segments = data.segments;
  const title = data.title || "";
  const centerLabel = data.centerLabel || "";
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const defaultColors = ["#4a9eff", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#eab308", "#06b6d4", "#ef4444"];

  const progress = interpolate(clipFrame, [fps * 0.2, fps * 1.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const titleOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const centerOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cx = 960;
  const cy = 440;
  const outerR = 220;
  const innerR = 140;

  // Build arc segments
  let startAngle = -Math.PI / 2; // Start from top
  const arcs = segments.map((seg, i) => {
    const sweepAngle = (seg.value / total) * Math.PI * 2 * progress;
    const endAngle = startAngle + sweepAngle;
    const color = seg.color || defaultColors[i % defaultColors.length];

    const x1Outer = cx + outerR * Math.cos(startAngle);
    const y1Outer = cy + outerR * Math.sin(startAngle);
    const x2Outer = cx + outerR * Math.cos(endAngle);
    const y2Outer = cy + outerR * Math.sin(endAngle);
    const x1Inner = cx + innerR * Math.cos(endAngle);
    const y1Inner = cy + innerR * Math.sin(endAngle);
    const x2Inner = cx + innerR * Math.cos(startAngle);
    const y2Inner = cy + innerR * Math.sin(startAngle);

    const largeArc = sweepAngle > Math.PI ? 1 : 0;

    const d = sweepAngle > 0.01
      ? `M ${x1Outer} ${y1Outer} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z`
      : "";

    // Label position at midpoint of arc
    const midAngle = startAngle + sweepAngle / 2;
    const labelR = outerR + 40;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);

    const result = { d, color, label: seg.label, value: seg.value, lx, ly, midAngle };
    startAngle = endAngle;
    return result;
  });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Title */}
      {title && (
        <div style={{ position: "absolute", top: 60, fontSize: 34, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3 }}>
          {title}
        </div>
      )}

      <svg width="1920" height="880" viewBox="0 0 1920 880">
        <defs>
          <filter id="donutGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Segments */}
        {arcs.map((arc, i) => arc.d ? (
          <path key={i} d={arc.d} fill={arc.color} opacity={0.9} filter="url(#donutGlow)" />
        ) : null)}

        {/* Segment labels */}
        {arcs.map((arc, i) => {
          const labelOp = interpolate(clipFrame, [fps * 0.8 + i * fps * 0.1, fps * 1.2 + i * fps * 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const pct = total > 0 ? Math.round((arc.value / total) * 100) : 0;
          return pct >= 5 ? (
            <g key={i} opacity={labelOp}>
              <text x={arc.lx} y={arc.ly - 8} textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Arial Black, Arial, sans-serif">{pct}%</text>
              <text x={arc.lx} y={arc.ly + 16} textAnchor="middle" fill="#ffffffcc" fontSize="20" fontFamily="Arial Black, Arial, sans-serif">{arc.label}</text>
            </g>
          ) : null;
        })}

        {/* Center label */}
        <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize="42" fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" opacity={centerOp}>
          {centerLabel}
        </text>
      </svg>

      {/* Legend below chart */}
      <div style={{ position: "absolute", bottom: 80, display: "flex", gap: 30, opacity: centerOp }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: seg.color || defaultColors[i % defaultColors.length] }} />
            <span style={{ fontSize: 18, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffffdd" }}>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
