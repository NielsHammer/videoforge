import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { left: "RICH MINDSET", right: "POOR MINDSET", leftColor: "accent|green|white", rightColor: "red|white" }
export const SplitText = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.left || !data?.right) return null;

  const left = (data.left || "").toUpperCase();
  const right = (data.right || "").toUpperCase();
  const colorMap = { accent, green: "#22c55e", red: "#ef4444", white: "white", gold: "#f59e0b" };
  const leftColor = colorMap[data.leftColor] || accent;
  const rightColor = colorMap[data.rightColor] || "#ef4444";

  const leftX = interpolate(clipFrame, [0, fps * 0.45], [-300, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
  const rightX = interpolate(clipFrame, [0, fps * 0.45], [300, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
  const lineOp = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = Math.max(left.length, right.length) > 15 ? 44 : Math.max(left.length, right.length) > 10 ? 56 : 72;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Left half */}
      <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 40, background: `linear-gradient(90deg, transparent, ${leftColor}08)`, transform: `translateX(${leftX}px)` }}>
        <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: leftColor, textTransform: "uppercase", letterSpacing: 3, textAlign: "right", lineHeight: 1.15, textShadow: `0 0 40px ${leftColor}60` }}>
          {left}
        </div>
      </div>

      {/* Center divider */}
      <div style={{ width: 3, height: "70%", background: `linear-gradient(180deg, transparent, rgba(255,255,255,0.4), transparent)`, opacity: lineOp, flexShrink: 0 }} />

      {/* Right half */}
      <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 40, background: `linear-gradient(270deg, transparent, ${rightColor}08)`, transform: `translateX(${rightX}px)` }}>
        <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: rightColor, textTransform: "uppercase", letterSpacing: 3, textAlign: "left", lineHeight: 1.15, textShadow: `0 0 40px ${rightColor}60` }}>
          {right}
        </div>
      </div>
    </div>
  );
};

// StampReveal — Text STAMPED onto screen like a rubber stamp. Impact and finality.
// CENTERED. Good for verdicts, classifications, outcomes.
// data: { text: "FAILED", subtext: "The Roman Republic — 509 BC to 27 BC", color: "red|green|accent|gold" }
