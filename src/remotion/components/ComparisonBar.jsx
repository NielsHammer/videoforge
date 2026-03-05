import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const ComparisonBar = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme).comparison;
  if (!data || !data.items || data.items.length === 0) return null;

  const items = data.items;
  const maxValue = Math.max(...items.map(i => i.value));

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "0 8%", gap: 40, zIndex: 10,
    }}>
      {items.map((item, idx) => {
        const delay = idx * fps * 0.3;

        // Bar fills up
        const barPct = interpolate(clipFrame, [delay + fps * 0.2, delay + fps * 1.2], [0, item.value / maxValue], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        
        // Label fades in
        const labelOp = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const labelSlide = interpolate(clipFrame, [delay, delay + fps * 0.3], [-20, 0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        // Value counter
        const valueProgress = interpolate(clipFrame, [delay + fps * 0.3, delay + fps * 1.0], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const valueOp = interpolate(clipFrame, [delay + fps * 0.3, delay + fps * 0.5], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });

        const color = item.color || "#4a9eff";
        const barWidthPct = barPct * 100;

        return (
          <div key={idx} style={{ opacity: labelOp }}>
            {/* Label with slide-in */}
            <div style={{
              fontSize: 28, fontWeight: 700, color: "white",
              fontFamily: "Arial Black, Arial, sans-serif",
              textTransform: "uppercase", letterSpacing: 3, marginBottom: 12,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              transform: `translateX(${labelSlide}px)`,
            }}>
              {item.label}
            </div>

            {/* Bar */}
            <div style={{
              width: "100%", height: 60, borderRadius: 10,
              background: "rgba(0,0,0,0.50)",
              border: "2px solid rgba(255,255,255,0.3)",
              overflow: "hidden", position: "relative",
            }}>
              {/* Fill */}
              <div style={{
                width: `${barWidthPct}%`, height: "100%",
                background: `linear-gradient(90deg, ${color}99, ${color})`,
                borderRadius: 10,
                boxShadow: `0 0 30px ${color}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
                transition: "none",
              }} />

              {/* Value — inside bar if wide enough, else outside */}
              <div style={{
                position: "absolute",
                right: barWidthPct > 30 ? undefined : 16,
                left: barWidthPct > 30 ? `${Math.max(barWidthPct - 1, 0)}%` : undefined,
                top: "50%",
                transform: `translateY(-50%) ${barWidthPct > 30 ? "translateX(-100%)" : ""}`,
                paddingRight: barWidthPct > 30 ? 16 : 0,
                fontSize: 30, fontWeight: 900, color: "white",
                fontFamily: "Arial Black, Arial, sans-serif",
                opacity: valueOp,
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}>
                {item.display}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
