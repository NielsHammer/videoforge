import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// StackedBar — Shows composition/breakdown as a stacked horizontal bar
// data: { title: "Where Your Money Goes", segments: [{label:"Housing", value:35, color:"#ef4444"},{label:"Food",value:15,color:"#f97316"},{label:"Transport",value:12,color:"#eab308"},{label:"Savings",value:5,color:"#22c55e"}] }
// USE WHEN: narrator breaks down a whole into parts (budget, time allocation, portfolio breakdown)
export const StackedBar = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.segments?.length) return null;

  const segments = data.segments.slice(0, 6);
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 100;
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const barProgress = interpolate(clipFrame, [fps * 0.3, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 80px", gap: 24 }}>
      {data.title && (
        <div style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp }}>{data.title}</div>
      )}
      {/* Stacked bar */}
      <div style={{ display: "flex", height: 52, borderRadius: 10, overflow: "hidden", width: "100%" }}>
        {segments.map((seg, i) => {
          const width = ((seg.value / total) * 100 * barProgress).toFixed(1);
          return (
            <div key={i} style={{ width: `${width}%`, background: seg.color || accent, display: "flex", alignItems: "center", justifyContent: "center", transition: "none", minWidth: width > 8 ? "auto" : 0 }}>
              {parseFloat(width) > 8 && <div style={{ fontSize: 14, fontWeight: 800, color: "white", fontFamily: "Arial, sans-serif" }}>{Math.round(seg.value)}%</div>}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {segments.map((seg, i) => {
          const legOp = interpolate(clipFrame, [fps * (0.6 + i * 0.1), fps * (0.9 + i * 0.1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: legOp }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color || accent, flexShrink: 0 }} />
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", fontFamily: "Arial, sans-serif" }}>{seg.label} <span style={{ color: "rgba(255,255,255,0.4)" }}>{seg.value}%</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
