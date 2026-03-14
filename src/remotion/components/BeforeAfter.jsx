import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const BeforeAfter = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;
  const before = data.before || { label: "BEFORE", items: [] };
  const after = data.after || { label: "AFTER", items: [] };
  const title = data.title || "";

  const leftOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const leftX = interpolate(clipFrame, [0, fps * 0.4], [-40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const rightOp = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightX = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const dividerH = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
      {title && (
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, marginBottom: 28, opacity: leftOp }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", width: "100%", gap: 0, alignItems: "stretch" }}>
        {/* Before */}
        <div style={{ flex: 1, opacity: leftOp, transform: `translateX(${leftX}px)`, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "16px 0 0 16px", padding: "24px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontFamily: "Arial, sans-serif" }}>✗ {before.label}</div>
          {before.items.map((item, i) => (
            <div key={i} style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "Arial, sans-serif", lineHeight: 1.4, opacity: interpolate(clipFrame, [fps * (0.2 + i * 0.1), fps * (0.4 + i * 0.1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
              {item}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 2, background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`, opacity: dividerH, flexShrink: 0, alignSelf: "stretch" }} />

        {/* After */}
        <div style={{ flex: 1, opacity: rightOp, transform: `translateX(${rightX}px)`, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "0 16px 16px 0", padding: "24px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16, fontFamily: "Arial, sans-serif" }}>✓ {after.label}</div>
          {after.items.map((item, i) => (
            <div key={i} style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "Arial, sans-serif", lineHeight: 1.4, opacity: interpolate(clipFrame, [fps * (0.5 + i * 0.1), fps * (0.7 + i * 0.1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
