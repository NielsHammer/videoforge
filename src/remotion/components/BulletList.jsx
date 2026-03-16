import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// BulletList — Clean animated bullet points, one by one
// data: { title: "Key Points", items: ["Point one", "Point two", "Point three"], icon: "▶" }
export const BulletList = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data?.items?.length) return null;

  const items = data.items.slice(0, 5);
  const title = data.title || "";
  const icon = data.icon || "▶";
  const delayPerItem = fps * 0.35;

  const titleOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [0, fps * 0.4], [20, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 120px",
    }}>
      {/* Title */}
      {title && (
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          color: accent,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontFamily: "Arial Black, Arial, sans-serif",
          marginBottom: 36,
          textAlign: "center",
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
        }}>
          {title}
        </div>
      )}

      {/* Items */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        maxWidth: 860,
      }}>
        {items.map((item, i) => {
          const delay = i * delayPerItem + fps * 0.1;
          const op = interpolate(clipFrame, [delay, delay + fps * 0.35], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const x = interpolate(clipFrame, [delay, delay + fps * 0.35], [-40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                padding: "14px 0",
                borderBottom: i < items.length - 1
                  ? `1px solid rgba(255,255,255,0.08)`
                  : "none",
                opacity: op,
                transform: `translateX(${x}px)`,
              }}
            >
              {/* Icon */}
              <div style={{
                fontSize: 18,
                color: accent,
                flexShrink: 0,
                marginTop: 4,
                fontWeight: 900,
                minWidth: 24,
                textAlign: "center",
              }}>
                {icon}
              </div>

              {/* Text */}
              <div style={{
                fontSize: 28,
                fontWeight: 600,
                color: "rgba(255,255,255,0.92)",
                fontFamily: "Arial, sans-serif",
                lineHeight: 1.4,
                flex: 1,
              }}>
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
