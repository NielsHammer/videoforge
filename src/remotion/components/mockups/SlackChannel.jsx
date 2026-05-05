import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

export const SlackChannel = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const workspace = data.workspace || "Team";
  const channel = data.channel || "general";
  const messages = (data.messages || []).slice(0, 5);

  return (
    <AnimatedBg tint1="#611f69" tint2="#36c5f0" tint3="#ecb22e" baseColor="#05060a">
      <ParticleField count={24} color="rgba(97,31,105,0.25)" />

      <div style={{
        position: "absolute", inset: "50px 80px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard
          accent="#611f69"
          style={{
            width: "100%", maxWidth: 1080, padding: 0, overflow: "hidden",
            opacity: springIn(clipFrame, fps, 0, 0.4),
          }}
        >
          <div style={{ display: "flex", minHeight: 560 }}>
            {/* Sidebar */}
            <div style={{
              width: 260,
              background: "linear-gradient(180deg, #2c0033 0%, #1a0020 100%)",
              padding: "20px 14px",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ padding: "0 14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{workspace}</div>
                <div style={{ fontSize: 12, color: "#c1b0c8", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: "#1ab97c",
                    boxShadow: `0 0 ${breathe(clipFrame, fps, 2, 5, 12)}px #1ab97c`,
                  }} />
                  online
                </div>
              </div>
              <div style={{
                fontSize: 11, color: "#c1b0c8", textTransform: "uppercase",
                letterSpacing: 1.2, padding: "0 14px", marginBottom: 10, fontWeight: 700,
              }}>Channels</div>
              {["general", "random", "announcements", channel].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map((ch, i) => (
                <div key={i} style={{
                  padding: "8px 14px", borderRadius: 5, fontSize: 14,
                  background: ch === channel ? "#1164a3" : "transparent",
                  color: ch === channel ? "#fff" : "#c1b0c8",
                  fontWeight: ch === channel ? 800 : 400,
                  marginBottom: 2,
                }}># {ch}</div>
              ))}
            </div>

            {/* Main channel area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #fafafa, #f2f2f2)" }}>
              {/* Header */}
              <div style={{
                padding: "20px 28px", borderBottom: "1px solid rgba(0,0,0,0.08)",
                display: "flex", alignItems: "center",
              }}>
                <div style={{ fontSize: 19, fontWeight: 900, color: "#1d1c1d" }}># {channel}</div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: "20px 28px" }}>
                {messages.map((m, i) => {
                  const op = springIn(clipFrame, fps, 0.2 + i * 0.12, 0.45);
                  const ty = interpolate(op, [0, 1], [8, 0]);
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 14, marginBottom: 22,
                      opacity: op, transform: `translateY(${ty}px)`,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                        background: `linear-gradient(135deg, hsl(${(i * 80) % 360}, 60%, 55%), hsl(${(i * 80 + 40) % 360}, 60%, 40%))`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 18, fontWeight: 800,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}>{(m.user || "?").charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 4 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: "#1d1c1d" }}>{m.user}</div>
                          <div style={{ fontSize: 12, color: "#616061" }}>{m.time || "now"}</div>
                        </div>
                        <div style={{ fontSize: 15, lineHeight: 1.55, color: "#1d1c1d" }}>{m.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
