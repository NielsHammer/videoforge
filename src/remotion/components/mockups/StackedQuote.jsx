import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, springIn, breathe } from "./_shared.jsx";

/**
 * StackedQuote — an elegant quote rendered on multiple lines with oversized
 * decorative quote marks in an accent color. Each line cascades in.
 * data: { lines: ["first line", "second line", "third line"], attribution: "optional" }
 */
export const StackedQuote = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const lines = (data.lines || []).slice(0, 4);
  const attribution = data.attribution || "";

  const markGlow = breathe(clipFrame, fps, 3, 20, 40);

  return (
    <AnimatedBg tint1="#6366f1" tint2="#ec4899" tint3="#06b6d4" baseColor="#050612">
      <ParticleField count={25} color="rgba(139,148,255,0.2)" />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          maxWidth: 1300,
          padding: "60px 100px",
          position: "relative",
        }}>
          {/* Opening quote mark — huge, decorative */}
          <div style={{
            position: "absolute",
            top: -60, left: 20,
            fontSize: 260, lineHeight: 0.7,
            color: "#6366f1",
            fontFamily: "Georgia, serif",
            opacity: 0.65,
            textShadow: `0 0 ${markGlow}px rgba(99,102,241,0.6)`,
            transform: `scale(${interpolate(springIn(clipFrame, fps, 0, 0.4), [0, 1], [0.7, 1])})`,
          }}>"</div>

          {/* Lines */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {lines.map((line, i) => {
              const op = springIn(clipFrame, fps, 0.3 + i * 0.22, 0.5);
              const ty = interpolate(op, [0, 1], [14, 0]);
              return (
                <div key={i} style={{
                  fontSize: 54,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.35,
                  letterSpacing: "-0.3px",
                  marginBottom: 4,
                  opacity: op,
                  transform: `translateY(${ty}px)`,
                  fontFamily: "'Inter', sans-serif",
                  textShadow: "0 4px 30px rgba(0,0,0,0.6)",
                }}>{line}</div>
              );
            })}
          </div>

          {/* Closing quote mark */}
          <div style={{
            position: "absolute",
            bottom: -140, right: 20,
            fontSize: 260, lineHeight: 0.7,
            color: "#ec4899",
            fontFamily: "Georgia, serif",
            opacity: 0.65,
            textShadow: `0 0 ${markGlow}px rgba(236,72,153,0.6)`,
            transform: `scale(${interpolate(springIn(clipFrame, fps, 0.2, 0.4), [0, 1], [0.7, 1])})`,
          }}>"</div>

          {attribution && (
            <div style={{
              marginTop: 30,
              fontSize: 20,
              color: "#9ca3af",
              fontStyle: "italic",
              letterSpacing: 1,
              opacity: springIn(clipFrame, fps, 0.3 + lines.length * 0.22 + 0.2, 0.4),
              position: "relative",
              zIndex: 1,
            }}>— {attribution}</div>
          )}
        </div>
      </div>
    </AnimatedBg>
  );
};
