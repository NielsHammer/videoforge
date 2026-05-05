import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn } from "./_shared.jsx";

export const GmailInbox = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const emails = (data.emails || []).slice(0, 5);

  return (
    <AnimatedBg tint1="#ea4335" tint2="#4285f4" tint3="#fbbc04" baseColor="#05080f">
      <ParticleField count={25} color="rgba(234,67,53,0.2)" />

      <div style={{
        position: "absolute", inset: "54px 80px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard
          accent="#ea4335"
          style={{
            width: "100%", maxWidth: 1040, padding: 0, overflow: "hidden",
            background: "linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)",
            opacity: springIn(clipFrame, fps, 0, 0.4),
          }}
        >
          {/* Top bar */}
          <div style={{
            padding: "16px 28px",
            display: "flex", alignItems: "center", gap: 22,
            borderBottom: "1px solid #e8eaed",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="#ea4335" d="M20 4L12 12l-8-8h16z" />
                <path fill="#34a853" d="M4 4v16h4V8z" />
                <path fill="#fbbc04" d="M20 4v16h-4V8z" />
                <path fill="#4285f4" d="M4 20v-9l8 8 8-8v9z" />
              </svg>
              <div style={{ fontSize: 24, color: "#5f6368", fontWeight: 400, letterSpacing: "-0.5px" }}>Gmail</div>
            </div>
            <div style={{
              flex: 1, maxWidth: 680, marginLeft: 48,
              background: "#eaf1fb", borderRadius: 8,
              padding: "12px 20px", fontSize: 14, color: "#5f6368",
            }}>Search mail</div>
          </div>

          {/* Inbox list */}
          <div style={{ padding: "12px 16px", background: "#fff" }}>
            {emails.map((e, i) => {
              const op = springIn(clipFrame, fps, 0.15 + i * 0.1, 0.45);
              const ty = interpolate(op, [0, 1], [10, 0]);
              const isUnread = e.unread !== false;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 18,
                  padding: "16px 22px", marginBottom: 6,
                  background: "#fff", borderRadius: 10,
                  boxShadow: "0 1px 3px rgba(60,64,67,0.08), 0 4px 12px rgba(60,64,67,0.04)",
                  opacity: op, transform: `translateY(${ty}px)`,
                  fontWeight: isUnread ? 600 : 400,
                  border: "1px solid rgba(60,64,67,0.06)",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: `linear-gradient(135deg, hsl(${(i * 70) % 360}, 60%, 55%), hsl(${(i * 70 + 30) % 360}, 60%, 40%))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 16, fontWeight: 800, flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}>{(e.sender || "?").charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                      <div style={{ fontSize: 14, color: "#202124", minWidth: 180, fontWeight: isUnread ? 700 : 500 }}>{e.sender}</div>
                      <div style={{ fontSize: 14, color: "#202124", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: isUnread ? 700 : 500 }}>{e.subject}</span>
                        {e.preview && <span style={{ color: "#5f6368", fontWeight: 400, marginLeft: 8 }}>— {e.preview}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#5f6368", flexShrink: 0 }}>{e.time || "now"}</div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
