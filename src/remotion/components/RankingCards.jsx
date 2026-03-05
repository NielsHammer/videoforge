import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const medalColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
const defaultColors = ["#4488ff", "#44dd88", "#ff8844", "#dd44aa", "#44dddd", "#ddaa44", "#ff4466", "#aa66ff"];

export const RankingCards = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = data.items || [];
  const suffix = data.suffix || "";
  const prefix = data.prefix || "";

  const titleOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const count = Math.min(items.length, 6);
  const cols = count <= 3 ? count : Math.ceil(count / 2);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 18, width: "100%", maxWidth: 1100,
      }}>
        {items.slice(0, count).map((item, i) => {
          const delay = i * 0.08;
          const cardScale = interpolate(clipFrame, [fps * (0.15 + delay), fps * (0.35 + delay)], [0.7, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)),
          });
          const cardOp = interpolate(clipFrame, [fps * (0.12 + delay), fps * (0.25 + delay)], [0, 1], { extrapolateRight: "clamp" });
          const color = item.color || defaultColors[i % defaultColors.length];
          const medal = i < 3 ? medalColors[i] : null;

          return (
            <div key={i} style={{
              background: "rgba(0,0,0,0.55)",
              border: `1.5px solid ${medal || color}33`,
              borderRadius: 16, padding: "20px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              transform: `scale(${cardScale})`, opacity: cardOp,
              boxShadow: medal ? `0 0 20px ${medal}20` : "none",
            }}>
              {/* Rank badge */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: medal ? `linear-gradient(135deg, ${medal}, ${medal}88)` : `${color}22`,
                border: `2px solid ${medal || color}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 900, color: medal ? "#000000" : color,
                fontFamily: "'Arial Black', Arial, sans-serif",
              }}>
                {i + 1}
              </div>
              {/* Name */}
              <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff", textAlign: "center", fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 1.2 }}>
                {item.label}
              </div>
              {/* Value */}
              <div style={{ fontSize: 24, fontWeight: 900, color: medal || color, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                {prefix}{typeof item.value === "number" ? Math.round(item.value).toLocaleString() : item.value}{suffix}
              </div>
              {/* Subtitle */}
              {item.subtitle && (
                <div style={{ fontSize: 19, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {item.subtitle}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
