import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const BulletList = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "";
  const items = data.items || [];
  const icon = data.icon || "▶";

  // Title fades in first
  const titleOp = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [0, fps * 0.25], [-20, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "60px 100px",
    }}>
      {/* Title */}
      {title && (
        <div style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOp,
          marginBottom: 40,
          fontFamily: "sans-serif", fontWeight: 800,
          fontSize: 32, color: accent,
          textTransform: "uppercase", letterSpacing: 4,
          alignSelf: "flex-start",
        }}>{title}</div>
      )}

      {/* Items — stagger in */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        {items.slice(0, 6).map((item, i) => {
          const delay = fps * (0.15 + i * 0.18);
          const itemOp = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const itemX = interpolate(clipFrame, [delay, delay + fps * 0.3], [-60, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 20,
              transform: `translateX(${itemX}px)`,
              opacity: itemOp,
              padding: "16px 24px",
              background: `${accent}12`,
              border: `1px solid ${accent}30`,
              borderLeft: `4px solid ${accent}`,
              borderRadius: 8,
            }}>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 700,
                fontSize: 22, color: accent, flexShrink: 0,
              }}>{icon}</span>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 500,
                fontSize: 26, color: "rgba(255,255,255,0.92)",
                lineHeight: 1.3,
              }}>{typeof item === "string" ? item : item.label || item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
