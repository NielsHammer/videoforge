import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const MythFact = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const myth = data.myth || "What people believe";
  const fact = data.fact || "The truth";
  const label = data.label || "MYTH BUSTED";

  const mythOp = interpolate(clipFrame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });
  const mythY = interpolate(clipFrame, [0, fps * 0.3], [-40, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // MYTH badge slams in
  const badgeScale = interpolate(clipFrame, [fps * 0.4, fps * 0.55], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  // Fact reveals with green glow
  const factOp = interpolate(clipFrame, [fps * 0.65, fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const factX = interpolate(clipFrame, [fps * 0.65, fps * 0.9], [60, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "50px 100px", gap: 32,
    }}>
      {/* MYTH section */}
      <div style={{
        opacity: mythOp, transform: `translateY(${mythY}px)`,
        width: "100%", position: "relative",
        padding: "28px 36px",
        background: "rgba(239,68,68,0.08)",
        border: "1.5px solid rgba(239,68,68,0.25)",
        borderRadius: 12,
      }}>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 16, color: "#ef4444",
          textTransform: "uppercase", letterSpacing: 4,
          marginBottom: 12,
        }}>❌ MYTH</div>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 500,
          fontSize: 26, color: "rgba(255,255,255,0.75)",
          fontStyle: "italic",
        }}>"{myth}"</div>

        {/* BUSTED stamp */}
        <div style={{
          position: "absolute", top: -12, right: 24,
          transform: `scale(${badgeScale}) rotate(-15deg)`,
          background: "#ef4444",
          padding: "6px 20px",
          borderRadius: 4,
          fontFamily: "sans-serif", fontWeight: 900,
          fontSize: 20, color: "#fff",
          letterSpacing: 2,
        }}>BUSTED</div>
      </div>

      {/* Arrow */}
      <div style={{
        opacity: factOp,
        fontSize: 40, color: "#22c55e",
      }}>↓</div>

      {/* FACT section */}
      <div style={{
        opacity: factOp, transform: `translateX(${factX}px)`,
        width: "100%",
        padding: "28px 36px",
        background: "rgba(34,197,94,0.1)",
        border: "2px solid rgba(34,197,94,0.4)",
        borderRadius: 12,
        boxShadow: "0 0 30px rgba(34,197,94,0.15)",
      }}>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 16, color: "#22c55e",
          textTransform: "uppercase", letterSpacing: 4,
          marginBottom: 12,
        }}>✅ FACT</div>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 600,
          fontSize: 28, color: "#ffffff",
        }}>{fact}</div>
      </div>
    </div>
  );
};
