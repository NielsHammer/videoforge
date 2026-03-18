import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const ConversationBubble = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const exchanges = data.exchanges || [
    { speaker: "Most people", text: "I'll start investing when I have more money", side: "left" },
    { speaker: "Reality", text: "You'll never have more money if you don't start investing", side: "right" },
  ];

  const fadeIn = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, padding: "40px 80px", gap: 20,
    }}>
      {exchanges.slice(0, 3).map((ex, i) => {
        const delay = fps * (0.1 + i * 0.3);
        const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
        const x = interpolate(clipFrame, [delay, delay + fps * 0.35], [
          ex.side === "left" ? -60 : 60, 0
        ], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        const isLeft = ex.side === "left";
        const bubbleColor = isLeft ? "rgba(255,255,255,0.08)" : `${accent}22`;
        const borderColor = isLeft ? "rgba(255,255,255,0.12)" : `${accent}55`;

        return (
          <div key={i} style={{
            width: "100%",
            display: "flex", flexDirection: "column",
            alignItems: isLeft ? "flex-start" : "flex-end",
            opacity: op, transform: `translateX(${x}px)`,
          }}>
            <div style={{
              fontFamily: "sans-serif", fontSize: 12,
              color: isLeft ? "rgba(255,255,255,0.4)" : accent,
              marginBottom: 6, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 2,
            }}>{ex.speaker}</div>
            <div style={{
              maxWidth: "75%",
              padding: "16px 22px",
              background: bubbleColor,
              border: `1.5px solid ${borderColor}`,
              borderRadius: isLeft ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              boxShadow: isLeft ? "none" : `0 0 20px ${accent}22`,
            }}>
              <div style={{
                fontFamily: "sans-serif", fontWeight: isLeft ? 400 : 600,
                fontSize: 22, color: isLeft ? "rgba(255,255,255,0.75)" : "#ffffff",
                lineHeight: 1.4,
              }}>{ex.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
