import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { total: 20, lost: 12, label: "ROMAN CITIZENS LOST", sublabel: "in the Crisis of the Third Century" }
export const PopulationBleed = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;

  const total = Math.min(data.total || 20, 40);
  const lost = Math.min(data.lost || Math.floor(total * 0.6), total);
  const label = (data.label || "").toUpperCase();
  const sublabel = data.sublabel || "";

  // Animate the "lost" icons disappearing from right to left over time
  const lostShown = Math.floor(interpolate(clipFrame, [fps * 0.3, fps * 1.8], [0, lost], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  // Lost icons start from the end of the array
  const lostIndices = new Set(Array.from({ length: lostShown }, (_, i) => total - 1 - i));

  const labelOp = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const countOp = interpolate(clipFrame, [fps * 0.4, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cols = Math.min(10, total);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
      {label && (
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 4, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: labelOp, marginBottom: 20 }}>
          {label}
        </div>
      )}

      {/* Person icon grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: cols * 42 }}>
        {Array.from({ length: total }, (_, i) => {
          const isLost = lostIndices.has(i);
          return (
            <div key={i} style={{ width: 32, height: 40, opacity: isLost ? 0.12 : 1, transition: "opacity 0.3s" }}>
              {/* Simple person icon */}
              <svg viewBox="0 0 32 40" style={{ width: "100%", height: "100%" }}>
                <circle cx="16" cy="10" r="8" fill={isLost ? "#ef4444" : accent} />
                <ellipse cx="16" cy="32" rx="12" ry="10" fill={isLost ? "#ef4444" : accent} />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 40, marginTop: 24, opacity: countOp }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: accent, fontFamily: "Arial Black, Arial, sans-serif" }}>{total - lostShown}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 3, fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}>SURVIVING</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#ef4444", fontFamily: "Arial Black, Arial, sans-serif" }}>{lostShown}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 3, fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}>LOST</div>
        </div>
      </div>

      {sublabel && (
        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.35)", fontFamily: "Arial, sans-serif", opacity: labelOp, marginTop: 10, textAlign: "center" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
};

// BattleScale — Two opposing forces shown as bars shrinking/growing
// HORIZONTAL BATTLE. Left = one side, Right = the other. Bars fight for dominance.
// data: { left: "ROMAN LEGIONS", right: "VISIGOTH ARMY", leftStart: 80, rightStart: 60, leftEnd: 25, rightEnd: 60 }
