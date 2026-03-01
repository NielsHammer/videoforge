import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const SectionBreak = ({ data, theme = "grid" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const th = getTheme(theme).section;
  const { number = "#1", title = "" } = data;

  const numScale = interpolate(frame, [0, fps * 0.08, fps * 0.15], [0.3, 1.15, 1], { extrapolateRight: "clamp" });
  const numOp = interpolate(frame, [0, fps * 0.06], [0, 1], { extrapolateRight: "clamp" });
  const titleChars = title.split("");
  const framesPerChar = fps / 28;
  const titleStart = fps * 0.12;
  const visibleTitleChars = Math.min(Math.floor((frame - titleStart) / framesPerChar), titleChars.length);
  const glow = 0.1 + Math.sin(frame / fps * 4) * 0.04;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: `radial-gradient(circle, ${th.glowColor}, transparent 55%)`,
        filter: "blur(50px)",
      }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, zIndex: 1 }}>
        <div style={{
          fontSize: 110, fontWeight: 900, fontStyle: "italic",
          fontFamily: "Helvetica Neue, Arial, sans-serif",
          color: th.numberColor, opacity: numOp, transform: `scale(${numScale})`,
          textShadow: `0 0 40px ${th.glowColor}`,
        }}>{number}</div>
        <div style={{
          fontSize: 52, fontWeight: 800, fontStyle: "italic",
          fontFamily: "Helvetica Neue, Arial, sans-serif",
          color: th.titleColor, textTransform: "uppercase", textAlign: "center",
          maxWidth: 1200, lineHeight: 1.2,
          textShadow: "0 4px 30px rgba(0,0,0,0.7)",
        }}>
          {frame > titleStart ? titleChars.slice(0, Math.max(0, visibleTitleChars)).join("") : ""}
          {visibleTitleChars < titleChars.length && visibleTitleChars > 0 && Math.floor(frame / (fps * 0.12)) % 2 === 0 && (
            <span style={{ color: th.dividerColor, fontWeight: 400, fontStyle: "normal" }}>|</span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
