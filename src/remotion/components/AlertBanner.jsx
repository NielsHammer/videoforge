import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const AlertBanner = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  const type = data.type || "danger"; // danger | warning | info
  const title = data.title || "CRITICAL MISTAKE";
  const body = data.body || "";
  const stat = data.stat || "";
  const icon = data.icon || "🚨";

  const colors = {
    danger: { main: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "#ef4444" },
    warning: { main: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "#f59e0b" },
    info: { main: accent, bg: `${accent}20`, border: accent },
  };
  const c = colors[type] || colors.danger;

  // Slam down from top
  const slideY = interpolate(clipFrame, [0, fps * 0.25], [-100, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.3)),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.1], [0, 1], { extrapolateRight: "clamp" });

  // Flash effect for danger
  const flash = type === "danger"
    ? Math.floor(clipFrame / (fps * 0.6)) % 2 === 0 ? 1 : 0.7
    : 1;

  const bodyOp = interpolate(clipFrame, [fps * 0.2, fps * 0.45], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const bodyY = interpolate(clipFrame, [fps * 0.2, fps * 0.4], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(6,12,36,0.92)",
    }}>
      <div style={{
        transform: `translateY(${slideY}px)`,
        opacity: opacity * flash,
        width: 860,
        background: c.bg,
        border: `2px solid ${c.border}`,
        borderLeft: `6px solid ${c.main}`,
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Header bar */}
        <div style={{
          background: `${c.main}22`,
          padding: "20px 32px",
          display: "flex", alignItems: "center", gap: 16,
          borderBottom: `1px solid ${c.border}44`,
        }}>
          <span style={{ fontSize: 40 }}>{icon}</span>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 32, color: c.main,
            textTransform: "uppercase", letterSpacing: 3,
          }}>{title}</span>
        </div>

        {/* Body */}
        <div style={{
          padding: "28px 32px",
          transform: `translateY(${bodyY}px)`,
          opacity: bodyOp,
        }}>
          {body && (
            <p style={{
              fontFamily: "sans-serif", fontWeight: 500,
              fontSize: 26, color: "rgba(255,255,255,0.9)",
              lineHeight: 1.5, margin: 0,
            }}>{body}</p>
          )}
          {stat && (
            <div style={{
              marginTop: 20,
              padding: "12px 20px",
              background: `${c.main}18`,
              borderRadius: 8, display: "inline-block",
            }}>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 700,
                fontSize: 22, color: c.main,
              }}>{stat}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
