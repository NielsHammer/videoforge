import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { amount: "$400 BILLION", name: "Augustus Caesar", context: "Adjusted for inflation, 2026" }
export const NetWorthReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.amount) return null;

  const amount = data.amount;
  const name = data.name || "";
  const context = data.context || "";
  const gold = "#f59e0b";

  const nameOp = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const amountOp = interpolate(clipFrame, [fps * 0.3, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const amountY = interpolate(clipFrame, [fps * 0.3, fps * 0.8], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const contextOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.5, fps * 1.0], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const amountFontSize = amount.length > 14 ? 52 : amount.length > 10 ? 64 : 80;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Subtle gold radial */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />

      {name && (
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 6, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: nameOp, marginBottom: 16 }}>
          {name}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 5, color: `${gold}80`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: nameOp, marginBottom: 12 }}>
        NET WORTH
      </div>
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${gold}60, transparent)`, marginBottom: 20 }} />
      <div style={{ fontSize: amountFontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: gold, opacity: amountOp, transform: `translateY(${amountY}px)`, textShadow: `0 0 60px ${gold}60, 0 0 120px ${gold}20`, letterSpacing: 2 }}>
        {amount}
      </div>
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${gold}60, transparent)`, marginTop: 20 }} />
      {context && (
        <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.35)", fontFamily: "Arial, sans-serif", opacity: contextOp, marginTop: 16, textAlign: "center" }}>
          {context}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// TECHNOLOGY / AI
// ═══════════════════════════════════════════════

// CodeTerminal — Code scrolling in terminal. Hacking, programming aesthetic.
// data: { lines: ["$ initializing...", "> Loading model weights", "> Processing 1.8T parameters"], title: "AI TRAINING" }
