import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const YouTubeCard = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "How I Made $1M in 5 Years";
  const channel = data.channel || "WealthMindset";
  const views = data.views || "4.2M views";
  const duration = data.duration || "14:32";
  const badge = data.badge || "TRENDING";

  const scale = interpolate(clipFrame, [0, fps * 0.25, fps * 0.35], [0.9, 1.03, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const infoOp = interpolate(clipFrame, [fps * 0.3, fps * 0.55], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${scale})`, opacity,
        width: 500,
        background: "#0f0f0f",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
      }}>
        {/* Thumbnail */}
        <div style={{
          position: "relative", height: 220,
          background: `linear-gradient(135deg, ${accent}33 0%, #0a0a0a 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Play button */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)",
          }}>
            <div style={{
              width: 0, height: 0,
              borderTop: "14px solid transparent",
              borderBottom: "14px solid transparent",
              borderLeft: "22px solid white",
              marginLeft: 4,
            }} />
          </div>

          {/* Duration badge */}
          <div style={{
            position: "absolute", bottom: 10, right: 10,
            background: "rgba(0,0,0,0.85)",
            padding: "3px 8px", borderRadius: 4,
            fontFamily: "sans-serif", fontWeight: 700,
            fontSize: 13, color: "#ffffff",
          }}>{duration}</div>

          {/* Trending badge */}
          {badge && (
            <div style={{
              position: "absolute", top: 10, left: 10,
              background: "#ef4444",
              padding: "4px 10px", borderRadius: 4,
              fontFamily: "sans-serif", fontWeight: 900,
              fontSize: 11, color: "#ffffff",
              textTransform: "uppercase", letterSpacing: 1,
            }}>{badge}</div>
          )}
        </div>

        {/* Info */}
        <div style={{
          padding: "16px",
          display: "flex", gap: 12,
          opacity: infoOp,
        }}>
          {/* Channel avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: accent, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 16, color: "#000",
          }}>{channel[0]}</div>

          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "sans-serif", fontWeight: 700,
              fontSize: 15, color: "#ffffff",
              lineHeight: 1.3, marginBottom: 6,
            }}>{title}</div>
            <div style={{
              fontFamily: "sans-serif", fontSize: 13,
              color: "rgba(255,255,255,0.5)",
            }}>{channel} · {views}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
