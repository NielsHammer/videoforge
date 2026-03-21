import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { left: "ROMAN LEGIONS", right: "VISIGOTH ARMY", leftStart: 80, rightStart: 60, leftEnd: 25, rightEnd: 60 }
export const BattleScale = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.left || !data?.right) return null;

  const progress = interpolate(clipFrame, [fps * 0.3, fps * 2.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  const leftVal = interpolate(progress, [0, 1], [data.leftStart || 80, data.leftEnd || 20]);
  const rightVal = interpolate(progress, [0, 1], [data.rightStart || 50, data.rightEnd || 80]);

  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
      {/* Labels */}
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginBottom: 16, opacity: labelOp }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: accent, fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2, textAlign: "left", maxWidth: "40%" }}>
          {data.left}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2 }}>
          VS
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#ef4444", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2, textAlign: "right", maxWidth: "40%" }}>
          {data.right}
        </div>
      </div>

      {/* Battle bars */}
      <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 4, height: 50 }}>
        <div style={{ height: "100%", width: `${leftVal}%`, background: `linear-gradient(90deg, ${accent}80, ${accent})`, borderRadius: "6px 2px 2px 6px", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12, boxShadow: `0 0 20px ${accent}40` }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "white", fontFamily: "Arial Black" }}>{Math.round(leftVal)}%</span>
        </div>
        <div style={{ height: "100%", flex: 1, background: `linear-gradient(270deg, #ef444480, #ef4444)`, borderRadius: "2px 6px 6px 2px", display: "flex", alignItems: "center", paddingLeft: 12, boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "white", fontFamily: "Arial Black" }}>{Math.round(rightVal)}%</span>
        </div>
      </div>

      {/* Strength labels */}
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginTop: 12, opacity: titleOp }}>
        <div style={{ fontSize: 11, color: `${accent}80`, fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>STRENGTH</div>
        <div style={{ fontSize: 11, color: "rgba(239,68,68,0.6)", fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>STRENGTH</div>
      </div>
    </div>
  );
};

// DocumentReveal — Official document/scroll with wax seal breaking open
// CENTERED. Parchment folds open revealing contents.
// data: { title: "IMPERIAL DECREE", content: "By order of Emperor Theodosius...", seal: "SPQR" }
