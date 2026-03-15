import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// MapCallout — A stylized map pin / location reveal with stats
// data: { location: "United States", stat: "96%", statLabel: "never reach $1M", subtitle: "Population studied", emoji: "🇺🇸" }
// USE WHEN: narrator references a specific country, city, or region with a statistic
export const MapCallout = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.location) return null;

  const pinScale = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
  const cardOp = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pulse = 0.6 + Math.sin(clipFrame / fps * 2) * 0.4;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {/* Map pin */}
      <div style={{ transform: `scale(${pinScale})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 72, lineHeight: 1, filter: `drop-shadow(0 8px 20px rgba(0,0,0,0.5))` }}>
          {data.emoji || "📍"}
        </div>
        {/* Pin shadow */}
        <div style={{ width: 30, height: 8, background: "rgba(0,0,0,0.3)", borderRadius: "50%", filter: "blur(4px)", marginTop: -4 }} />
      </div>

      {/* Location name */}
      <div style={{ fontSize: 32, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 2, transform: `scale(${pinScale})`, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
        {data.location}
      </div>

      {/* Stats card */}
      {data.stat && (
        <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${accent}30`, borderRadius: 16, padding: "20px 36px", textAlign: "center", opacity: cardOp, transform: `translateY(${cardY}px)`, boxShadow: `0 0 40px ${accent}20` }}>
          <div style={{ fontSize: 56, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: accent, textShadow: `0 0 30px ${accent}80`, lineHeight: 1 }}>
            {data.stat}
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2, marginTop: 8 }}>
            {data.statLabel || ""}
          </div>
          {data.subtitle && (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", marginTop: 6 }}>{data.subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
};
