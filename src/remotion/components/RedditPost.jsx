import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const RedditPost = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const subreddit = data.subreddit || "r/personalfinance";
  const username = data.username || "u/throwaway_8472";
  const title = data.title || "";
  const upvotes = data.upvotes || "12.4K";
  const comments = data.comments || "847";

  const scale = interpolate(clipFrame, [0, fps * 0.25, fps * 0.35], [0.9, 1.03, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const titleOp = interpolate(clipFrame, [fps * 0.25, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const statsOp = interpolate(clipFrame, [fps * 0.45, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Upvote count animation
  const animUpvotes = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [0, parseFloat(upvotes)], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const upvoteDisplay = upvotes.includes("K")
    ? `${(animUpvotes / 1000).toFixed(1)}K`
    : Math.round(animUpvotes).toString();

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${scale})`, opacity,
        width: 540,
        background: "#1a1a1b",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        display: "flex",
      }}>
        {/* Vote sidebar */}
        <div style={{
          width: 48, background: "#111112",
          display: "flex", flexDirection: "column",
          alignItems: "center", padding: "12px 0", gap: 4,
        }}>
          <div style={{ fontSize: 20, color: "#ff4500" }}>▲</div>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 800,
            fontSize: 13, color: "#ff4500",
          }}>{upvoteDisplay}</div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.2)" }}>▼</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "12px 16px" }}>
          {/* Subreddit + user */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#ff4500",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: "#fff",
            }}>r</div>
            <span style={{
              fontFamily: "sans-serif", fontWeight: 700,
              fontSize: 13, color: "#ffffff",
            }}>{subreddit}</span>
            <span style={{
              fontFamily: "sans-serif", fontSize: 12,
              color: "rgba(255,255,255,0.35)",
            }}>• Posted by {username}</span>
          </div>

          {/* Title */}
          <div style={{
            opacity: titleOp,
            fontFamily: "sans-serif", fontWeight: 600,
            fontSize: 18, color: "#ffffff",
            lineHeight: 1.4, marginBottom: 16,
          }}>{title}</div>

          {/* Stats bar */}
          <div style={{
            display: "flex", gap: 16, opacity: statsOp,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "sans-serif", fontSize: 13,
              color: "rgba(255,255,255,0.45)",
            }}>
              <span>💬</span> {comments} Comments
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "sans-serif", fontSize: 13,
              color: "rgba(255,255,255,0.45)",
            }}>
              <span>↗</span> Share
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "sans-serif", fontSize: 13,
              color: "rgba(255,255,255,0.45)",
            }}>
              <span>⭐</span> Save
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
