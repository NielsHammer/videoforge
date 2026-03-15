import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// WealthLadder — Ladder/tier visualization of wealth levels
// data: { title: "The Wealth Ladder", rungs: [{label:"Broke",desc:"Living paycheck to paycheck",pct:40},{label:"Surviving",desc:"$1K-$10K saved",pct:30},{label:"Stable",desc:"3-6 month emergency fund",pct:20},{label:"Wealthy",desc:"Assets generating income",pct:8},{label:"Rich",desc:"$1M+ net worth",pct:2}] }
// USE WHEN: narrator describes wealth tiers, levels, or how most people are stuck at the bottom
export const WealthLadder = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.rungs?.length) return null;

  const rungs = [...data.rungs].reverse().slice(0, 5); // top rung first
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  const colors = [accent, "#22c55e", "#f59e0b", "#f97316", "#ef4444"];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 70px", gap: 12 }}>
      {data.title && (
        <div style={{ fontSize: 18, fontWeight: 700, color: accent, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp, marginBottom: 4 }}>
          {data.title}
        </div>
      )}
      {rungs.map((rung, i) => {
        const actualIdx = rungs.length - 1 - i;
        const delay = fps * (0.2 + actualIdx * 0.12);
        const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(clipFrame, [delay, delay + fps * 0.3], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const color = colors[i % colors.length];
        const barW = `${Math.max((rung.pct || 0) * 2.5, 8)}%`;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: op, transform: `translateX(${x}px)` }}>
            {/* Rung indicator */}
            <div style={{ width: 4, height: 40, background: color, borderRadius: 2, flexShrink: 0, boxShadow: `0 0 10px ${color}60` }} />
            {/* Bar + label */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "white", fontFamily: "Arial Black, Arial, sans-serif" }}>{rung.label}</div>
                <div style={{ fontSize: 14, color: color, fontWeight: 700, fontFamily: "Arial, sans-serif" }}>{rung.pct}%</div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: barW, height: "100%", background: color, borderRadius: 3 }} />
              </div>
              {rung.desc && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", marginTop: 3 }}>{rung.desc}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
