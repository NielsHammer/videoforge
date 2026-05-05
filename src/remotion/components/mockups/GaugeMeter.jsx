import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * GaugeMeter — speedometer-style dial for a single metric.
 * The needle sweeps from 0 to the target value with satisfying physics.
 * data: { value: 72, max: 100, label: "Risk Score", zones: [{pct:33,color:"#22c55e"},{pct:66,color:"#eab308"},{pct:100,color:"#ef4444"}] }
 */
export const GaugeMeter = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const val = Number(data.value ?? 50);
  const max = Number(data.max ?? 100);
  const label = data.label || "";
  const unit = data.unit || "";
  const zones = data.zones || [
    { pct: 33, color: "#22c55e" },
    { pct: 66, color: "#eab308" },
    { pct: 100, color: "#ef4444" },
  ];

  const pct = Math.min(val / max, 1);
  const sweepAngle = interpolate(clipFrame, [fps * 0.3, fps * 1.8], [0, pct * 180], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const valOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = springIn(clipFrame, fps, 0.1);

  const cx = 960, cy = 620, r = 320;

  // Build arc segments
  const arcs = zones.map((z, i) => {
    const startPct = i === 0 ? 0 : zones[i - 1].pct / 100;
    const endPct = z.pct / 100;
    const startAngle = Math.PI + startPct * Math.PI;
    const endAngle = Math.PI + endPct * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endPct - startPct > 0.5 ? 1 : 0;
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}" stroke="${z.color}" stroke-width="36" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  });

  // Needle
  const needleAngle = Math.PI + (sweepAngle / 180) * Math.PI;
  const nx = cx + (r - 40) * Math.cos(needleAngle);
  const ny = cy + (r - 40) * Math.sin(needleAngle);

  // Current zone color
  const currentZone = zones.find(z => (val / max) * 100 <= z.pct) || zones[zones.length - 1];

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="glow"><feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {/* Zone arcs */}
          <g dangerouslySetInnerHTML={{ __html: arcs.join("") }} />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const a = Math.PI + t * Math.PI;
            const x1b = cx + (r + 24) * Math.cos(a);
            const y1b = cy + (r + 24) * Math.sin(a);
            const x2b = cx + (r + 40) * Math.cos(a);
            const y2b = cy + (r + 40) * Math.sin(a);
            return <line key={i} x1={x1b} y1={y1b} x2={x2b} y2={y2b} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />;
          })}
          {/* Needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={4} strokeLinecap="round" filter="url(#glow)" />
          <circle cx={cx} cy={cy} r={12} fill={currentZone.color} stroke="#fff" strokeWidth={3} />
        </svg>
        {/* Value display */}
        <div style={{ position: "absolute", top: cy - 30, textAlign: "center", opacity: valOp }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: currentZone.color, fontFamily: "Inter, sans-serif", textShadow: `0 0 40px ${currentZone.color}60` }}>
            {unit}{Math.round(interpolate(clipFrame, [fps * 0.3, fps * 1.8], [0, val], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
          </div>
        </div>
        <div style={{ position: "absolute", top: cy + 80, textAlign: "center", opacity: valOp }}>
          <div style={{ fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontFamily: "Inter, sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>{label}</div>
        </div>
      </div>
    </AnimatedBg>
  );
};
