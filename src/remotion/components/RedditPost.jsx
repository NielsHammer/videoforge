import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// RedditPost — Reddit-style post card
// data: { subreddit: "r/personalfinance", username: "u/throwaway_broke", title: "I'm 35 and have $0 saved. Is it too late?", upvotes: "12.4K", comments: "847", text: "optional body text" }
// USE WHEN: creator topics, social proof, relatable stories, community reactions
export const RedditPost = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.title) return null;

  const cardOp = interpolate(clipFrame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(clipFrame, [0, fps * 0.35], [25, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const statsOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden", opacity: cardOp, transform: `translateY(${cardY}px)`, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {/* Reddit header */}
        <div style={{ background: "#ff4500", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif" }}>reddit</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "Arial, sans-serif" }}>{data.subreddit || "r/all"}</div>
        </div>
        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", marginBottom: 10 }}>
            Posted by {data.username || "u/anonymous"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4, marginBottom: 12 }}>
            {data.title}
          </div>
          {data.text && (
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", lineHeight: 1.5, marginBottom: 16 }}>
              {data.text.slice(0, 100)}...
            </div>
          )}
          {/* Stats bar */}
          <div style={{ display: "flex", gap: 20, opacity: statsOp }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ff4500", fontSize: 15, fontWeight: 700, fontFamily: "Arial, sans-serif" }}>
              ▲ {data.upvotes || "5.2K"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 15, fontFamily: "Arial, sans-serif" }}>
              💬 {data.comments || "203"} comments
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
