import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const SplitComparison = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const left = data.left || {};
  const right = data.right || {};
  const stats = data.stats || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const leftSlide = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [-100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const rightSlide = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sideOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  const leftColor = left.color || "#4488ff";
  const rightColor = right.color || "#ff6644";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", gap: 30, alignItems: "stretch", width: "85%", maxWidth: 1100, opacity: sideOp }}>
        {/* Left side */}
        <div style={{
          flex: 1, background: `${leftColor}08`, border: `2px solid ${leftColor}33`, borderRadius: 20,
          padding: "30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          transform: `translateX(${leftSlide}px)`,
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: leftColor, fontFamily: "'Arial Black', Arial, sans-serif" }}>
            {left.name || "Option A"}
          </div>
          {/* Stats */}
          {stats.map((stat, i) => {
            const delay = i * 0.08;
            const statOp = interpolate(clipFrame, [fps * (0.35 + delay), fps * (0.5 + delay)], [0, 1], { extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.50)", opacity: statOp }}>
                <span style={{ fontSize: 15, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>{stat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: leftColor, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {stat.left_value}{stat.suffix || ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* VS divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif",
          }}>
            VS
          </div>
        </div>

        {/* Right side */}
        <div style={{
          flex: 1, background: `${rightColor}08`, border: `2px solid ${rightColor}33`, borderRadius: 20,
          padding: "30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          transform: `translateX(${rightSlide}px)`,
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: rightColor, fontFamily: "'Arial Black', Arial, sans-serif" }}>
            {right.name || "Option B"}
          </div>
          {stats.map((stat, i) => {
            const delay = i * 0.08;
            const statOp = interpolate(clipFrame, [fps * (0.35 + delay), fps * (0.5 + delay)], [0, 1], { extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.50)", opacity: statOp }}>
                <span style={{ fontSize: 15, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>{stat.label}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: rightColor, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {stat.right_value}{stat.suffix || ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
