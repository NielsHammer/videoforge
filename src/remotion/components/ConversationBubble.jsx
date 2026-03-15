import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// ConversationBubble — Chat-style dialogue between two perspectives
// data: { exchanges: [{speaker:"Most People",text:"I'll start saving when I earn more",side:"left"},{speaker:"The 4%",text:"I save first, spend what's left",side:"right"}] }
// USE WHEN: narrator contrasts two mindsets, people, or approaches through dialogue
export const ConversationBubble = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.exchanges?.length) return null;

  const exchanges = data.exchanges.slice(0, 4);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 70px", gap: 16 }}>
      {exchanges.map((ex, i) => {
        const delay = fps * (0.1 + i * 0.5);
        const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(clipFrame, [delay, delay + fps * 0.3], [ex.side === "right" ? 30 : -30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const isRight = ex.side === "right";
        const bubbleColor = isRight ? accent : "rgba(255,255,255,0.08)";
        const textColor = isRight ? "white" : "rgba(255,255,255,0.85)";
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isRight ? "flex-end" : "flex-start", opacity: op, transform: `translateX(${x}px)` }}>
            <div style={{ fontSize: 12, color: isRight ? accent : "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 6, paddingLeft: isRight ? 0 : 12, paddingRight: isRight ? 12 : 0 }}>
              {ex.speaker}
            </div>
            <div style={{ maxWidth: "70%", background: bubbleColor, border: `1px solid ${isRight ? accent + "40" : "rgba(255,255,255,0.1)"}`, borderRadius: isRight ? "20px 4px 20px 20px" : "4px 20px 20px 20px", padding: "14px 18px", boxShadow: isRight ? `0 4px 20px ${accent}20` : "none" }}>
              <div style={{ fontSize: 18, color: textColor, fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>
                {ex.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
