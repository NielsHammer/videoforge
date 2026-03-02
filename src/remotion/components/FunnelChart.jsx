import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const defaultColors = ["#4488ff", "#44aadd", "#44dd88", "#dddd44", "#ff8844", "#ff4466"];

export const FunnelChart = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const stages = data.stages || [];
  const titleOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  const maxWidth = 900;
  const stageCount = Math.min(stages.length, 6);
  const stageHeight = Math.min(80, Math.floor(420 / stageCount));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {stages.slice(0, 6).map((stage, i) => {
          const delay = i * 0.1;
          const progress = interpolate(clipFrame, [fps * (0.15 + delay), fps * (0.4 + delay)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const widthRatio = 1 - (i / stageCount) * 0.6;
          const barW = maxWidth * widthRatio * progress;
          const color = stage.color || defaultColors[i % defaultColors.length];
          const labelOp = interpolate(clipFrame, [fps * (0.25 + delay), fps * (0.4 + delay)], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div key={i} style={{
              width: barW, height: stageHeight, borderRadius: 12,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 20px ${color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: labelOp, zIndex: 1 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {stage.value}{stage.suffix || "%"}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {stage.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
