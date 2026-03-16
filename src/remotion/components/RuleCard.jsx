import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const RuleCard = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const number = data.number || "Rule #1";
  const name = data.name || "Rule Name";
  const description = data.description || "";
  const icon = data.icon || "💡";

  // Card scales in
  const scale = interpolate(clipFrame, [0, fps * 0.25, fps * 0.35], [0.85, 1.04, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  // Rule number slides in from left
  const numX = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [-60, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Name + desc fade up
  const textOp = interpolate(clipFrame, [fps * 0.3, fps * 0.55], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const textY = interpolate(clipFrame, [fps * 0.3, fps * 0.55], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${scale})`, opacity,
        width: 820,
        background: `${accent}0e`,
        border: `2px solid ${accent}44`,
        borderRadius: 20, overflow: "hidden",
      }}>
        {/* Top accent bar */}
        <div style={{ height: 6, background: accent }} />

        <div style={{ padding: "48px 56px" }}>
          {/* Rule number + icon */}
          <div style={{
            display: "flex", alignItems: "center", gap: 20,
            transform: `translateX(${numX}px)`,
            marginBottom: 28,
          }}>
            <span style={{ fontSize: 48 }}>{icon}</span>
            <span style={{
              fontFamily: "sans-serif", fontWeight: 900,
              fontSize: 22, color: accent,
              textTransform: "uppercase", letterSpacing: 4,
            }}>{number}</span>
          </div>

          {/* Name */}
          <div style={{
            opacity: textOp, transform: `translateY(${textY}px)`,
          }}>
            <div style={{
              fontFamily: "sans-serif", fontWeight: 900,
              fontSize: 52, color: "#ffffff",
              lineHeight: 1.2, marginBottom: description ? 24 : 0,
            }}>{name}</div>

            {description && (
              <div style={{
                fontFamily: "sans-serif", fontWeight: 400,
                fontSize: 24, color: "rgba(255,255,255,0.7)",
                lineHeight: 1.5,
              }}>{description}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
