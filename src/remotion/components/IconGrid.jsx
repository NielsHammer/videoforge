import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * IconGrid v2 — Clean icon+label cards in a responsive grid
 * Much cleaner than v1: no brand names, proper spacing, smooth stagger animation
 * data: { title: "Dopamine Triggers", items: [{icon:"❤️", label:"Likes"}, ...] }
 */
export const IconGrid = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || !data.items || data.items.length === 0) return null;

  const items = data.items.slice(0, 6);
  const title = data.title || "";
  const cols = items.length <= 3 ? items.length : items.length <= 4 ? 2 : 3;

  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const titleY  = interpolate(clipFrame, [0, fps * 0.3], [-12, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "48px 80px", gap: 32,
    }}>
      {/* Title */}
      {title && (
        <div style={{
          fontSize: 20, fontWeight: 700, color: accent,
          letterSpacing: 5, textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
          opacity: titleOp, transform: `translateY(${titleY}px)`,
        }}>
          {title}
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 20,
        width: "100%",
        maxWidth: 900,
      }}>
        {items.map((item, i) => {
          const delay = i * 0.12;
          const cardOp = interpolate(clipFrame, [fps * (0.2 + delay), fps * (0.5 + delay)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const cardY  = interpolate(clipFrame, [fps * (0.2 + delay), fps * (0.5 + delay)], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const cardScale = interpolate(clipFrame, [fps * (0.2 + delay), fps * (0.5 + delay)], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });

          return (
            <div key={i} style={{
              opacity: cardOp,
              transform: `translateY(${cardY}px) scale(${cardScale})`,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${accent}22`,
              borderRadius: 18,
              padding: "28px 20px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14,
              backdropFilter: "blur(4px)",
            }}>
              {/* Icon */}
              <div style={{
                fontSize: 52,
                lineHeight: 1,
                filter: `drop-shadow(0 4px 16px ${accent}40)`,
              }}>
                {item.icon || item.emoji || "•"}
              </div>

              {/* Label */}
              <div style={{
                fontSize: 16, fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                textTransform: "uppercase",
                letterSpacing: 2,
                fontFamily: "Arial Black, Arial, sans-serif",
                textAlign: "center",
                lineHeight: 1.3,
              }}>
                {item.label || item.name || ""}
              </div>

              {/* Sub label if present */}
              {item.sub && (
                <div style={{
                  fontSize: 12, fontWeight: 600,
                  color: accent,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontFamily: "Arial, sans-serif",
                  textAlign: "center",
                  opacity: 0.8,
                }}>
                  {item.sub}
                </div>
              )}

              {/* Subtle bottom accent line */}
              <div style={{
                width: "40%", height: 2,
                background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
                borderRadius: 1,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
