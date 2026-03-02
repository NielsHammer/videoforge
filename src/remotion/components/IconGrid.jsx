import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const defaultIcons = ["💰", "📈", "🎯", "⚡", "🔥", "💎", "🌟", "🏆", "🧠", "📊", "🔑", "💡"];
const defaultColors = ["#4488ff", "#44dd88", "#ff8844", "#dd44aa", "#44dddd", "#ddaa44", "#ff4466", "#aa66ff", "#44aadd", "#88dd44", "#ff66aa", "#ddaa88"];

export const IconGrid = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = data.items || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const count = Math.min(items.length, 12);
  const cols = count <= 4 ? 2 : count <= 6 ? 3 : 4;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16, width: "100%", maxWidth: 1000,
      }}>
        {items.slice(0, count).map((item, i) => {
          const delay = i * 0.06;
          const scale = interpolate(clipFrame, [fps * (0.15 + delay), fps * (0.3 + delay)], [0.5, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)),
          });
          const op = interpolate(clipFrame, [fps * (0.12 + delay), fps * (0.25 + delay)], [0, 1], { extrapolateRight: "clamp" });
          const color = item.color || defaultColors[i % defaultColors.length];
          const icon = item.icon || defaultIcons[i % defaultIcons.length];

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: `${color}0a`, border: `1px solid ${color}22`, borderRadius: 14,
              padding: "14px 18px",
              transform: `scale(${scale})`, opacity: op,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}18`, border: `1.5px solid ${color}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>
                {icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1.2 }}>
                  {item.label || ""}
                </div>
                {item.value && (
                  <div style={{ fontSize: 19, fontWeight: 700, color, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                    {item.value}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
