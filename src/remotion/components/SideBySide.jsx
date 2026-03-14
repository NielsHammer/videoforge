import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img } from "remotion";
import { getTheme } from "../../themes.js";

// SideBySide: Two items shown side by side — great for comparisons, then vs now, A vs B
// Works with or without images (text-only mode if no imagePaths)
// data: { left: "BEFORE", right: "AFTER", leftSub: "2020", rightSub: "2024", vs: true }
// Also accepts imagePaths from clip for image comparisons
export const SideBySide = ({ data, imagePaths = [], clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data) return null;
  const leftLabel = data.left || "A";
  const rightLabel = data.right || "B";
  const leftSub = data.leftSub || "";
  const rightSub = data.rightSub || "";
  const showVs = data.vs !== false;
  const leftColor = data.leftColor || "#ef4444";
  const rightColor = data.rightColor || "#22c55e";

  const leftImg = imagePaths[0] || null;
  const rightImg = imagePaths[1] || null;

  const leftOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const leftX = interpolate(clipFrame, [0, fps * 0.4], [-80, 0], { extrapolateRight: "clamp" });
  const rightOp = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightX = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [80, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vsOp = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const Panel = ({ label, sub, img, color, slideX, op }) => (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16, opacity: op, transform: `translateX(${slideX}px)`,
    }}>
      {img && (
        <div style={{
          width: "100%", height: 300, borderRadius: 12, overflow: "hidden",
          border: `3px solid ${color}`, boxShadow: `0 0 30px ${color}40`,
        }}>
          <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div style={{
        fontSize: img ? 42 : 72, fontWeight: 900, color: "white",
        fontFamily: "Arial Black, Arial, sans-serif", textAlign: "center",
        textTransform: "uppercase", letterSpacing: 2,
        textShadow: `0 0 30px ${color}80`,
      }}>{label}</div>
      {sub && (
        <div style={{
          fontSize: 24, color: color, fontWeight: 700, letterSpacing: 3,
          textTransform: "uppercase", fontFamily: "Arial, sans-serif",
          backgroundColor: `${color}20`, padding: "4px 16px", borderRadius: 6,
        }}>{sub}</div>
      )}
    </div>
  );

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "row",
      alignItems: "center", padding: "40px 60px", gap: 0,
    }}>
      <Panel label={leftLabel} sub={leftSub} img={leftImg} color={leftColor} slideX={leftX} op={leftOp} />

      {/* VS divider */}
      {showVs && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", padding: "0 20px",
          opacity: vsOp, gap: 8,
        }}>
          <div style={{ width: 2, height: 60, backgroundColor: `${accent}60` }} />
          <div style={{
            fontSize: 28, fontWeight: 900, color: accent,
            fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 2,
            border: `2px solid ${accent}`, borderRadius: 6, padding: "4px 12px",
            boxShadow: `0 0 20px ${accent}40`,
          }}>VS</div>
          <div style={{ width: 2, height: 60, backgroundColor: `${accent}60` }} />
        </div>
      )}

      <Panel label={rightLabel} sub={rightSub} img={rightImg} color={rightColor} slideX={rightX} op={rightOp} />
    </div>
  );
};
