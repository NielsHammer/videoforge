import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * ChatgptChat — premium version with continuous motion and glow.
 */
export const ChatgptChat = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const messages = (data.messages || []).slice(0, 3);
  const logoGlow = breathe(clipFrame, fps, 2.6, 15, 35);

  return (
    <AnimatedBg tint1="#10a37f" tint2="#14b8a6" tint3="#0f766e" baseColor="#050810">
      <ParticleField count={30} color="rgba(16,163,127,0.25)" />

      {/* Top logo */}
      <div style={{
        position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 14,
        opacity: springIn(clipFrame, fps, 0, 0.4),
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: "linear-gradient(135deg, #10a37f, #0d8c6b)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 ${logoGlow}px rgba(16,163,127,0.6)`,
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
            <path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" />
          </svg>
        </div>
        <div style={{
          fontSize: 24, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.5px", textShadow: "0 2px 16px rgba(0,0,0,0.8)",
        }}>ChatGPT</div>
      </div>

      {/* Messages */}
      <div style={{
        position: "absolute", inset: "140px 100px 80px 100px",
        display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 22,
      }}>
        {messages.map((m, i) => {
          const msgOp = springIn(clipFrame, fps, 0.3 + i * 0.55, 0.5);
          const msgY = interpolate(msgOp, [0, 1], [16, 0]);
          const text = m.text || "";
          const typeStart = fps * (0.4 + i * 0.55);
          const typeDur = Math.max(fps * 0.3, text.length * 0.5);
          const charsVisible = m.role === "assistant"
            ? Math.floor(interpolate(clipFrame, [typeStart, typeStart + typeDur], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))
            : text.length;
          const displayed = text.slice(0, charsVisible);
          const isUser = m.role === "user";

          return (
            <div key={i} style={{
              display: "flex", gap: 16,
              opacity: msgOp, transform: `translateY(${msgY}px)`,
              flexDirection: isUser ? "row-reverse" : "row",
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: isUser
                  ? "linear-gradient(135deg, #5b7bf5, #3a55d1)"
                  : "linear-gradient(135deg, #10a37f, #0d8c6b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: "#fff",
                boxShadow: isUser
                  ? "0 6px 20px rgba(91,123,245,0.4)"
                  : "0 6px 20px rgba(16,163,127,0.4)",
              }}>{isUser ? "U" : "✦"}</div>
              <div style={{
                background: isUser
                  ? "linear-gradient(135deg, rgba(91,123,245,0.15), rgba(91,123,245,0.05))"
                  : "linear-gradient(135deg, rgba(16,163,127,0.12), rgba(16,163,127,0.02))",
                border: isUser
                  ? "1px solid rgba(91,123,245,0.3)"
                  : "1px solid rgba(16,163,127,0.25)",
                padding: "18px 22px",
                borderRadius: 18,
                fontSize: 17, lineHeight: 1.65,
                maxWidth: 760, color: "#e8eaed",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>{displayed}{m.role === "assistant" && charsVisible < text.length && <span style={{ opacity: 0.7 }}>▌</span>}</div>
            </div>
          );
        })}
      </div>
    </AnimatedBg>
  );
};
