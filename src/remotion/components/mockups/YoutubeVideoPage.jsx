import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * YoutubeVideoPage — watching-a-video scene with premium motion.
 */
export const YoutubeVideoPage = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const channel = data.channel || "";
  const views = data.views || "0 views";
  const likes = data.likes || "0";
  const uploadDate = data.upload_date || "";
  const topComment = data.top_comment || null;

  const playPulse = breathe(clipFrame, fps, 1.6, 0.85, 1.0);
  const playGlow = breathe(clipFrame, fps, 2, 20, 45);

  return (
    <AnimatedBg tint1="#ff0033" tint2="#ff2a60" tint3="#450010" baseColor="#030308">
      <ParticleField count={30} color="rgba(255,255,255,0.15)" />

      <div style={{
        position: "absolute", inset: "60px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard accent="#ff0033" style={{ width: "100%", maxWidth: 1200, padding: "38px 44px" }}>
          {/* Video player (stylized) */}
          <div style={{
            width: "100%", aspectRatio: "16/9",
            borderRadius: 14,
            background: "linear-gradient(135deg, #0d0d15 0%, #02020a 100%)",
            position: "relative", marginBottom: 22,
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
            opacity: springIn(clipFrame, fps, 0, 0.5),
          }}>
            {/* Subtle scanning light across the player */}
            <div style={{
              position: "absolute",
              top: 0, bottom: 0,
              left: `${((clipFrame / fps * 30) % 140 - 20)}%`,
              width: "20%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
              pointerEvents: "none",
            }} />
            {/* Center play button */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(-50%, -50%) scale(${playPulse})`,
              width: 120, height: 120, borderRadius: "50%",
              background: "rgba(255,0,51,0.88)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 ${playGlow}px rgba(255,0,51,0.7), 0 0 ${playGlow * 1.5}px rgba(255,0,51,0.3)`,
            }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: "36px solid #fff",
                borderTop: "22px solid transparent",
                borderBottom: "22px solid transparent",
                marginLeft: 8,
              }} />
            </div>
            {/* Progress bar */}
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              height: 4, background: "rgba(255,255,255,0.08)",
            }}>
              <div style={{
                height: "100%", width: `${40 + Math.min(50, clipFrame / fps * 10)}%`,
                background: "#ff0033",
                boxShadow: "0 0 10px rgba(255,0,51,0.6)",
              }} />
            </div>
          </div>

          {/* Title */}
          <div style={{
            fontSize: 28, fontWeight: 800, color: "#fff",
            lineHeight: 1.25, marginBottom: 18,
            letterSpacing: "-0.5px",
            opacity: springIn(clipFrame, fps, 0.3, 0.5),
            transform: `translateY(${interpolate(springIn(clipFrame, fps, 0.3, 0.5), [0, 1], [12, 0])}px)`,
          }}>{title}</div>

          {/* Channel row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: "16px 0",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            opacity: springIn(clipFrame, fps, 0.45, 0.5),
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, #ff0033, #8b0020)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "#fff",
              boxShadow: "0 4px 20px rgba(255,0,51,0.4)",
            }}>{(channel || "?").charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{channel}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{views} · {uploadDate}</div>
            </div>
            <div style={{
              marginLeft: "auto",
              padding: "11px 20px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 999,
              fontWeight: 700, fontSize: 14, color: "#fff",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>👍</span>
              <span>{likes}</span>
            </div>
          </div>

          {/* Top comment */}
          {topComment && (
            <div style={{
              marginTop: 20, display: "flex", gap: 14,
              opacity: springIn(clipFrame, fps, 0.65, 0.5),
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #6366f1, #4338ca)",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }} />
              <div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6, fontWeight: 600 }}>@{topComment.user || "user"}</div>
                <div style={{ fontSize: 15, lineHeight: 1.5, color: "#e5e7eb" }}>{topComment.text}</div>
              </div>
            </div>
          )}
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
