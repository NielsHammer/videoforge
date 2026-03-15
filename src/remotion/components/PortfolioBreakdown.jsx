import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// PortfolioBreakdown — Investment portfolio allocation breakdown
// data: { title: "Millionaire Portfolio", total: "$2.4M", allocations: [{label:"Stocks",pct:60,color:"#22c55e"},{label:"Real Estate",pct:25,color:"#3b82f6"},{label:"Bonds",pct:10,color:"#f59e0b"},{label:"Cash",pct:5,color:"#6b7280"}] }
// USE WHEN: narrator describes how wealthy people allocate investments or breaks down a financial portfolio
export const PortfolioBreakdown = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.allocations?.length) return null;

  const allocs = data.allocations.slice(0, 6);
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 70px", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: titleOp, marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>{data.title || "Portfolio"}</div>
        {data.total && <div style={{ fontSize: 28, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif" }}>{data.total}</div>}
      </div>

      {/* Bar rows */}
      {allocs.map((alloc, i) => {
        const delay = fps * (0.2 + i * 0.15);
        const barW = interpolate(clipFrame, [delay, delay + fps * 0.5], [0, alloc.pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const rowOp = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const color = alloc.color || accent;
        return (
          <div key={i} style={{ opacity: rowOp }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
                <div style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: "Arial, sans-serif" }}>{alloc.label}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: color, fontFamily: "Arial Black, Arial, sans-serif" }}>{Math.round(barW)}%</div>
            </div>
            <div style={{ height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${barW}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 6, boxShadow: `0 0 12px ${color}40` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
