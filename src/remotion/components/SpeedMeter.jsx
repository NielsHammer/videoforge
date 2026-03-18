import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const SpeedMeter = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const value = data.value || 73;
  const max = data.max || 100;
  const label = data.label || "Risk Level";
  const unit = data.unit || "%";
  const zone = data.zone || "warning"; // safe | warning | danger

  const zoneColors = {
    safe: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
  };
  const color = zoneColors[zone] || accent;

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  // Animate needle sweep — 0 to value
  const animValue = interpolate(clipFrame, [fps * 0.3, fps * 1.2], [0, value], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const pct = animValue / max;
  // Sweep from -135deg to +135deg (270deg total arc)
  const startAngle = -135;
  const totalArc = 270;
  const needleAngle = startAngle + pct * totalArc;

  const cx = 160, cy = 160, r = 120;
  const toRad = (deg) => (deg * Math.PI) / 180;

  // Arc path
  const arcStart = { x: cx + r * Math.cos(toRad(startAngle)), y: cy + r * Math.sin(toRad(startAngle)) };
  const arcEnd = { x: cx + r * Math.cos(toRad(startAngle + totalArc)), y: cy + r * Math.sin(toRad(startAngle + totalArc)) };
  const arcFillEnd = { x: cx + r * Math.cos(toRad(startAngle + pct * totalArc)), y: cy + r * Math.sin(toRad(startAngle + pct * totalArc)) };

  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn,
    }}>
      <div style={{ position: "relative" }}>
        <svg width="320" height="220" viewBox="0 0 320 220">
          {/* Track arc */}
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round"
          />
          {/* Filled arc */}
          {pct > 0.01 && (
            <path
              d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${pct * totalArc > 180 ? 1 : 0} 1 ${arcFillEnd.x} ${arcFillEnd.y}`}
              fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
            />
          )}
          {/* Needle */}
          <line
            x1={cx} y1={cy}
            x2={cx + (r - 20) * Math.cos(toRad(needleAngle))}
            y2={cy + (r - 20) * Math.sin(toRad(needleAngle))}
            stroke="#ffffff" strokeWidth="3" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }}
          />
          {/* Center dot */}
          <circle cx={cx} cy={cy} r="8" fill={color}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
          {/* Value text */}
          <text x={cx} y={cy + 40} textAnchor="middle"
            style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 42, fill: color }}>
            {Math.round(animValue)}{unit}
          </text>
        </svg>
      </div>

      <div style={{
        opacity: labelOp, textAlign: "center",
        fontFamily: "sans-serif", fontWeight: 700,
        fontSize: 22, color: "rgba(255,255,255,0.8)",
        textTransform: "uppercase", letterSpacing: 3,
        marginTop: 8,
      }}>{label}</div>

      <div style={{
        opacity: labelOp, marginTop: 12,
        display: "flex", gap: 24,
      }}>
        {["safe", "warning", "danger"].map((z) => (
          <div key={z} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: zoneColors[z], opacity: zone === z ? 1 : 0.3 }} />
            <span style={{ fontFamily: "sans-serif", fontSize: 12, color: zone === z ? zoneColors[z] : "rgba(255,255,255,0.3)", textTransform: "capitalize" }}>{z}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
