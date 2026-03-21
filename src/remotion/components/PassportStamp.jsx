import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { country: "ITALY", city: "ROME", date: "476 AD", color: "accent|red|green|gold" }
export const PassportStamp = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.country) return null;

  const colorMap = { accent, red: "#ef4444", green: "#22c55e", gold: "#f59e0b", blue: "#3b82f6" };
  const color = colorMap[data.color] || accent;

  const scale = interpolate(clipFrame, [0, fps * 0.1, fps * 0.2, fps * 0.3], [1.5, 0.9, 1.05, 1], { extrapolateRight: "clamp" });
  const op = interpolate(clipFrame, [0, fps * 0.08], [0, 0.85], { extrapolateRight: "clamp" });
  const rotation = -15;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, opacity: op }}>
        <div style={{ width: 220, height: 220, borderRadius: "50%", border: `6px solid ${color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: `0 0 0 3px ${color}30, inset 0 0 0 10px ${color}10` }}>
          {/* Inner ring */}
          <div style={{ position: "absolute", inset: 12, borderRadius: "50%", border: `2px solid ${color}60` }} />
          {/* Top arc text */}
          <div style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 5, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 4 }}>
            VISITED
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color, fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 3, textTransform: "uppercase", textShadow: `0 0 20px ${color}60` }}>
            {data.country}
          </div>
          {data.city && (
            <div style={{ fontSize: 14, fontWeight: 700, color: `${color}cc`, fontFamily: "Arial, sans-serif", letterSpacing: 4, textTransform: "uppercase", marginTop: 4 }}>
              {data.city}
            </div>
          )}
          {data.date && (
            <div style={{ fontSize: 12, fontWeight: 600, color: `${color}80`, fontFamily: "Arial, sans-serif", marginTop: 8 }}>
              {data.date}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// HEALTH / SCIENCE
// ═══════════════════════════════════════════════

// HeartbeatLine — ECG line draws across screen. Health, danger, alive/dead.
// data: { label: "STRESS LEVELS", value: "CRITICAL", color: "red|green|accent" }
