import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// AlertBanner — High-impact urgent alert / warning banner
// data: { type: "warning"|"danger"|"info", title: "CRITICAL MISTAKE", body: "Most people do this and it costs them decades of wealth building", stat: "87% of people", icon: "🚨" }
// USE WHEN: narrator warns about a critical mistake, danger, or important alert — more urgent than warning_siren
export const AlertBanner = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.title) return null;

  const typeColors = { warning: "#f59e0b", danger: "#ef4444", info: accent };
  const color = typeColors[data.type] || "#ef4444";

  const slideY = interpolate(clipFrame, [0, fps * 0.35], [-60, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const bodyOp = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const statOp = interpolate(clipFrame, [fps * 0.7, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.7 + Math.sin(clipFrame * 0.15) * 0.3;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 70px", gap: 0 }}>
      {/* Alert header */}
      <div style={{ background: color, padding: "16px 24px", borderRadius: "16px 16px 0 0", transform: `translateY(${slideY}px)`, display: "flex", alignItems: "center", gap: 14, boxShadow: `0 0 30px ${color}${Math.round(pulse * 80).toString(16).padStart(2,"0")}` }}>
        <div style={{ fontSize: 28 }}>{data.icon || "⚠️"}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
          {data.title}
        </div>
      </div>

      {/* Body */}
      <div style={{ background: `${color}12`, border: `1px solid ${color}30`, borderTop: "none", borderRadius: "0 0 16px 16px", padding: "24px 24px", opacity: bodyOp }}>
        <div style={{ fontSize: 21, color: "rgba(255,255,255,0.85)", fontFamily: "Arial, sans-serif", lineHeight: 1.5, marginBottom: data.stat ? 16 : 0 }}>
          {data.body}
        </div>
        {data.stat && (
          <div style={{ fontSize: 32, fontWeight: 900, color: color, fontFamily: "Arial Black, Arial, sans-serif", opacity: statOp }}>
            {data.stat}
          </div>
        )}
      </div>
    </div>
  );
};
