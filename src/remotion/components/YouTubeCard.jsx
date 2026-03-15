import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// YouTubeCard — YouTube video card style with views and title
// data: { title: "I Tried Saving $1000/Month for a Year", channel: "Personal Finance Club", views: "4.2M views", duration: "14:32", badge: "TRENDING" }
// USE WHEN: creator topics, reference to YouTube culture, viral content, views/subscriber milestones
export const YouTubeCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.title) return null;

  const cardOp = interpolate(clipFrame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(clipFrame, [0, fps * 0.35], [25, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const statsOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#0f0f0f", borderRadius: 12, overflow: "hidden", opacity: cardOp, transform: `translateY(${cardY}px)`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        {/* Thumbnail */}
        <div style={{ height: 220, background: `linear-gradient(135deg, #1a1a2e, #16213e, ${accent}20)`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Play button */}
          <div style={{ width: 64, height: 44, background: "#ff0000", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(255,0,0,0.4)" }}>
            <div style={{ fontSize: 20, color: "white", marginLeft: 4 }}>▶</div>
          </div>
          {/* Duration badge */}
          {data.duration && (
            <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.85)", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "Arial, sans-serif", padding: "3px 7px", borderRadius: 4 }}>
              {data.duration}
            </div>
          )}
          {/* Trending badge */}
          {data.badge && (
            <div style={{ position: "absolute", top: 10, left: 10, background: "#ff0000", color: "white", fontSize: 11, fontWeight: 800, fontFamily: "Arial, sans-serif", padding: "4px 10px", borderRadius: 4, letterSpacing: 1 }}>
              {data.badge}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "14px 16px", display: "flex", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ff0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>▶</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4, marginBottom: 6 }}>
              {data.title.slice(0, 70)}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", opacity: statsOp }}>
              {data.channel || "Channel"} • {data.views || "1.2M views"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
