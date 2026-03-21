import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { level: 47, rank: "EXPERT", xp: 8400, maxXp: 10000, badge: "⚔️" }
export const LevelUp = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.level) return null;

  const levelOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const levelScale = interpolate(clipFrame, [fps * 0.1, fps * 0.5], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
  const xpW = interpolate(clipFrame, [fps * 0.4, fps * 1.2], [0, (data.xp / data.maxXp) * 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const xpOp = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {/* Level badge */}
      <div style={{ opacity: levelOp, transform: `scale(${levelScale})`, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        {data.badge && <div style={{ fontSize: 48, marginBottom: 8 }}>{data.badge}</div>}
        <div style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}10)`, border: `2px solid ${accent}60`, borderRadius: 12, padding: "12px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: `${accent}99`, letterSpacing: 6, fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}>LEVEL</div>
          <div style={{ fontSize: 72, fontWeight: 900, color: accent, fontFamily: "Arial Black, Arial, sans-serif", lineHeight: 1, textShadow: `0 0 30px ${accent}80` }}>
            {data.level}
          </div>
          {data.rank && <div style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: 4, fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}>{data.rank}</div>}
        </div>
      </div>

      {/* XP bar */}
      {data.xp && data.maxXp && (
        <div style={{ width: "100%", opacity: xpOp }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>XP</div>
            <div style={{ fontSize: 11, color: `${accent}cc`, fontFamily: "Arial, sans-serif" }}>{data.xp.toLocaleString()} / {data.maxXp.toLocaleString()}</div>
          </div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xpW}%`, background: `linear-gradient(90deg, ${accent}80, ${accent})`, borderRadius: 5, boxShadow: `0 0 10px ${accent}60` }} />
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// HORROR / PARANORMAL
// ═══════════════════════════════════════════════

// StaticInterrupt — TV static bursts in then clears to reveal text
// data: { text: "IT NEVER STOPPED", subtext: "The haunting continues to this day" }
