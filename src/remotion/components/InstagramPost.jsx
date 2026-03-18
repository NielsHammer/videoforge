import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const InstagramPost = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const username = data.username || "wealthmindset";
  const caption = data.caption || "";
  const likes = data.likes || "24.3K";
  const verified = data.verified !== false;

  const scale = interpolate(clipFrame, [0, fps * 0.25, fps * 0.35], [0.88, 1.03, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  const contentOp = interpolate(clipFrame, [fps * 0.25, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const contentY = interpolate(clipFrame, [fps * 0.25, fps * 0.5], [16, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const heartScale = interpolate(clipFrame, [fps * 0.7, fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  // Gradient border (Instagram style)
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${scale})`, opacity,
        width: 460,
        background: "#0a0a0a",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Avatar with gradient ring */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            padding: 2,
            background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
          }}>
            <div style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: "#1a1a2e",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>💰</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 700,
                fontSize: 14, color: "#ffffff",
              }}>{username}</span>
              {verified && <span style={{ fontSize: 13, color: "#3b82f6" }}>✓</span>}
            </div>
            <div style={{
              fontFamily: "sans-serif", fontSize: 11,
              color: "rgba(255,255,255,0.4)",
            }}>Sponsored</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 20, color: "rgba(255,255,255,0.4)" }}>⋯</div>
        </div>

        {/* Image placeholder with gradient */}
        <div style={{
          height: 200,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 60,
        }}>📊</div>

        {/* Actions */}
        <div style={{
          padding: "12px 16px 8px",
          display: "flex", alignItems: "center", gap: 16,
          opacity: contentOp, transform: `translateY(${contentY}px)`,
        }}>
          <div style={{ transform: `scale(${heartScale})` }}>
            <span style={{ fontSize: 26, cursor: "pointer" }}>❤️</span>
          </div>
          <span style={{ fontSize: 24 }}>💬</span>
          <span style={{ fontSize: 24 }}>✈️</span>
          <span style={{ marginLeft: "auto", fontSize: 24 }}>🔖</span>
        </div>

        {/* Likes */}
        <div style={{
          padding: "0 16px 8px",
          opacity: contentOp, transform: `translateY(${contentY}px)`,
        }}>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 700,
            fontSize: 14, color: "#ffffff",
          }}>{likes} likes</div>
        </div>

        {/* Caption */}
        <div style={{
          padding: "0 16px 16px",
          opacity: contentOp, transform: `translateY(${contentY}px)`,
        }}>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 700,
            fontSize: 13, color: "#ffffff",
          }}>{username} </span>
          <span style={{
            fontFamily: "sans-serif", fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.5,
          }}>{caption}</span>
        </div>
      </div>
    </div>
  );
};
