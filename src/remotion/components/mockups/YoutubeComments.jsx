import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn } from "./_shared.jsx";

export const YoutubeComments = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const videoTitle = data.video_title || "";
  const comments = (data.comments || []).slice(0, 4);

  return (
    <AnimatedBg tint1="#ff0033" tint2="#ff3366" tint3="#220008" baseColor="#030308">
      <ParticleField count={25} color="rgba(255,255,255,0.18)" />

      <div style={{
        position: "absolute", inset: "60px 100px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard accent="#ff0033" style={{ width: "100%", maxWidth: 950, padding: "42px 48px" }}>
          {videoTitle && (
            <div style={{
              fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#fff",
              opacity: springIn(clipFrame, fps, 0, 0.4),
            }}>{videoTitle}</div>
          )}
          <div style={{
            fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 26,
            display: "flex", alignItems: "center", gap: 10,
            opacity: springIn(clipFrame, fps, 0.1, 0.4),
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff0033", boxShadow: "0 0 8px #ff0033" }} />
            {comments.length} Comments
          </div>
          {comments.map((c, i) => {
            const op = springIn(clipFrame, fps, 0.2 + i * 0.2, 0.5);
            const ty = interpolate(op, [0, 1], [14, 0]);
            return (
              <div key={i} style={{
                display: "flex", gap: 16, marginBottom: 28,
                opacity: op, transform: `translateY(${ty}px)`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `linear-gradient(135deg, hsl(${(i * 85) % 360}, 60%, 55%), hsl(${(i * 85 + 30) % 360}, 60%, 40%))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                }}>{(c.user || "?").charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e7eb" }}>@{c.user}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{c.time || "1 day ago"}</div>
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.55, color: "#e5e7eb" }}>{c.text}</div>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 10, color: "#9ca3af", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span>👍</span>
                      <span style={{ fontWeight: 600 }}>{c.likes || "0"}</span>
                    </div>
                    <span>Reply</span>
                  </div>
                </div>
              </div>
            );
          })}
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
