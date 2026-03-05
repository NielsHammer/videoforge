import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * AnimatedLineChart v24: Draws an animated line chart that reveals left-to-right.
 * Props via data:
 *   points: [{ label: "2020", value: 10 }, ...] (3-8 points)
 *   title: "Revenue Growth"
 *   suffix: "%" or "$" etc
 *   color: accent color (optional, defaults to theme)
 */
export const AnimatedLineChart = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.points || data.points.length < 2) return null;

  const points = data.points;
  const title = data.title || "";
  const suffix = data.suffix || "";
  const prefix = data.prefix || "";
  const color = data.color || "#4a9eff";

  const maxVal = Math.max(...points.map(p => p.value));
  const minVal = Math.min(...points.map(p => p.value));
  const range = maxVal - minVal || 1;

  // Chart dimensions
  const chartX = 200;
  const chartY = 120;
  const chartW = 1520;
  const chartH = 600;

  // Animation progress
  const drawProgress = interpolate(clipFrame, [fps * 0.3, fps * 2.0], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const titleOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gridOp = interpolate(clipFrame, [fps * 0.05, fps * 0.25], [0, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Calculate point positions
  const coords = points.map((p, i) => ({
    x: chartX + (i / (points.length - 1)) * chartW,
    y: chartY + chartH - ((p.value - minVal) / range) * chartH,
    label: p.label,
    value: p.value,
  }));

  // Build SVG path
  const visibleCount = Math.floor(drawProgress * coords.length) + 1;
  const visibleCoords = coords.slice(0, Math.min(visibleCount, coords.length));
  
  let pathD = "";
  if (visibleCoords.length > 0) {
    pathD = `M ${visibleCoords[0].x} ${visibleCoords[0].y}`;
    for (let i = 1; i < visibleCoords.length; i++) {
      const prev = visibleCoords[i - 1];
      const curr = visibleCoords[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      pathD += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  // Fill area path
  const fillD = visibleCoords.length > 1
    ? `${pathD} L ${visibleCoords[visibleCoords.length - 1].x} ${chartY + chartH} L ${visibleCoords[0].x} ${chartY + chartH} Z`
    : "";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Title */}
      {title && (
        <div style={{ position: "absolute", top: 60, fontSize: 36, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3 }}>
          {title}
        </div>
      )}

      <svg width="1920" height="880" viewBox="0 0 1920 880" style={{ position: "absolute", top: 100 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line key={i} x1={chartX} y1={chartY + chartH * (1 - pct)} x2={chartX + chartW} y2={chartY + chartH * (1 - pct)}
            stroke="white" strokeWidth="1" opacity={gridOp} />
        ))}

        {/* Gradient fill under line */}
        <defs>
          <linearGradient id="lineChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {fillD && <path d={fillD} fill="url(#lineChartFill)" />}

        {/* Main line */}
        {pathD && <path d={pathD} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" filter="url(#lineGlow)" />}

        {/* Data points */}
        {visibleCoords.map((c, i) => {
          const pointOp = interpolate(clipFrame, [fps * 0.3 + i * fps * 0.15, fps * 0.5 + i * fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <g key={i} opacity={pointOp}>
              <circle cx={c.x} cy={c.y} r="8" fill={color} stroke="white" strokeWidth="2" />
              <text x={c.x} y={c.y - 20} textAnchor="middle" fill="white" fontSize="26" fontWeight="800" fontFamily="Arial Black, Arial, sans-serif">
                {prefix}{typeof c.value === "number" ? c.value.toLocaleString() : c.value}{suffix}
              </text>
              <text x={c.x} y={chartY + chartH + 35} textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="700" fontFamily="Arial Black, Arial, sans-serif">
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
