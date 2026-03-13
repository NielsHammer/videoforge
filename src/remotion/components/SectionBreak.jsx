import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * SectionBreak v32
 * Now shows a hook_line (provocative sentence from the next section)
 * instead of just a generic number. Much better for retention.
 */
export const SectionBreak = ({ data, theme = "grid" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = getTheme(theme).section;
  const { number = "", title = "", hook_line = "" } = data;

  // Number animation
  const numScale = interpolate(frame, [0, fps * 0.08, fps * 0.15], [0.3, 1.15, 1], { extrapolateRight: "clamp" });
  const numOp = interpolate(frame, [0, fps * 0.06], [0, 1], { extrapolateRight: "clamp" });

  // Title slides up
  const titleY = interpolate(frame, [fps * 0.1, fps * 0.25], [30, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const titleOp = interpolate(frame, [fps * 0.1, fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Hook line slides up after title
  const hookY = interpolate(frame, [fps * 0.22, fps * 0.4], [30, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hookOp = interpolate(frame, [fps * 0.22, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const accent = th.dividerColor || "#3b82f6";

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", width: 500, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${th.glowColor}, transparent 55%)`,
        filter: "blur(60px)",
      }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, zIndex: 1, maxWidth: 1100, padding: "0 60px", textAlign: "center" }}>

        {/* Number — smaller if we have a hook line, skip if empty */}
        {number && (
          <div style={{
            fontSize: hook_line ? 72 : 110,
            fontWeight: 900,
            fontStyle: "italic",
            fontFamily: "Arial Black, Arial, sans-serif",
            color: th.numberColor,
            opacity: numOp,
            transform: `scale(${numScale})`,
            textShadow: `0 0 40px ${th.glowColor}`,
            lineHeight: 1,
          }}>{number}</div>
        )}

        {/* Title */}
        {title && (
          <div style={{
            fontSize: hook_line ? 36 : 52,
            fontWeight: 800,
            fontFamily: "Arial Black, Arial, sans-serif",
            color: th.titleColor,
            textTransform: "uppercase",
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            letterSpacing: 2,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}>{title}</div>
        )}

        {/* Divider */}
        {hook_line && (
          <div style={{
            width: 80, height: 3,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            borderRadius: 2,
            opacity: hookOp,
            transform: `translateY(${hookY}px)`,
          }} />
        )}

        {/* Hook line — the retention hook */}
        {hook_line && (
          <div style={{
            fontSize: 44,
            fontWeight: 900,
            fontStyle: "italic",
            fontFamily: "Arial Black, Arial, sans-serif",
            color: "#ffffff",
            opacity: hookOp,
            transform: `translateY(${hookY}px)`,
            lineHeight: 1.25,
            textShadow: `0 4px 30px rgba(0,0,0,0.8), 0 0 60px ${accent}25`,
            maxWidth: 900,
          }}>{hook_line}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
