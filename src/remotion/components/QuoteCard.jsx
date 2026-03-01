import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const QuoteCard = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const quote = data.quote || data.title || "";
  const author = data.author || data.subtitle || "";

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
      <div style={{
        position: "absolute", top: 200, left: 260, fontSize: 300, fontFamily: "Georgia, serif",
        color: "#4a9eff",
        opacity: interpolate(frame, [0, fps * 0.4], [0, 0.15], { extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(frame, [0, fps * 0.5], [0.6, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })})`,
        lineHeight: 1,
      }}>"</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, zIndex: 1 }}>
        <div style={{
          fontSize: 48, fontWeight: 400, fontStyle: "italic", color: "white",
          fontFamily: "Georgia, serif", textAlign: "center", lineHeight: 1.6, maxWidth: 1100,
          opacity: interpolate(frame, [fps * 0.2, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [fps * 0.2, fps * 0.7], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
        }}>"{quote}"</div>

        {author && (
          <div style={{
            fontSize: 28, color: "#5a7aa0", fontFamily: "Helvetica Neue, Arial, sans-serif",
            opacity: interpolate(frame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}>— {author}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
