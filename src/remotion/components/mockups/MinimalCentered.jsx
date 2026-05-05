import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * MinimalCentered — one bold line, centered, maximum whitespace, slow fade in.
 * The entire statement carries the scene. Elegant, no noise.
 * data: { text: "the line", accent_word: "optional — which word to highlight in accent color" }
 */
export const MinimalCentered = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const text = data.text || "";
  const accentWord = data.accent_word || "";

  const textOp = springIn(clipFrame, fps, 0.1, 0.8);
  const textY = interpolate(textOp, [0, 1], [20, 0]);
  const scale = interpolate(textOp, [0, 1], [0.96, 1]);

  // Subtle line-beneath animation
  const lineWidth = interpolate(clipFrame, [fps * 0.6, fps * 1.2], [0, 180], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Parse accent word if present
  let parts = [{ text, accent: false }];
  if (accentWord && text.toLowerCase().includes(accentWord.toLowerCase())) {
    const idx = text.toLowerCase().indexOf(accentWord.toLowerCase());
    parts = [
      { text: text.slice(0, idx), accent: false },
      { text: text.slice(idx, idx + accentWord.length), accent: true },
      { text: text.slice(idx + accentWord.length), accent: false },
    ];
  }

  return (
    <AnimatedBg tint1="#22d3ee" tint2="#a855f7" tint3="#f97316" baseColor="#040614">
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 100,
      }}>
        <div style={{
          textAlign: "center",
          opacity: textOp,
          transform: `translateY(${textY}px) scale(${scale})`,
        }}>
          <div style={{
            fontSize: text.length > 60 ? 66 : 88,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-1.5px",
            lineHeight: 1.15,
            maxWidth: 1500,
            fontFamily: "'Inter', -apple-system, sans-serif",
            textShadow: "0 8px 40px rgba(0,0,0,0.7)",
          }}>
            {parts.map((p, i) => (
              <span key={i} style={p.accent ? {
                color: "#22d3ee",
                textShadow: `0 0 ${breathe(clipFrame, fps, 2, 20, 40)}px rgba(34,211,238,0.6), 0 8px 40px rgba(0,0,0,0.7)`,
              } : {}}>{p.text}</span>
            ))}
          </div>
          {/* Subtle accent line under the text */}
          <div style={{
            width: lineWidth, height: 3,
            background: "linear-gradient(90deg, transparent, #22d3ee, transparent)",
            margin: "32px auto 0",
            boxShadow: "0 0 20px rgba(34,211,238,0.6)",
          }} />
        </div>
      </div>
    </AnimatedBg>
  );
};
