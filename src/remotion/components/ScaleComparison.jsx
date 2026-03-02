import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const defaultColors = ["#4488ff", "#ff6644", "#44dd88", "#ddaa44", "#dd44aa", "#44dddd"];

export const ScaleComparison = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = data.items || [];
  const suffix = data.suffix || "";
  const mode = data.mode || "circles"; // "circles" or "bars"
  const maxVal = Math.max(...items.map(i => i.value || 0), 1);

  const titleOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const displayItems = items.slice(0, 6);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 40, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", alignItems: mode === "bars" ? "flex-end" : "center", justifyContent: "center", gap: mode === "bars" ? 30 : 20, height: 500 }}>
        {displayItems.map((item, i) => {
          const delay = i * 0.1;
          const scaleProgress = interpolate(clipFrame, [fps * (0.2 + delay), fps * (0.6 + delay)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
          const color = item.color || defaultColors[i % defaultColors.length];
          const ratio = item.value / maxVal;
          const labelOp = interpolate(clipFrame, [fps * (0.35 + delay), fps * (0.5 + delay)], [0, 1], { extrapolateRight: "clamp" });

          if (mode === "bars") {
            const barH = ratio * 380 * scaleProgress;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", opacity: labelOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {Math.round(item.value * scaleProgress).toLocaleString()}{suffix}
                </div>
                <div style={{
                  width: 70, height: barH, borderRadius: "10px 10px 4px 4px",
                  background: `linear-gradient(to top, ${color}66, ${color})`,
                  boxShadow: `0 0 25px ${color}30`,
                }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffffdd", textAlign: "center", width: 90, opacity: labelOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {item.label}
                </div>
              </div>
            );
          }

          // Circles mode
          const maxSize = 200;
          const minSize = 50;
          const size = (minSize + (maxSize - minSize) * ratio) * scaleProgress;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{
                width: size, height: size, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${color}, ${color}66)`,
                boxShadow: `0 0 30px ${color}40, inset 0 -4px 15px rgba(0,0,0,0.3)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${color}88`,
              }}>
                <div style={{ fontSize: Math.max(14, size * 0.15), fontWeight: 900, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif", textShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>
                  {Math.round(item.value * scaleProgress).toLocaleString()}{suffix}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", opacity: labelOp, textAlign: "center", width: 120, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
