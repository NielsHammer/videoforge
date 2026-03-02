import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const defaultColors = ["#4488ff", "#44dd88", "#ff8844", "#dd44aa", "#44dddd", "#dddd44", "#ff4466", "#aa66ff"];

export const HorizontalBarChart = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = data.items || [];
  const suffix = data.suffix || "";
  const prefix = data.prefix || "";
  const maxVal = Math.max(...items.map(i => i.value || 0), 1);

  const titleOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
      {title && (
        <div style={{ fontSize: 36, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 40, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ width: "100%", maxWidth: 1200, display: "flex", flexDirection: "column", gap: 16 }}>
        {items.slice(0, 8).map((item, i) => {
          const delay = i * 0.08;
          const barProgress = interpolate(clipFrame, [fps * (0.15 + delay), fps * (0.5 + delay)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const itemOp = interpolate(clipFrame, [fps * (0.1 + delay), fps * (0.2 + delay)], [0, 1], { extrapolateRight: "clamp" });
          const color = item.color || defaultColors[i % defaultColors.length];
          const barWidth = (item.value / maxVal) * 100 * barProgress;
          const displayVal = Math.round(item.value * barProgress);

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: itemOp }}>
              <div style={{ width: 180, textAlign: "right", fontSize: 18, fontWeight: 700, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif", flexShrink: 0 }}>
                {item.label || ""}
              </div>
              <div style={{ flex: 1, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  width: `${barWidth}%`, height: "100%", borderRadius: 8,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  boxShadow: `0 0 20px ${color}30`,
                  transition: "none",
                }} />
              </div>
              <div style={{ width: 100, fontSize: 18, fontWeight: 800, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {prefix}{displayVal.toLocaleString()}{suffix}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
