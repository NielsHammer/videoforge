import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * PriceTag — dramatic cost/price reveal with a large animated number,
 * optional strikethrough "was" price, and context label.
 * data: { price: "$4,200", was: "$2,000", label: "hidden cost per week", context: "optional subtext" }
 */
export const PriceTag = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const price = data.price || "$0";
  const was = data.was || "";
  const label = data.label || "";
  const context = data.context || "";

  const scale = springIn(clipFrame, fps, 0.15);
  const priceOp = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wasOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = breathe(clipFrame, fps, 0.8);

  // Determine if it's a "bad" price (red tones) or neutral
  const isNegative = price.includes("-") || (was && parseFloat(price.replace(/[^0-9.]/g, "")) > parseFloat(was.replace(/[^0-9.]/g, "")));
  const priceColor = isNegative ? "#ef4444" : "#fff";

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        {/* Was price (strikethrough) */}
        {was && (
          <div style={{ opacity: wasOp, marginBottom: 12 }}>
            <span style={{ fontSize: 40, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif", fontWeight: 500, textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.3)" }}>
              {was}
            </span>
          </div>
        )}

        {/* Main price */}
        <div style={{ opacity: priceOp, transform: `scale(${0.95 + glow * 0.05})` }}>
          <div style={{
            fontSize: 140, fontWeight: 800, color: priceColor, fontFamily: "Inter, sans-serif",
            textShadow: `0 0 60px ${priceColor}30, 0 4px 20px rgba(0,0,0,0.5)`,
            letterSpacing: -2,
          }}>
            {price}
          </div>
        </div>

        {/* Label */}
        <div style={{ opacity: labelOp, marginTop: 16 }}>
          <div style={{ fontSize: 30, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
            {label}
          </div>
        </div>

        {/* Context */}
        {context && (
          <div style={{ opacity: labelOp, marginTop: 12 }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>
              {context}
            </div>
          </div>
        )}
      </div>
    </AnimatedBg>
  );
};
