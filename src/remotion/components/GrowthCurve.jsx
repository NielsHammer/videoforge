import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const GrowthCurve = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const startVal = data.start_value || 0;
  const endVal = data.end_value || 100;
  const suffix = data.suffix || "";
  const prefix = data.prefix || "$";
  const years = data.years || 30;
  const color = data.color || "#44dd88";
  const label = data.label || "";

  const titleOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const curveProgress = interpolate(clipFrame, [fps * 0.2, fps * 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Generate exponential curve points
  const W = 1000, H = 400;
  const points = [];
  const numPoints = 60;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    if (t > curveProgress) break;
    const x = 100 + t * W;
    const expVal = startVal + (endVal - startVal) * Math.pow(t, 2.2);
    const y = 480 - (expVal / endVal) * H;
    points.push({ x, y, val: expVal });
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath + ` L ${points[points.length - 1]?.x || 100} 480 L 100 480 Z`;

  // Current display value
  const currentVal = startVal + (endVal - startVal) * Math.pow(curveProgress, 2.2);
  const lastPoint = points[points.length - 1];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ position: "relative", width: 1200, height: 550 }}>
        <svg width="1200" height="550" viewBox="0 0 1200 550">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
            <line key={`g${i}`} x1="100" y1={480 - frac * H} x2="1100" y2={480 - frac * H} stroke="#ffffff10" strokeWidth="1" />
          ))}
          {/* X axis */}
          <line x1="100" y1="480" x2="1100" y2="480" stroke="#ffffff20" strokeWidth="1" />

          {/* Gradient fill under curve */}
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {points.length > 1 && <path d={areaPath} fill="url(#curveGrad)" />}

          {/* The curve line */}
          {points.length > 1 && (
            <path d={linePath} fill="none" stroke={color} strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round"
              filter="drop-shadow(0 0 8px rgba(68,221,136,0.4))" />
          )}

          {/* Glowing dot at current position */}
          {lastPoint && (
            <>
              <circle cx={lastPoint.x} cy={lastPoint.y} r="14" fill={`${color}20`} />
              <circle cx={lastPoint.x} cy={lastPoint.y} r="7" fill={color} />
              <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill="#ffffff" />
            </>
          )}
        </svg>

        {/* Value callout at current position */}
        {lastPoint && (
          <div style={{
            position: "absolute", left: lastPoint.x - 80, top: lastPoint.y - 65,
            background: "rgba(0,0,0,0.85)", border: `2px solid ${color}`, borderRadius: 14,
            padding: "8px 18px", boxShadow: `0 0 20px ${color}30`,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ fontSize: 26, fontWeight: 900, color, fontFamily: "'Arial Black', Arial, sans-serif" }}>
              {prefix}{Math.round(currentVal).toLocaleString()}{suffix}
            </div>
            {label && <div style={{ fontSize: 19, color: "#ffffffdd", fontFamily: "'Arial Black', Arial, sans-serif" }}>{label}</div>}
          </div>
        )}

        {/* Year labels */}
        <div style={{ position: "absolute", bottom: 20, left: 100, right: 100, display: "flex", justifyContent: "space-between" }}>
          {[0, Math.round(years * 0.25), Math.round(years * 0.5), Math.round(years * 0.75), years].map((yr, i) => (
            <div key={i} style={{ fontSize: 18, fontWeight: 700, color: "#ffffffcc", fontFamily: "'Arial Black', Arial, sans-serif" }}>Year {yr}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
