import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const defaultColors = ["#ff6644", "#44aaff", "#44dd88", "#ddaa44", "#dd44aa", "#44dddd", "#aa66ff", "#ff4488"];

export const VerticalBarChart = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = data.items || [];
  const suffix = data.suffix || "";
  const prefix = data.prefix || "";
  const maxVal = Math.max(...items.map(i => i.value || 0), 1);

  const titleOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const barCount = Math.min(items.length, 8);
  const barWidth = Math.min(100, Math.floor(700 / barCount));
  const gap = Math.min(20, Math.floor(200 / barCount));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap, height: 450, padding: "0 60px" }}>
        {items.slice(0, 8).map((item, i) => {
          const delay = i * 0.07;
          const barProgress = interpolate(clipFrame, [fps * (0.2 + delay), fps * (0.6 + delay)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const color = item.color || defaultColors[i % defaultColors.length];
          const barHeight = (item.value / maxVal) * 380 * barProgress;
          const displayVal = Math.round(item.value * barProgress);
          const labelOp = interpolate(clipFrame, [fps * (0.3 + delay), fps * (0.45 + delay)], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", opacity: labelOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {prefix}{displayVal.toLocaleString()}{suffix}
              </div>
              <div style={{
                width: barWidth, height: barHeight, borderRadius: "8px 8px 4px 4px",
                background: `linear-gradient(to top, ${color}88, ${color})`,
                boxShadow: `0 0 20px ${color}25, inset 0 1px 0 rgba(255,255,255,0.15)`,
              }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffffdd", textAlign: "center", width: barWidth + 10, lineHeight: 1.2, opacity: labelOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {item.label || ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
