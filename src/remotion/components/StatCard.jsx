import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * StatCard v24: Bold stat display with context — like a dashboard KPI card.
 * Can show 1-3 stats in a row.
 * Props via data:
 *   stats: [{ value: "4.2T", label: "Total Market Cap", prefix: "$", change: "+12%", changeColor: "#22c55e" }]
 *   title: "Market Overview"
 */
export const StatCard = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.stats || data.stats.length === 0) return null;

  const stats = data.stats.slice(0, 3);
  const title = data.title || "";
  const titleOp = interpolate(clipFrame, [fps * 0.05, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cardWidth = stats.length === 1 ? 600 : stats.length === 2 ? 500 : 420;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Title */}
      {title && (
        <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3, marginBottom: 50 }}>
          {title}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 30 }}>
        {stats.map((stat, i) => {
          const delay = fps * 0.15 + i * fps * 0.2;
          const cardProgress = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)),
          });
          const cardOp = interpolate(clipFrame, [delay, delay + fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const valScale = interpolate(clipFrame, [delay + fps * 0.1, delay + fps * 0.25, delay + fps * 0.35], [0.6, 1.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          const accentColor = stat.changeColor || stat.color || "#4a9eff";

          return (
            <div key={i} style={{
              width: cardWidth, padding: "40px 30px", borderRadius: 20, overflow: "hidden",
              background: "rgba(0,0,0,0.55)",
              border: "2px solid rgba(255,255,255,0.3)",
              backdropFilter: "blur(10px)",
              display: "flex", flexDirection: "column", alignItems: "center",
              transform: `scale(${cardProgress})`, opacity: cardOp,
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            }}>
              {/* Icon */}
              {stat.icon && (
                <span style={{ fontSize: 40, marginBottom: 12 }}>{stat.icon}</span>
              )}

              {/* Big value */}
              <div style={{
                fontSize: stats.length === 1 ? 90 : 64,
                fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif",
                color: "white",
                transform: `scale(${valScale})`,
                lineHeight: 1,
                marginBottom: 8,
              }}>
                {stat.prefix || ""}{stat.value}{stat.suffix || ""}
              </div>

              {/* Change indicator */}
              {stat.change && (
                <div style={{
                  fontSize: 22, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif",
                  color: accentColor, marginBottom: 8,
                }}>
                  {stat.change}
                </div>
              )}

              {/* Label */}
              <div style={{
                fontSize: 18, fontWeight: 500, fontFamily: "Arial Black, Arial, sans-serif",
                color: "#ffffff", textAlign: "center", textTransform: "uppercase", letterSpacing: 2,
              }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
