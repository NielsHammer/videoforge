import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * HandwrittenNote — a statement rendered as an elegant handwritten line on
 * textured cream paper. No flashing. Ink appears letter-by-letter as a
 * slow, calm reveal.
 * data: { text: "the statement text", signature: "optional name" }
 */
export const HandwrittenNote = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const text = data.text || "";
  const signature = data.signature || "";

  // Ink reveal: characters appear smoothly across ~1.5 seconds
  const revealProgress = interpolate(clipFrame, [fps * 0.3, fps * 0.3 + Math.max(fps * 0.8, text.length * 1.4)], [0, text.length], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const visible = text.slice(0, Math.floor(revealProgress));
  const paperFloat = Math.sin(clipFrame / fps * 0.4) * 2;
  const paperRot = Math.sin(clipFrame / fps * 0.3) * 0.4;

  return (
    <AnimatedBg tint1="#c8a15c" tint2="#8b6f47" tint3="#3a2e1f" baseColor="#0a0806">
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 1400, padding: "90px 110px",
          background: "radial-gradient(ellipse at center, #faf6ec 0%, #ede3c8 55%, #d9ca9f 100%)",
          borderRadius: 6,
          transform: `translateY(${paperFloat}px) rotate(${paperRot - 0.6}deg)`,
          boxShadow: `
            0 40px 120px rgba(0,0,0,0.8),
            0 10px 40px rgba(0,0,0,0.5),
            inset 0 0 100px rgba(101, 67, 33, 0.1),
            inset 0 0 0 1px rgba(101,67,33,0.15)
          `,
          opacity: springIn(clipFrame, fps, 0, 0.6),
          position: "relative",
        }}>
          {/* Paper texture — subtle fiber pattern */}
          <div style={{
            position: "absolute", inset: 0,
            background: "repeating-linear-gradient(45deg, rgba(139,111,71,0.02) 0, rgba(139,111,71,0.02) 1px, transparent 1px, transparent 4px)",
            pointerEvents: "none",
            borderRadius: 6,
          }} />
          {/* Handwritten text */}
          <div style={{
            fontFamily: "'Caveat', 'Dancing Script', 'Kalam', cursive",
            fontSize: text.length > 80 ? 52 : 68,
            color: "#1d1810",
            lineHeight: 1.3,
            letterSpacing: "0.5px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
            textShadow: "0 1px 0 rgba(0,0,0,0.05)",
          }}>
            {visible}
            {visible.length < text.length && (
              <span style={{ opacity: 0.6 }}>|</span>
            )}
          </div>
          {signature && visible.length >= text.length && (
            <div style={{
              marginTop: 30,
              textAlign: "right",
              fontFamily: "'Caveat', cursive",
              fontSize: 36,
              color: "#5c4a2a",
              opacity: springIn(clipFrame, fps, 2.0, 0.4),
              fontStyle: "italic",
            }}>— {signature}</div>
          )}
        </div>
      </div>
    </AnimatedBg>
  );
};
