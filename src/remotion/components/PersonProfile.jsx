import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// PersonProfile — A card showing a person's key stats or details
// data: { name: "Sarah Martinez", role: "Portland, Oregon", stats: [{label:"Savings", value:"$0"}, {label:"Debt", value:"$23K"}], outcome: "Started investing at 35" }
// USE WHEN: narrator introduces a real person with specific details or statistics
export const PersonProfile = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.name) return null;

  const stats = (data.stats || []).slice(0, 4);
  const cardOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(clipFrame, [0, fps * 0.4], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const outcomeOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px", gap: 16 }}>
      {/* Profile card */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}25`, borderRadius: 20, padding: "28px 32px", opacity: cardOp, transform: `translateY(${cardY}px)` }}>
        {/* Name + role */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif" }}>{data.name}</div>
          {data.role && <div style={{ fontSize: 16, color: accent, fontFamily: "Arial, sans-serif", letterSpacing: 2, marginTop: 4 }}>{data.role}</div>}
        </div>
        {/* Stats grid */}
        {stats.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 2)}, 1fr)`, gap: 12 }}>
            {stats.map((stat, i) => {
              const statOp = interpolate(clipFrame, [fps * (0.3 + i * 0.15), fps * (0.5 + i * 0.15)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 16px", opacity: statOp }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif" }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2, fontFamily: "Arial, sans-serif", marginTop: 4 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Outcome */}
      {data.outcome && (
        <div style={{ fontSize: 20, fontWeight: 600, color: accent, fontFamily: "Arial, sans-serif", textAlign: "center", opacity: outcomeOp, fontStyle: "italic" }}>
          → {data.outcome}
        </div>
      )}
    </div>
  );
};
