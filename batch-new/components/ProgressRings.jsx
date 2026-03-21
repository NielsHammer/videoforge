import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { rings: [{value: 75, label: "MOVE", color: "red"}, {value: 60, label: "EXERCISE", color: "green"}, {value: 90, label: "STAND", color: "accent"}] }
export const ProgressRings = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.rings?.length) return null;

  const rings = data.rings.slice(0, 3);
  const colorMap = { red: "#ef4444", green: "#22c55e", accent, gold: "#f59e0b", blue: "#3b82f6" };

  const ringProgress = interpolate(clipFrame, [fps * 0.2, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const sizes = [200, 150, 100];
  const strokeWidths = [18, 16, 14];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 230, height: 230 }}>
        {rings.map((ring, i) => {
          const size = sizes[i];
          const sw = strokeWidths[i];
          const color = colorMap[ring.color] || accent;
          const r = (size - sw) / 2;
          const circumference = 2 * Math.PI * r;
          const progress = Math.min(ring.value / 100, 1) * ringProgress;
          const offset = circumference * (1 - progress);
          const offset0 = circumference;
          const center = 115;

          return (
            <svg key={i} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 230 230">
              {/* Track */}
              <circle cx={center} cy={center} r={r} fill="none" stroke={`${color}20`} strokeWidth={sw} />
              {/* Progress */}
              <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${center} ${center})`} style={{ filter: `drop-shadow(0 0 8px ${color}80)` }} />
              {/* End cap glow */}
              {progress > 0 && (
                <circle cx={center + r * Math.cos((2 * Math.PI * progress) - Math.PI / 2)} cy={center + r * Math.sin((2 * Math.PI * progress) - Math.PI / 2)} r={sw / 2} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
              )}
            </svg>
          );
        })}
      </div>
      {/* Ring labels */}
      <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 16, opacity: labelOp }}>
        {rings.map((ring, i) => {
          const color = colorMap[ring.color] || accent;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "Arial Black, Arial, sans-serif" }}>{ring.value}%</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>{ring.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// ENTERTAINMENT / SPORTS
// ═══════════════════════════════════════════════

// CountdownReveal — Top 10 countdown style. Number slides in dramatically.
// data: { number: 3, title: "The Richest Person in History", context: "With $400B adjusted for inflation" }
