import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const TweetCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#1DA1F2";
  if (!data) return null;
  const handle = data.handle || "@username";
  const name = data.name || "Person Name";
  const text = data.text || "";
  const likes = data.likes || "0";
  const retweets = data.retweets || "0";
  const verified = data.verified !== false;

  const slideUp = interpolate(clipFrame, [0, fps * 0.4], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const opacity = interpolate(clipFrame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });
  const statsOp = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Animate text appearing
  const charsToShow = Math.floor(interpolate(clipFrame, [fps * 0.3, fps * 1.2], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity, transform: `translateY(${slideUp}px)` }}>
      <div style={{
        width: 600,
        background: "rgba(15, 20, 40, 0.95)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.1)",
        padding: 28,
        boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${accent}15`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${accent}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "white", flexShrink: 0 }}>
            {name[0]}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif" }}>{name}</div>
              {verified && <div style={{ fontSize: 14, color: "#1DA1F2" }}>✓</div>}
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif" }}>{handle}</div>
          </div>
          <div style={{ marginLeft: "auto", color: "#1DA1F2", fontSize: 22 }}>𝕏</div>
        </div>

        {/* Tweet text */}
        <div style={{ fontSize: 20, color: "white", lineHeight: 1.6, fontFamily: "Arial, sans-serif", minHeight: 80 }}>
          {text.slice(0, charsToShow)}
          {charsToShow < text.length && <span style={{ opacity: 0.5 }}>|</span>}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0", opacity: statsOp }} />

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, opacity: statsOp }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>🔁</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif" }}>{retweets}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif" }}>Retweets</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>❤️</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif" }}>{likes}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif" }}>Likes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
