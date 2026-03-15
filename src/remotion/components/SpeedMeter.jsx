import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// SpeedMeter — Speedometer/gauge style for rating or speed concepts
// data: { value: 73, max: 100, label: "Wealth Growth Rate", unit: "%", zone: "danger" }
// USE WHEN: narrator rates something on a scale, describes speed/pace/rate of something
export const SpeedMeter = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (data?.value === undefined) return null;

  const max = data.max || 100;
  const targetPct = Math.min(data.value / max, 1);
  const needleAngle = interpolate(clipFrame, [fps * 0.2, fps * 0.9], [-130, -130 + (260 * targetPct)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const zoneColor = data.zone === "danger" ? "#ef4444" : data.zone === "good" ? "#22c55e" : accent;
  const cx = 300, cy = 220, r = 160;

  const arcPath = (startAngle, endAngle, color, strokeW = 12) => {
    const toRad = (d) => (d - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} stroke={color} strokeWidth={strokeW} fill="none" strokeLinecap="round" />;
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <svg width={600} height={320} style={{ overflow: "visible" }}>
        {/* Background arc */}
        {arcPath(-40, 220, "rgba(255,255,255,0.08)", 14)}
        {/* Value arc */}
        {arcPath(-40, -40 + (260 * targetPct), zoneColor, 14)}
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={cx + (r - 20) * Math.cos((needleAngle - 90) * Math.PI / 180)}
          y2={cy + (r - 20) * Math.sin((needleAngle - 90) * Math.PI / 180)}
          stroke="white" strokeWidth={4} strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={10} fill={zoneColor} />
        {/* Value text */}
        <text x={cx} y={cy + 50} textAnchor="middle" fontSize={52} fontWeight={900} fill="white" fontFamily="Arial Black, Arial, sans-serif">
          {data.value}{data.unit || ""}
        </text>
      </svg>
      {data.label && (
        <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 3, fontFamily: "Arial, sans-serif", opacity: labelOp, marginTop: -20 }}>
          {data.label}
        </div>
      )}
    </div>
  );
};
