import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const StackedBar = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "Budget Breakdown";
  const segments = data.segments || [
    { label: "Housing", value: 35, color: "#ef4444" },
    { label: "Food", value: 15, color: "#f59e0b" },
    { label: "Transport", value: 12, color: "#3b82f6" },
    { label: "Savings", value: 20, color: "#22c55e" },
    { label: "Other", value: 18, color: "#64748b" },
  ];

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [0, fps * 0.25], [-20, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Animate bar fill
  const fillPct = interpolate(clipFrame, [fps * 0.3, fps * 1.0], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, padding: "50px 80px",
    }}>
      <div style={{
        transform: `translateY(${titleY}px)`,
        fontFamily: "sans-serif", fontWeight: 800,
        fontSize: 28, color: accent,
        textTransform: "uppercase", letterSpacing: 4,
        marginBottom: 40,
      }}>{title}</div>

      {/* Stacked bar */}
      <div style={{
        width: "100%", height: 52,
        borderRadius: 12, overflow: "hidden",
        display: "flex", marginBottom: 32,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {segments.map((seg, i) => {
          const segPct = (seg.value / total) * 100;
          const startAt = (cumulative / total) * 100;
          cumulative += seg.value;
          const visibleEnd = Math.min(fillPct, startAt + segPct);
          const visibleW = Math.max(0, visibleEnd - startAt);

          return (
            <div key={i} style={{
              width: `${visibleW}%`,
              background: seg.color,
              transition: "none",
              position: "relative",
              overflow: "hidden",
              boxShadow: `inset -1px 0 0 rgba(0,0,0,0.2)`,
            }}>
              {visibleW > 6 && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "sans-serif", fontWeight: 800,
                  fontSize: 13, color: "rgba(255,255,255,0.9)",
                }}>{seg.value}%</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 28px", justifyContent: "center" }}>
        {segments.map((seg, i) => {
          const lOp = interpolate(clipFrame, [fps * (0.5 + i * 0.1), fps * (0.7 + i * 0.1)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: lOp }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontFamily: "sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
                {seg.label}
              </span>
              <span style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 16, color: seg.color }}>
                {seg.value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
