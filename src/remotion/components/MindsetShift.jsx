import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const MindsetShift = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const old = data.old || "Wrong thinking";
  const newThought = data.new || "Right thinking";
  const label = data.label || "THE SHIFT";

  // Label drops in first
  const labelOp = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  // Old thought appears, then gets crossed out
  const oldOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Strikethrough line grows
  const strikeWidth = interpolate(clipFrame, [fps * 0.5, fps * 0.75], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Arrow appears
  const arrowScale = interpolate(clipFrame, [fps * 0.6, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  // New thought reveals
  const newOp = interpolate(clipFrame, [fps * 0.75, fps * 1.0], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const newX = interpolate(clipFrame, [fps * 0.75, fps * 1.0], [40, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "60px 100px", gap: 40,
    }}>
      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "sans-serif", fontWeight: 900,
        fontSize: 22, color: accent,
        textTransform: "uppercase", letterSpacing: 6,
        padding: "8px 24px",
        border: `1px solid ${accent}44`,
        borderRadius: 20,
      }}>{label}</div>

      {/* Old thought — crossed out */}
      <div style={{
        opacity: oldOp, position: "relative",
        padding: "24px 40px",
        background: "rgba(239,68,68,0.08)",
        border: "1.5px solid rgba(239,68,68,0.3)",
        borderRadius: 12, width: "100%",
      }}>
        <span style={{
          fontFamily: "sans-serif", fontWeight: 600,
          fontSize: 28, color: "rgba(255,255,255,0.7)",
        }}>{old}</span>
        {/* Strikethrough */}
        <div style={{
          position: "absolute", top: "50%", left: "5%",
          height: 3, width: `${strikeWidth}%`,
          background: "#ef4444",
          borderRadius: 2, transform: "translateY(-50%)",
        }} />
      </div>

      {/* Arrow */}
      <div style={{
        transform: `scale(${arrowScale})`,
        fontSize: 48, color: accent,
      }}>↓</div>

      {/* New thought */}
      <div style={{
        opacity: newOp, transform: `translateX(${newX}px)`,
        padding: "24px 40px",
        background: `${accent}18`,
        border: `2px solid ${accent}66`,
        borderRadius: 12, width: "100%",
        boxShadow: `0 0 30px ${accent}22`,
      }}>
        <span style={{
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 28, color: "#ffffff",
        }}>{newThought}</span>
      </div>
    </div>
  );
};
