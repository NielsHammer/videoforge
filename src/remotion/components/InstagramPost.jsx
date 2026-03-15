import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// InstagramPost — Instagram-style post card
// data: { username: "wealthmindset", caption: "96% of people will never reach $1M. Here's why 🧵", likes: "47.2K", handle: "@wealthmindset_", verified: true }
// USE WHEN: creator/social media topics, viral moments, social proof, influencer references
export const InstagramPost = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.caption) return null;

  const cardOp = interpolate(clipFrame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(clipFrame, [0, fps * 0.35], [25, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const likesOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const heartScale = interpolate(clipFrame, [fps * 0.65, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#0a0a0a", borderRadius: 16, overflow: "hidden", opacity: cardOp, transform: `translateY(${cardY}px)`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Avatar */}
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            {(data.username || "W")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              {data.handle || data.username || "username"}
              {data.verified && <span style={{ fontSize: 12, color: "#3b82f6" }}>✓</span>}
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 18, color: "rgba(255,255,255,0.4)" }}>•••</div>
        </div>

        {/* Image placeholder */}
        <div style={{ height: 200, background: `linear-gradient(135deg, ${accent}20, rgba(255,255,255,0.03))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>📸</div>
        </div>

        {/* Actions */}
        <div style={{ padding: "12px 16px 4px", display: "flex", gap: 16, alignItems: "center", opacity: likesOp }}>
          <div style={{ fontSize: 24, transform: `scale(${heartScale})` }}>❤️</div>
          <div style={{ fontSize: 22 }}>💬</div>
          <div style={{ fontSize: 22 }}>📤</div>
          <div style={{ marginLeft: "auto", fontSize: 22 }}>🔖</div>
        </div>

        {/* Likes */}
        <div style={{ padding: "4px 16px", fontSize: 14, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", opacity: likesOp }}>
          {data.likes || "12.4K"} likes
        </div>

        {/* Caption */}
        <div style={{ padding: "6px 16px 16px", fontSize: 14, color: "rgba(255,255,255,0.85)", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700 }}>{data.username || "username"} </span>
          {data.caption.slice(0, 100)}
        </div>
      </div>
    </div>
  );
};
