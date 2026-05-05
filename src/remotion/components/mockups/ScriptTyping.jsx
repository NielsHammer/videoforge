import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * ScriptTyping — animated code-editor style typing of a script.
 * Premium: glowing cursor, window chrome, continuous motion.
 */
export const ScriptTyping = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "script.md";
  const lines = (data.lines || []).slice(0, 10);
  const cursorBlink = Math.sin(clipFrame / fps * 6) > 0;

  // Per-line start times — line i starts after line i-1 finishes typing
  const lineStartFrames = [];
  let cumulative = fps * 0.4;
  for (const line of lines) {
    lineStartFrames.push(cumulative);
    cumulative += Math.max(fps * 0.3, (line?.length || 0) * 1.1);
  }

  return (
    <AnimatedBg tint1="#3b82f6" tint2="#8b5cf6" tint3="#06b6d4" baseColor="#050814">
      <ParticleField count={35} color="rgba(120,180,255,0.3)" />

      <div style={{
        position: "absolute", inset: "60px 70px",
        display: "flex", flexDirection: "column",
      }}>
        <PremiumCard accent="#3b82f6" style={{ flex: 1, padding: 0, overflow: "hidden" }}>
          {/* Editor chrome (title bar) */}
          <div style={{
            background: "linear-gradient(180deg, #161b22 0%, #0d1117 100%)",
            padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#ff5f57", boxShadow: "0 0 8px rgba(255,95,87,0.6)" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#febc2e", boxShadow: "0 0 8px rgba(254,188,46,0.5)" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#28c840", boxShadow: "0 0 8px rgba(40,200,64,0.5)" }} />
            <div style={{ marginLeft: 18, fontSize: 13, color: "#8b949e", fontFamily: "'JetBrains Mono', monospace" }}>{title}</div>
            {/* Right side: fake "saving" indicator */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#6e7681" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#22ee88",
                opacity: 0.5 + Math.sin(clipFrame / fps * 2) * 0.4,
                boxShadow: "0 0 8px #22ee88",
              }} />
              <span>Autosaved</span>
            </div>
          </div>

          {/* Editor body */}
          <div style={{
            flex: 1,
            background: "linear-gradient(180deg, #0d1117 0%, #060a12 100%)",
            padding: "30px 0",
            overflow: "hidden",
            position: "relative",
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
          }}>
            {lines.map((line, i) => {
              const start = lineStartFrames[i];
              const lineLen = (line || "").length;
              const charsVisible = Math.floor(
                interpolate(
                  clipFrame,
                  [start, start + Math.max(fps * 0.3, lineLen * 1.1)],
                  [0, lineLen],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )
              );
              const displayed = (line || "").slice(0, charsVisible);
              const isCurrent = clipFrame >= start && charsVisible < lineLen;
              const isHeading = line?.startsWith("#");
              // subtle vertical float per line
              const floatY = Math.sin(clipFrame / fps * 0.6 + i * 0.8) * 0.5;
              return (
                <div key={i} style={{
                  display: "flex", padding: "5px 30px",
                  fontSize: 19, lineHeight: 1.7,
                  transform: `translateY(${floatY}px)`,
                  opacity: clipFrame < start ? 0.3 : 1,
                }}>
                  <div style={{
                    width: 44, color: "#586069", textAlign: "right",
                    marginRight: 22, flexShrink: 0, fontWeight: 500,
                  }}>{i + 1}</div>
                  <div style={{
                    color: isHeading ? "#ff7b72" : "#c9d1d9",
                    fontWeight: isHeading ? 700 : 400,
                    textShadow: isCurrent ? `0 0 10px ${isHeading ? "#ff7b72" : "#58a6ff"}40` : "none",
                  }}>
                    {displayed}
                    {isCurrent && cursorBlink && (
                      <span style={{
                        display: "inline-block",
                        width: 10, height: 22,
                        background: "#58a6ff",
                        verticalAlign: "middle",
                        marginLeft: 2,
                        boxShadow: "0 0 14px rgba(88,166,255,0.8)",
                      }} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Editor glow accent in bottom right */}
            <div style={{
              position: "absolute",
              bottom: 0, right: 0,
              width: 300, height: 300,
              background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
