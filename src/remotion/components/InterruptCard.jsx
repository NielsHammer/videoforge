import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * InterruptCard v1
 * Slides in from the right side, displays a "Did you know?" fact,
 * hangs for ~3 seconds, then slides back out.
 * Overlays on top of whatever is playing — does not replace it.
 */
export const InterruptCard = ({ data, theme = "blue_grid" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.96)";

  const { fact = "", label = "Did you know?" } = data || {};

  // Slide in: 0 → 18 frames (0.6s)
  const slideIn = fps * 0.6;
  // Hold
  // Slide out: last 18 frames
  const slideOut = durationInFrames - fps * 0.6;

  const x = (() => {
    if (frame < slideIn) {
      return interpolate(frame, [0, slideIn], [460, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    if (frame > slideOut) {
      return interpolate(frame, [slideOut, durationInFrames], [0, 460], {
        extrapolateLeft: "clamp",
        easing: Easing.in(Easing.cubic),
      });
    }
    return 0;
  })();

  const opacity = interpolate(frame, [0, slideIn * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div style={{
        position: "absolute",
        right: 48,
        top: "50%",
        transform: `translateY(-50%) translateX(${x}px)`,
        opacity,
        width: 420,
        background: bg,
        border: `2px solid ${accent}60`,
        borderRadius: 16,
        padding: "28px 28px 24px",
        boxShadow: `0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px ${accent}20`,
        backdropFilter: "blur(12px)",
      }}>
        {/* Label */}
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: 2.5,
          fontFamily: "Arial Black, Arial, sans-serif",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }} />
          {label}
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, ${accent}60, transparent)`,
          marginBottom: 16,
        }} />

        {/* Fact text */}
        <div style={{
          fontSize: 26,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "Arial Black, Arial, sans-serif",
          lineHeight: 1.3,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}>
          {fact}
        </div>
      </div>
    </AbsoluteFill>
  );
};
