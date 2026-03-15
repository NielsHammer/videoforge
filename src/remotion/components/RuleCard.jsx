import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// RuleCard — Displays a named rule, law, or principle
// data: { number: "Rule #1", name: "Pay Yourself First", description: "Save before you spend — automatically move 20% to savings the day you get paid", icon: "💰" }
// USE WHEN: narrator states a rule, law, principle, or numbered insight
export const RuleCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.name) return null;

  const borderScale = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const contentOp = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contentY = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const descOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{
        width: "100%", borderRadius: 20, padding: "36px 36px",
        background: `${accent}08`,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 60px ${accent}20`,
        transform: `scaleX(${borderScale})`,
        overflow: "hidden",
      }}>
        {/* Rule number */}
        {data.number && (
          <div style={{ fontSize: 13, fontWeight: 800, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 12, opacity: contentOp }}>
            {data.number}
          </div>
        )}

        {/* Icon + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, opacity: contentOp, transform: `translateY(${contentY}px)` }}>
          {data.icon && <div style={{ fontSize: 48, lineHeight: 1 }}>{data.icon}</div>}
          <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", lineHeight: 1.2 }}>
            {data.name}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.75)", fontFamily: "Arial, sans-serif", lineHeight: 1.5, opacity: descOp, borderTop: `1px solid ${accent}20`, paddingTop: 20 }}>
            {data.description}
          </div>
        )}
      </div>
    </div>
  );
};
