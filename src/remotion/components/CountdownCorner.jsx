import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * CountdownCorner v1
 * Small persistent counter in top-right corner for list videos.
 * Shows "X left" counting down as each section is revealed.
 * ONLY rendered when director sets is_list_video: true.
 */
export const CountdownCorner = ({ data, theme = "blue_grid" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  const { current = 1, total = 10 } = data || {};
  const remaining = total - current;

  // Pop in animation
  const popIn = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  // Number change pulse
  const pulse = interpolate(frame, [0, fps * 0.15, fps * 0.3], [1.3, 0.95, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 40 }}>
      <div style={{
        position: "absolute",
        top: 32,
        right: 40,
        transform: `scale(${popIn})`,
        transformOrigin: "top right",
      }}>
        <div style={{
          background: "rgba(6, 12, 36, 0.92)",
          border: `1.5px solid ${accent}50`,
          borderRadius: 12,
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          backdropFilter: "blur(8px)",
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${accent}15`,
        }}>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: accent,
            fontFamily: "Arial Black, Arial, sans-serif",
            transform: `scale(${pulse})`,
            lineHeight: 1,
            minWidth: 32,
            textAlign: "center",
          }}>
            {remaining}
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.2,
          }}>
            {remaining === 1 ? "left" : "left"}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
