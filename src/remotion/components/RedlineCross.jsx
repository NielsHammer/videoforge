import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { wrong: "The barbarians destroyed Rome", right: "Rome destroyed itself" }
export const RedlineCross = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.wrong) return null;

  const wrong = data.wrong;
  const right = data.right || "";

  const wrongOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.5, fps * 0.85], ["0%", "100%"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightOp = interpolate(clipFrame, [fps * 0.9, fps * 1.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightY = interpolate(clipFrame, [fps * 0.9, fps * 1.3], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const wrongSize = wrong.length > 50 ? 26 : wrong.length > 30 ? 34 : 44;
  const rightSize = right.length > 50 ? 28 : right.length > 30 ? 36 : 46;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 32 }}>
      {/* Wrong statement with cross */}
      <div style={{ position: "relative", opacity: wrongOp, width: "100%" }}>
        <div style={{ fontSize: wrongSize, fontWeight: 700, fontFamily: "Arial, sans-serif", color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 1.4 }}>
          {wrong}
        </div>
        {/* Red crossing line */}
        <div style={{ position: "absolute", top: "50%", left: 0, width: lineW, height: 4, background: "#ef4444", transform: "translateY(-50%)", borderRadius: 2, boxShadow: "0 0 12px rgba(239,68,68,0.8)" }} />
      </div>

      {/* Right statement */}
      {right && (
        <div style={{ fontSize: rightSize, fontWeight: 800, fontFamily: "Arial, sans-serif", color: "white", textAlign: "center", lineHeight: 1.4, opacity: rightOp, transform: `translateY(${rightY}px)`, textShadow: `0 0 20px ${accent}40` }}>
          {right}
        </div>
      )}
    </div>
  );
};

// FlashbackCard — "FLASHBACK" with film grain and year. Cinematic scene setter.
// FULL SCREEN OVERLAY. Appears briefly to signal a historical flashback.
// data: { year: "44 BC", label: "FLASHBACK", context: "The Ides of March" }
