import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

export const CanvaEditor = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const designTitle = data.design_title || "Untitled design";
  const templateName = data.template_name || "YouTube Thumbnail";
  const canvasText = data.canvas_text || "YOUR HEADLINE";
  const accentColor = data.accent_color || "#00c4cc";

  const canvasFloat = Math.sin(clipFrame / fps * 0.6) * 2;
  const canvasScale = interpolate(springIn(clipFrame, fps, 0.2, 0.5), [0, 1], [0.92, 1]);

  return (
    <AnimatedBg tint1={accentColor} tint2="#7b2cff" tint3="#00e1ff" baseColor="#04060e">
      <ParticleField count={30} color="rgba(0,196,204,0.25)" />

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 74,
        background: "linear-gradient(180deg, rgba(10,12,22,0.95), rgba(10,12,22,0.8))",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", padding: "0 32px", gap: 20,
        opacity: springIn(clipFrame, fps, 0, 0.3),
      }}>
        <div style={{
          fontSize: 28, fontWeight: 900, color: accentColor,
          letterSpacing: "-0.8px",
          textShadow: `0 0 ${breathe(clipFrame, fps, 2.6, 12, 22)}px ${accentColor}aa`,
        }}>Canva</div>
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ fontSize: 14, color: "#9ca3af" }}>{designTitle}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <div style={{ padding: "9px 18px", background: "rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 13, color: "#e5e7eb" }}>Share</div>
          <div style={{
            padding: "9px 18px",
            background: `linear-gradient(135deg, ${accentColor}, #0099a3)`,
            color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 700,
            boxShadow: `0 4px 16px ${accentColor}60`,
          }}>Download</div>
        </div>
      </div>

      {/* Main work area */}
      <div style={{
        position: "absolute", top: 74, left: 0, right: 0, bottom: 0,
        display: "flex",
      }}>
        {/* Left panel */}
        <div style={{
          width: 260,
          background: "linear-gradient(180deg, rgba(10,12,22,0.6), rgba(10,12,22,0.3))",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "24px 22px",
          opacity: springIn(clipFrame, fps, 0.1, 0.4),
        }}>
          <div style={{
            fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.4,
            fontWeight: 700, marginBottom: 18,
          }}>Templates</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[0, 1, 2, 3, 4, 5].map(i => {
              const op = springIn(clipFrame, fps, 0.35 + i * 0.08, 0.4);
              return (
                <div key={i} style={{
                  aspectRatio: "16/9",
                  background: `linear-gradient(135deg, hsl(${(i * 60) % 360}, 70%, 55%), hsl(${(i * 60 + 50) % 360}, 70%, 30%))`,
                  borderRadius: 8,
                  opacity: op,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }} />
              );
            })}
          </div>
        </div>

        {/* Canvas area */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 60,
        }}>
          <div style={{
            width: 780, aspectRatio: "16/9",
            background: `linear-gradient(135deg, ${accentColor}, #7b2cff, #ff2a88)`,
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${canvasScale}) translateY(${canvasFloat}px)`,
            position: "relative",
            boxShadow: `
              0 40px 120px rgba(0,0,0,0.6),
              0 20px 60px ${accentColor}40,
              inset 0 1px 0 rgba(255,255,255,0.2)
            `,
            overflow: "hidden",
          }}>
            {/* Shimmer */}
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${((clipFrame / fps * 20) % 140 - 20)}%`,
              width: "22%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
              pointerEvents: "none",
            }} />
            <div style={{
              fontSize: 66, fontWeight: 900, color: "#fff",
              textAlign: "center", letterSpacing: "-1.5px",
              textShadow: "0 6px 30px rgba(0,0,0,0.5)",
              maxWidth: "85%",
              fontFamily: "'Arial Black', Arial, sans-serif",
            }}>{canvasText}</div>
            <div style={{
              position: "absolute", top: 14, right: 14,
              fontSize: 10, color: "rgba(255,255,255,0.65)",
              padding: "5px 10px", background: "rgba(0,0,0,0.35)", borderRadius: 5,
              letterSpacing: 1,
            }}>{templateName}</div>
          </div>
        </div>
      </div>
    </AnimatedBg>
  );
};
