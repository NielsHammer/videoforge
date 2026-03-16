import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const StatComparison = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const left = data.left || { value: "96%", label: "never reach $1M", color: "#ef4444" };
  const right = data.right || { value: "4%", label: "achieve wealth", color: "#22c55e" };
  const title = data.title || "";

  const leftColor = left.color || "#ef4444";
  const rightColor = right.color || "#22c55e";

  // Left slides in from left, right from right
  const leftX = interpolate(clipFrame, [0, fps * 0.3], [-120, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const rightX = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [120, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(clipFrame, [fps * 0.3, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dividerScale = interpolate(clipFrame, [fps * 0.2, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity,
    }}>
      {/* Title */}
      {title && (
        <div style={{
          opacity: titleOp, marginBottom: 40,
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 28, color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase", letterSpacing: 4,
        }}>{title}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 0, width: 900 }}>
        {/* Left stat */}
        <div style={{
          flex: 1, transform: `translateX(${leftX}px)`,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "48px 40px",
          background: `${leftColor}14`,
          border: `2px solid ${leftColor}44`,
          borderRight: "none",
          borderRadius: "16px 0 0 16px",
        }}>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 110, lineHeight: 1, color: leftColor,
            textShadow: `0 0 50px ${leftColor}66`,
          }}>{left.value}</span>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 600,
            fontSize: 22, color: "rgba(255,255,255,0.8)",
            textAlign: "center", marginTop: 16,
          }}>{left.label}</span>
        </div>

        {/* VS divider */}
        <div style={{
          transform: `scaleY(${dividerScale})`,
          width: 2, height: 200,
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{
            position: "absolute",
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 18, color: accent,
            background: bg,
            padding: "8px 6px",
            letterSpacing: 1,
          }}>VS</div>
        </div>

        {/* Right stat */}
        <div style={{
          flex: 1, transform: `translateX(${rightX}px)`,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "48px 40px",
          background: `${rightColor}14`,
          border: `2px solid ${rightColor}44`,
          borderLeft: "none",
          borderRadius: "0 16px 16px 0",
        }}>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 110, lineHeight: 1, color: rightColor,
            textShadow: `0 0 50px ${rightColor}66`,
          }}>{right.value}</span>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 600,
            fontSize: 22, color: "rgba(255,255,255,0.8)",
            textAlign: "center", marginTop: 16,
          }}>{right.label}</span>
        </div>
      </div>
    </div>
  );
};
