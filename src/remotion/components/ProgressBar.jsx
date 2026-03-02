import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * ProgressBar v24: Multiple animated horizontal progress bars.
 * Props via data:
 *   bars: [{ label: "S&P 500", value: 85, suffix: "%", color: "#4a9eff" }, ...]
 *   title: "Annual Returns"
 */
export const ProgressBar = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.bars || data.bars.length === 0) return null;

  const bars = data.bars.slice(0, 6); // Max 6 bars
  const title = data.title || "";
  const maxVal = Math.max(...bars.map(b => b.value), 1);

  const titleOp = interpolate(clipFrame, [fps * 0.05, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const defaultColors = ["#4a9eff", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#eab308"];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 140px" }}>
      {/* Title */}
      {title && (
        <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3, marginBottom: 50 }}>
          {title}
        </div>
      )}

      {/* Bars */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 28 }}>
        {bars.map((bar, i) => {
          const delay = fps * 0.15 + i * fps * 0.12;
          const barProgress = interpolate(clipFrame, [delay, delay + fps * 0.8], [0, bar.value / maxVal], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const labelOp = interpolate(clipFrame, [delay, delay + fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const valueOp = interpolate(clipFrame, [delay + fps * 0.3, delay + fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const color = bar.color || defaultColors[i % defaultColors.length];

          const displayValue = Math.round(bar.value * (barProgress / (bar.value / maxVal || 1)));

          return (
            <div key={i} style={{ width: "100%" }}>
              {/* Label + Value row */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, opacity: labelOp }}>
                <span style={{ fontSize: 24, fontWeight: 600, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffff" }}>{bar.label}</span>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color, opacity: valueOp }}>
                  {bar.prefix || ""}{displayValue.toLocaleString()}{bar.suffix || ""}
                </span>
              </div>
              {/* Bar track */}
              <div style={{ width: "100%", height: 24, borderRadius: 12, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  width: `${barProgress * 100}%`,
                  height: "100%",
                  borderRadius: 12,
                  background: `linear-gradient(90deg, ${color}cc, ${color})`,
                  boxShadow: `0 0 20px ${color}40`,
                  transition: "none",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
