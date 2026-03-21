import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { team1: "ROME", team2: "CARTHAGE", score1: 3, score2: 1, sport: "Battle", period: "Final" }
export const SportsScoreboard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.team1 || !data?.team2) return null;

  const op = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.1)) });
  const scoreProgress = interpolate(clipFrame, [fps * 0.3, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const score1 = Math.round((data.score1 || 0) * scoreProgress);
  const score2 = Math.round((data.score2 || 0) * scoreProgress);
  const finalOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 60px" }}>
      <div style={{ width: "100%", maxWidth: 700, opacity }}>
        <div style={{ background: "rgba(0,0,0,0.7)", border: "2px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
          {/* Header bar */}
          <div style={{ background: `${accent}20`, padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: `${accent}cc`, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>{data.sport || "MATCH"}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 3, fontFamily: "Arial, sans-serif", opacity: finalOp }}>{data.period || "FINAL"}</div>
          </div>
          {/* Score row */}
          <div style={{ display: "flex", alignItems: "center", padding: "20px 24px" }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2 }}>{data.team1}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 20px" }}>
              <div style={{ fontSize: 64, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: accent, textShadow: `0 0 20px ${accent}60`, minWidth: 60, textAlign: "center" }}>{score1}</div>
              <div style={{ fontSize: 20, color: "rgba(255,255,255,0.2)", fontFamily: "Arial, sans-serif" }}>—</div>
              <div style={{ fontSize: 64, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "rgba(255,255,255,0.7)", minWidth: 60, textAlign: "center" }}>{score2}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2 }}>{data.team2}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// BUSINESS / MOTIVATION
// ═══════════════════════════════════════════════

// HabitChain — Streak counter — days building into a chain with color coding
// data: { streak: 21, label: "DAY STREAK", unit: "days", color: "accent|green|gold" }
