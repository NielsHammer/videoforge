import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * Leaderboard v24: Animated ranked list — items slide in from left with growing value bars.
 * Props via data:
 *   items: [{ label: "Apple", value: 3.2, suffix: "T", color: "#4a9eff" }, ...]
 *   title: "Top Companies by Market Cap"
 */
export const Leaderboard = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.items || data.items.length === 0) return null;

  const items = data.items.slice(0, 7);
  const title = data.title || "";
  const maxVal = Math.max(...items.map(it => it.value), 1);
  const titleOp = interpolate(clipFrame, [fps * 0.05, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const defaultColors = ["#eab308", "#c0c0c0", "#cd7f32", "#4a9eff", "#22c55e", "#a855f7", "#f97316"];
  const medalColors = ["#eab308", "#c0c0c0", "#cd7f32"];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
      {/* Title */}
      {title && (
        <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3, marginBottom: 40 }}>
          {title}
        </div>
      )}

      {/* Items */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
        {items.map((item, i) => {
          const delay = fps * 0.2 + i * fps * 0.15;
          const slideIn = interpolate(clipFrame, [delay, delay + fps * 0.35], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const barW = interpolate(clipFrame, [delay + fps * 0.1, delay + fps * 0.7], [0, (item.value / maxVal) * 100], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const valOp = interpolate(clipFrame, [delay + fps * 0.4, delay + fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const color = item.color || defaultColors[i % defaultColors.length];

          const translateX = interpolate(slideIn, [0, 1], [-60, 0]);
          const opacity = interpolate(slideIn, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              transform: `translateX(${translateX}px)`, opacity,
            }}>
              {/* Rank number */}
              <div style={{
                width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                background: i < 3 ? `${medalColors[i]}25` : "rgba(0,0,0,0.50)",
                border: i < 3 ? `2px solid ${medalColors[i]}50` : "2px solid rgba(255,255,255,0.3)",
                fontSize: 22, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif",
                color: i < 3 ? medalColors[i] : "#ccddff",
                flexShrink: 0,
              }}>
                {i + 1}
              </div>

              {/* Label */}
              <div style={{ width: 200, fontSize: 22, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffff", flexShrink: 0 }}>
                {item.label}
              </div>

              {/* Bar */}
              <div style={{ flex: 1, height: 28, borderRadius: 8, background: "rgba(0,0,0,0.55)", overflow: "hidden" }}>
                <div style={{
                  width: `${barW}%`, height: "100%", borderRadius: 8,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  boxShadow: `0 0 15px ${color}30`,
                }} />
              </div>

              {/* Value */}
              <div style={{ width: 100, textAlign: "right", fontSize: 24, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color, opacity: valOp, flexShrink: 0 }}>
                {item.prefix || ""}{item.value}{item.suffix || ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
