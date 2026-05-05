import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * YoutubeChannelPage — channel browse view with premium motion.
 */
export const YoutubeChannelPage = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const channelName = data.channel_name || "Channel";
  const handle = data.handle || "@channel";
  const subs = data.subscribers || "—";
  const videos = (data.videos || []).slice(0, 6);

  const avatarPulse = breathe(clipFrame, fps, 2.4, 0.3, 0.5);

  return (
    <AnimatedBg tint1="#ff0033" tint2="#ff3366" tint3="#330008" baseColor="#030308">
      <ParticleField count={25} color="rgba(255,255,255,0.15)" />

      <div style={{
        position: "absolute", inset: "50px",
        display: "flex", flexDirection: "column",
      }}>
        <PremiumCard accent="#ff0033" style={{ flex: 1, padding: "40px 48px" }}>
          {/* Header — avatar + channel info */}
          <div style={{
            display: "flex", alignItems: "center", gap: 28, marginBottom: 36,
            paddingBottom: 30, borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              width: 132, height: 132, borderRadius: "50%",
              background: "linear-gradient(135deg, #ff0033, #8b0020)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 58, fontWeight: 900, color: "#fff",
              boxShadow: `0 0 60px rgba(255,0,51,${avatarPulse}), 0 10px 40px rgba(0,0,0,0.5)`,
              opacity: springIn(clipFrame, fps, 0, 0.5),
              transform: `scale(${interpolate(springIn(clipFrame, fps, 0, 0.5), [0, 1], [0.8, 1])})`,
            }}>{channelName.charAt(0).toUpperCase()}</div>
            <div style={{
              opacity: springIn(clipFrame, fps, 0.15, 0.5),
              transform: `translateX(${interpolate(springIn(clipFrame, fps, 0.15, 0.5), [0, 1], [-12, 0])}px)`,
            }}>
              <div style={{
                fontSize: 42, fontWeight: 800, letterSpacing: "-1px", color: "#fff",
                textShadow: "0 2px 20px rgba(0,0,0,0.6)",
              }}>{channelName}</div>
              <div style={{ fontSize: 15, color: "#9ca3af", marginTop: 8 }}>{handle} · {subs} subscribers</div>
              <div style={{
                display: "inline-block", marginTop: 16,
                padding: "11px 26px",
                background: "linear-gradient(135deg, #ff0033, #cc0029)",
                color: "#fff", borderRadius: 999,
                fontWeight: 700, fontSize: 14,
                boxShadow: `0 0 30px rgba(255,0,51,${0.4 + avatarPulse * 0.3})`,
              }}>Subscribe</div>
            </div>
          </div>

          {/* Video grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, flex: 1 }}>
            {videos.map((v, i) => {
              const op = springIn(clipFrame, fps, 0.3 + i * 0.09, 0.5);
              const ty = interpolate(op, [0, 1], [18, 0]);
              const floatOffset = Math.sin(clipFrame / fps * 0.8 + i * 0.7) * 1.5;
              return (
                <div key={i} style={{
                  opacity: op,
                  transform: `translateY(${ty + floatOffset}px)`,
                }}>
                  <div style={{
                    width: "100%", aspectRatio: "16/9", borderRadius: 12,
                    background: `linear-gradient(135deg, hsl(${(i * 60) % 360}, 30%, 20%), hsl(${(i * 60 + 40) % 360}, 50%, 10%))`,
                    position: "relative",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: 0, height: 0,
                      borderLeft: "26px solid rgba(255,255,255,0.4)",
                      borderTop: "16px solid transparent",
                      borderBottom: "16px solid transparent",
                      marginLeft: 6,
                    }} />
                    <div style={{
                      position: "absolute", bottom: 10, right: 10,
                      background: "rgba(0,0,0,0.85)", color: "#fff",
                      fontSize: 11, fontWeight: 700, padding: "4px 7px", borderRadius: 4,
                    }}>{v.duration || "10:24"}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 14, lineHeight: 1.35, color: "#fff" }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{v.views || "0 views"} · {v.age || "1 day ago"}</div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
