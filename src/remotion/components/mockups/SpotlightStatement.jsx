import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * SpotlightStatement — a single line presented with a slow theatrical
 * spotlight that opens up from darkness and holds the text in a warm pool
 * of light. Elegant, cinematic, zero flashing.
 * data: { text: "the line", kicker: "optional small line above" }
 */
export const SpotlightStatement = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const text = data.text || "";
  const kicker = data.kicker || "";

  // Spotlight radius grows from 0 to full
  const spotRadius = interpolate(clipFrame, [0, fps * 0.9], [0, 900], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const textOp = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const kickerOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Continuous gentle breathing on the spotlight
  const breath = breathe(clipFrame, fps, 3.2, 0.92, 1.0);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#030308", overflow: "hidden" }}>
      {/* Spotlight radial gradient — this is THE visual element */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: spotRadius * 2 * breath, height: spotRadius * 2 * breath,
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(255,218,158,0.18) 0%, rgba(255,200,120,0.08) 30%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* Second tighter spotlight for the text core */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: spotRadius * 1.2 * breath, height: spotRadius * 1.2 * breath,
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(255,240,210,0.25) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      {/* Text */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        {kicker && (
          <div style={{
            fontSize: 18, color: "rgba(255,220,180,0.75)",
            textTransform: "uppercase", letterSpacing: 6,
            fontWeight: 600,
            marginBottom: 24,
            opacity: kickerOp,
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          }}>{kicker}</div>
        )}
        <div style={{
          fontSize: text.length > 60 ? 58 : 76,
          fontWeight: 700,
          color: "#ffeedc",
          letterSpacing: "-0.5px",
          lineHeight: 1.25,
          textAlign: "center",
          maxWidth: 1400,
          opacity: textOp,
          transform: `translateY(${textY}px)`,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          textShadow: "0 4px 40px rgba(255,180,80,0.35), 0 2px 20px rgba(0,0,0,0.8)",
          padding: "0 80px",
        }}>{text}</div>
      </div>
    </div>
  );
};
