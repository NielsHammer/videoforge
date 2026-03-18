import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const PortfolioBreakdown = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "Portfolio Allocation";
  const total = data.total || "";
  const allocations = data.allocations || [
    { label: "Stocks", pct: 60, color: "#3b82f6" },
    { label: "Bonds", pct: 20, color: "#22c55e" },
    { label: "Real Estate", pct: 15, color: "#f59e0b" },
    { label: "Cash", pct: 5, color: "#64748b" },
  ];

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  // Build SVG pie chart
  const radius = 100;
  const cx = 130, cy = 130;
  let currentAngle = -90; // start from top

  const slices = allocations.map((a, i) => {
    const delay = fps * (0.2 + i * 0.15);
    const sweepProgress = interpolate(clipFrame, [delay, delay + fps * 0.5], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    const startAngle = currentAngle;
    const fullSweep = (a.pct / 100) * 360;
    const sweep = fullSweep * sweepProgress;
    currentAngle += fullSweep;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweep) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = sweep > 180 ? 1 : 0;

    const path = sweep > 0.1
      ? `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
      : "";

    return { ...a, path, delay };
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, gap: 60,
    }}>
      {/* Pie chart */}
      <div style={{ position: "relative" }}>
        <svg width="260" height="260">
          {slices.map((s, i) => s.path && (
            <path key={i} d={s.path} fill={s.color}
              style={{ filter: `drop-shadow(0 0 6px ${s.color}66)` }} />
          ))}
          {/* Center hole */}
          <circle cx={cx} cy={cy} r={50} fill={bg} />
          {total && (
            <>
              <text x={cx} y={cy - 6} textAnchor="middle"
                style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 18, fill: "#fff" }}>
                {total}
              </text>
              <text x={cx} y={cy + 14} textAnchor="middle"
                style={{ fontFamily: "sans-serif", fontSize: 11, fill: "rgba(255,255,255,0.4)" }}>
                total
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 800,
          fontSize: 20, color: accent,
          textTransform: "uppercase", letterSpacing: 3,
          marginBottom: 8,
        }}>{title}</div>
        {allocations.map((a, i) => {
          const op = interpolate(clipFrame, [fps * (0.3 + i * 0.15), fps * (0.5 + i * 0.15)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: op }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: a.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "sans-serif", fontSize: 18, color: "rgba(255,255,255,0.85)", flex: 1 }}>
                {a.label}
              </span>
              <span style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 18, color: a.color }}>
                {a.pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
