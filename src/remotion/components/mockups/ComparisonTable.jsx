import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * ComparisonTable — elegant 2-column comparison with rows appearing one by one.
 * data: { left_title: "Budget", right_title: "Premium", rows: [{ feature: "Hotel", left: "$30/night", right: "$180/night" }], winner: "left|right|none" }
 */
export const ComparisonTable = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const leftTitle = data.left_title || "Option A";
  const rightTitle = data.right_title || "Option B";
  const rows = (data.rows || []).slice(0, 6);
  const winner = data.winner || "none";
  const accent = data.accent || "#4a9eff";

  const headerOp = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = springIn(clipFrame, fps, 0.05);

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        <div style={{ width: 1200, background: "rgba(255,255,255,0.04)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
          {/* Header */}
          <div style={{ display: "flex", opacity: headerOp }}>
            <div style={{ flex: 1, padding: "28px 40px", background: winner === "left" ? `${accent}15` : "transparent" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: winner === "left" ? accent : "#fff", fontFamily: "Inter, sans-serif", textAlign: "center" }}>{leftTitle}</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
            <div style={{ flex: 1, padding: "28px 40px", background: winner === "right" ? `${accent}15` : "transparent" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: winner === "right" ? accent : "#fff", fontFamily: "Inter, sans-serif", textAlign: "center" }}>{rightTitle}</div>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => {
            const delay = 0.4 + i * 0.18;
            const rowOp = interpolate(clipFrame, [fps * delay, fps * (delay + 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const rowY = interpolate(clipFrame, [fps * delay, fps * (delay + 0.3)], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

            return (
              <div key={i} style={{ opacity: rowOp, transform: `translateY(${rowY}px)` }}>
                {/* Feature label */}
                {row.feature && (
                  <div style={{ textAlign: "center", padding: "14px 0 4px", fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
                    {row.feature}
                  </div>
                )}
                <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ flex: 1, padding: "20px 40px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "Inter, sans-serif" }}>{row.left}</div>
                  </div>
                  <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ flex: 1, padding: "20px 40px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "Inter, sans-serif" }}>{row.right}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedBg>
  );
};
