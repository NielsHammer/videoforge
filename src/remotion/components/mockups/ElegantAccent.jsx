import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * ElegantAccent — a statement presented with an elegant vertical accent
 * bar, serif typography, and subtle continuous motion. Editorial magazine
 * feel. Zero flashing.
 * data: { text: "the line", kicker: "optional small label above", attribution: "optional" }
 */
export const ElegantAccent = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const text = data.text || "";
  const kicker = data.kicker || "";
  const attribution = data.attribution || "";

  // Accent bar grows from 0 to full height
  const barProgress = interpolate(clipFrame, [fps * 0.1, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const textOp = springIn(clipFrame, fps, 0.4, 0.7);
  const textX = interpolate(textOp, [0, 1], [20, 0]);
  const kickerOp = springIn(clipFrame, fps, 0.3, 0.5);
  const attrOp = springIn(clipFrame, fps, 1.0, 0.5);

  const barGlow = breathe(clipFrame, fps, 3, 15, 30);

  return (
    <AnimatedBg tint1="#fbbf24" tint2="#f59e0b" tint3="#78350f" baseColor="#0a0603">
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          display: "flex", alignItems: "stretch", gap: 40,
          maxWidth: 1500,
          padding: "0 120px",
        }}>
          {/* Vertical accent bar */}
          <div style={{
            width: 6,
            background: "linear-gradient(180deg, #fbbf24, #d97706)",
            transformOrigin: "top",
            transform: `scaleY(${barProgress})`,
            boxShadow: `0 0 ${barGlow}px rgba(251,191,36,0.6)`,
            borderRadius: 3,
            flexShrink: 0,
          }} />

          {/* Content */}
          <div style={{
            flex: 1,
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            {kicker && (
              <div style={{
                fontSize: 16,
                color: "#fbbf24",
                textTransform: "uppercase",
                letterSpacing: 4,
                fontWeight: 700,
                marginBottom: 24,
                opacity: kickerOp,
                fontFamily: "'Inter', sans-serif",
              }}>{kicker}</div>
            )}
            <div style={{
              fontSize: text.length > 80 ? 54 : 68,
              fontWeight: 700,
              color: "#faf6ec",
              lineHeight: 1.3,
              letterSpacing: "-0.3px",
              opacity: textOp,
              transform: `translateX(${textX}px)`,
              fontFamily: "'Playfair Display', 'Crimson Text', Georgia, serif",
              textShadow: "0 4px 30px rgba(0,0,0,0.8)",
            }}>{text}</div>
            {attribution && (
              <div style={{
                marginTop: 26,
                fontSize: 18,
                color: "#d4af37",
                fontStyle: "italic",
                opacity: attrOp,
                letterSpacing: 1,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>— {attribution}</div>
            )}
          </div>
        </div>
      </div>
    </AnimatedBg>
  );
};
