import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * QuotePull v1
 * Full-screen card showing one powerful complete sentence from the script.
 * NOT word-by-word — it's a static complete thought that fades in then out.
 * Used as a punchy chapter break / emphasis moment.
 */
export const QuotePull = ({ data, theme = "blue_grid" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const glowColor = th.section?.glowColor || `${accent}40`;

  const { quote = "", attribution = "" } = data || {};

  // Fade in over 12 frames, hold, fade out last 12 frames
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.4, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // Slight upward drift
  const y = interpolate(frame, [0, durationInFrames], [8, -8], {
    extrapolateRight: "clamp",
  });

  // Subtle scale breathe
  const scale = 1 + Math.sin(frame / fps * 1.2) * 0.003;

  return (
    <AbsoluteFill style={{
      justifyContent: "center",
      alignItems: "center",
      opacity,
      background: "rgba(4, 8, 20, 0.88)",
      backdropFilter: "blur(4px)",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute",
        width: 600,
        height: 400,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${glowColor}, transparent 65%)`,
        filter: "blur(60px)",
        opacity: 0.6,
      }} />

      {/* Quote mark decoration */}
      <div style={{
        position: "absolute",
        top: "18%",
        left: "10%",
        fontSize: 200,
        fontFamily: "Georgia, serif",
        color: `${accent}12`,
        lineHeight: 1,
        userSelect: "none",
        fontWeight: 900,
      }}>"</div>

      {/* Main content */}
      <div style={{
        transform: `translateY(${y}px) scale(${scale})`,
        maxWidth: 1000,
        padding: "0 80px",
        textAlign: "center",
        zIndex: 1,
      }}>
        {/* Accent line */}
        <div style={{
          width: 60,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          margin: "0 auto 32px",
          borderRadius: 2,
        }} />

        {/* Quote text */}
        <div style={{
          fontSize: 52,
          fontWeight: 900,
          fontStyle: "italic",
          color: "#ffffff",
          fontFamily: "Arial Black, Arial, sans-serif",
          lineHeight: 1.25,
          textShadow: `0 4px 30px rgba(0,0,0,0.8), 0 0 60px ${accent}30`,
          letterSpacing: -0.5,
        }}>
          {quote}
        </div>

        {/* Attribution if any */}
        {attribution && (
          <div style={{
            marginTop: 28,
            fontSize: 20,
            fontWeight: 600,
            color: accent,
            fontFamily: "Arial, sans-serif",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}>
            — {attribution}
          </div>
        )}

        {/* Bottom accent line */}
        <div style={{
          width: 60,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          margin: "32px auto 0",
          borderRadius: 2,
        }} />
      </div>
    </AbsoluteFill>
  );
};
