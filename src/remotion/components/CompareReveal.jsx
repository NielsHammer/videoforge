import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const CompareReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.items || data.items.length < 2) return null;
  const [itemA, itemB] = data.items;
  const title = data.title || "";
  const winner = data.winner || 0; // index of winner

  const leftProgress = interpolate(clipFrame, [fps * 0.1, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const rightProgress = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const vsOp = interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const winnerOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const renderItem = (item, progress, isWinner) => (
    <div style={{
      flex: 1,
      background: isWinner ? `rgba(${accent === "#22c55e" ? "34,197,94" : "59,130,246"},0.1)` : "rgba(255,255,255,0.03)",
      border: `1px solid ${isWinner ? accent : "rgba(255,255,255,0.1)"}`,
      borderRadius: 20, padding: "28px 20px",
      display: "flex", flexDirection: "column", alignItems: "center",
      transform: `scale(${progress}) ${isWinner ? "scale(1.03)" : ""}`,
      opacity: progress,
      boxShadow: isWinner ? `0 0 40px ${accent}20` : "none",
    }}>
      {item.icon && <div style={{ fontSize: 48, marginBottom: 12 }}>{item.icon}</div>}
      <div style={{ fontSize: 24, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textAlign: "center", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{item.label}</div>
      {item.score && <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: isWinner ? accent : "rgba(255,255,255,0.5)", textShadow: isWinner ? `0 0 30px ${accent}60` : "none" }}>{item.score}</div>}
      {item.description && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 8, fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{item.description}</div>}
      {isWinner && (
        <div style={{ marginTop: 12, padding: "4px 12px", background: accent, borderRadius: 20, fontSize: 12, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: 2, opacity: winnerOp }}>
          WINNER
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px" }}>
      {title && <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, marginBottom: 28, opacity: leftProgress }}>{title}</div>}
      <div style={{ display: "flex", width: "100%", gap: 20, alignItems: "center" }}>
        {renderItem(itemA, leftProgress, winner === 0)}
        <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: accent, opacity: vsOp, flexShrink: 0 }}>VS</div>
        {renderItem(itemB, rightProgress, winner === 1)}
      </div>
    </div>
  );
};
