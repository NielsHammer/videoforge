import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * ElevenlabsVoices — premium voice library view with animated waveforms.
 */
export const ElevenlabsVoices = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const voices = (data.voices || []).slice(0, 4);

  return (
    <AnimatedBg tint1="#a855f7" tint2="#6366f1" tint3="#ec4899" baseColor="#050514">
      <ParticleField count={32} color="rgba(168,85,247,0.3)" />

      {/* Header */}
      <div style={{
        position: "absolute", top: 56, left: 60, right: 60,
        display: "flex", alignItems: "center", gap: 18,
        opacity: springIn(clipFrame, fps, 0, 0.4),
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: "linear-gradient(135deg, #fff 0%, #e0e0e0 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#0a0a0a", fontWeight: 900, fontSize: 22,
          boxShadow: `0 0 ${breathe(clipFrame, fps, 2.4, 20, 40)}px rgba(255,255,255,0.4)`,
        }}>11</div>
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.5px",
        }}>ElevenLabs</div>
        <div style={{
          marginLeft: "auto",
          padding: "10px 18px",
          background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 999,
          fontSize: 13, color: "#e0d4ff", fontWeight: 600,
        }}>Voice Library</div>
      </div>

      {/* Voice cards */}
      <div style={{
        position: "absolute", top: 160, left: 60, right: 60, bottom: 60,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22,
      }}>
        {voices.map((v, i) => {
          const op = springIn(clipFrame, fps, 0.2 + i * 0.12, 0.55);
          const ty = interpolate(op, [0, 1], [18, 0]);
          const floatOffset = Math.sin(clipFrame / fps * 0.8 + i * 1.2) * 1.5;
          const hue = (i * 80) % 360;

          return (
            <PremiumCard
              key={i}
              accent={`hsl(${hue}, 75%, 60%)`}
              style={{
                padding: "26px 28px",
                opacity: op,
                transform: `translateY(${ty + floatOffset}px)`,
              }}
            >
              {/* Voice avatar + name row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: `linear-gradient(135deg, hsl(${hue}, 75%, 55%), hsl(${hue + 40}, 75%, 40%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800, color: "#fff",
                  boxShadow: `0 6px 24px hsla(${hue}, 75%, 55%, 0.5)`,
                }}>{(v.name || "?").charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{v.name || "Voice"}</div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{v.language || "English"}</div>
                </div>
                {/* Play button */}
                <div style={{
                  marginLeft: "auto",
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg, #fff, #e5e7eb)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(255,255,255,0.3)",
                }}>
                  <div style={{
                    width: 0, height: 0,
                    borderLeft: "12px solid #0a0a0a",
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    marginLeft: 3,
                  }} />
                </div>
              </div>

              {/* Description */}
              <div style={{
                fontSize: 13, color: "#b8bcc8", lineHeight: 1.5,
                minHeight: 40, marginBottom: 16,
              }}>{v.description || ""}</div>

              {/* Animated waveform */}
              <div style={{
                display: "flex", alignItems: "center", gap: 4, height: 36,
                padding: "4px 0",
              }}>
                {Array.from({ length: 38 }).map((_, w) => {
                  const t = clipFrame / fps;
                  const h = 4 + Math.abs(Math.sin(t * 3 + w * 0.4 + i * 1.5)) * 28;
                  return (
                    <div key={w} style={{
                      width: 3, height: h,
                      background: `linear-gradient(180deg, hsl(${hue}, 75%, 70%), hsl(${hue}, 75%, 50%))`,
                      borderRadius: 2,
                      boxShadow: `0 0 6px hsla(${hue}, 75%, 60%, 0.6)`,
                    }} />
                  );
                })}
              </div>
            </PremiumCard>
          );
        })}
      </div>
    </AnimatedBg>
  );
};
