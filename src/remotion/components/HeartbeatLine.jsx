import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { label: "STRESS LEVELS", value: "CRITICAL", color: "red|green|accent" }
export const HeartbeatLine = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;

  const label = (data.label || "VITALS").toUpperCase();
  const value = (data.value || "").toUpperCase();
  const colorMap = { red: "#ef4444", green: "#22c55e", accent, gold: "#f59e0b" };
  const color = colorMap[data.color] || "#22c55e";

  const lineProgress = interpolate(clipFrame, [0, fps * 1.5], [0, 100], { extrapolateRight: "clamp" });

  // ECG path: flat → spike → flat → spike → flat
  const generateECGPath = (progress) => {
    const w = 1080;
    const h = 160;
    const cy = h / 2;
    const traveled = (progress / 100) * w;

    let d = `M 0 ${cy}`;
    const segments = [
      { x: 100, y: cy },      // flat
      { x: 140, y: cy - 20 }, // small bump
      { x: 160, y: cy },      // flat
      { x: 200, y: cy + 15 }, // dip
      { x: 220, y: cy - 80 }, // main spike up
      { x: 240, y: cy + 40 }, // spike down
      { x: 260, y: cy },      // recovery
      { x: 380, y: cy },      // flat
      { x: 420, y: cy - 20 }, // small bump
      { x: 440, y: cy },
      { x: 480, y: cy + 15 },
      { x: 500, y: cy - 80 },
      { x: 520, y: cy + 40 },
      { x: 540, y: cy },
      { x: 700, y: cy },
      { x: 740, y: cy - 20 },
      { x: 760, y: cy },
      { x: 800, y: cy + 15 },
      { x: 820, y: cy - 80 },
      { x: 840, y: cy + 40 },
      { x: 860, y: cy },
      { x: w, y: cy },
    ];

    for (const seg of segments) {
      if (seg.x <= traveled) d += ` L ${seg.x} ${seg.y}`;
      else { d += ` L ${Math.min(traveled, seg.x)} ${cy}`; break; }
    }

    return d;
  };

  const labelOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const valueOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 6, color: `${color}99`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: labelOp, marginBottom: 16 }}>
          {label}
        </div>
      )}
      <svg width="100%" height="160" viewBox="0 0 1080 160" style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[40, 80, 120].map(y => (
          <line key={y} x1="0" y1={y} x2="1080" y2={y} stroke={`${color}15`} strokeWidth="1" />
        ))}
        {[0, 270, 540, 810, 1080].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="160" stroke={`${color}15`} strokeWidth="1" />
        ))}
        {/* ECG line */}
        <path d={generateECGPath(lineProgress)} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        {/* Glow line */}
        <path d={generateECGPath(lineProgress)} stroke={`${color}40`} strokeWidth="8" fill="none" strokeLinecap="round" />
      </svg>
      {value && (
        <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 4, opacity: valueOp, marginTop: 16, textShadow: `0 0 20px ${color}80` }}>
          {value}
        </div>
      )}
    </div>
  );
};

// ProgressRings — Apple Watch style rings closing. Goals, completion, health metrics.
// data: { rings: [{value: 75, label: "MOVE", color: "red"}, {value: 60, label: "EXERCISE", color: "green"}, {value: 90, label: "STAND", color: "accent"}] }
