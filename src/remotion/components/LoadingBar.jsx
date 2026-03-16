import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const LoadingBar = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const label = data.label || "Loading...";
  const value = Math.min(100, Math.max(0, data.value || 73));
  const suffix = data.suffix || "%";
  const color = data.color || accent;
  const subtitle = data.subtitle || "";

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const labelY = interpolate(clipFrame, [0, fps * 0.25], [-20, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Bar fills after 0.3s
  const fillWidth = interpolate(clipFrame, [fps * 0.3, fps * 1.2], [0, value], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Number counts up with bar
  const displayNum = Math.round(fillWidth);

  const subtitleOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Shimmer on bar
  const shimmerX = interpolate(clipFrame, [fps * 0.3, fps * 2], [-200, 900], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "60px 120px",
      opacity: fadeIn,
    }}>
      {/* Label + value */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", width: "100%",
        transform: `translateY(${labelY}px)`,
        marginBottom: 24,
      }}>
        <span style={{
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 32, color: "#ffffff",
        }}>{label}</span>
        <span style={{
          fontFamily: "sans-serif", fontWeight: 900,
          fontSize: 64, color,
          textShadow: `0 0 30px ${color}66`,
          lineHeight: 1,
        }}>{displayNum}{suffix}</span>
      </div>

      {/* Track */}
      <div style={{
        width: "100%", height: 28,
        background: "rgba(255,255,255,0.08)",
        borderRadius: 14, overflow: "hidden",
        border: `1px solid rgba(255,255,255,0.12)`,
      }}>
        {/* Fill */}
        <div style={{
          width: `${fillWidth}%`, height: "100%",
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          borderRadius: 14,
          position: "relative", overflow: "hidden",
          boxShadow: `0 0 20px ${color}66`,
          transition: "none",
        }}>
          {/* Shimmer */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: 80,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            transform: `translateX(${shimmerX}px)`,
            borderRadius: 14,
          }} />
        </div>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          opacity: subtitleOp, marginTop: 20,
          fontFamily: "sans-serif", fontWeight: 400,
          fontSize: 20, color: "rgba(255,255,255,0.55)",
          fontStyle: "italic",
        }}>{subtitle}</div>
      )}
    </div>
  );
};
