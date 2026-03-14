import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const SocialCounter = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.platforms) return null;
  const platforms = data.platforms.slice(0, 4);
  const title = data.title || "";

  const platformEmojis = { instagram: "📸", tiktok: "🎵", youtube: "▶️", twitter: "𝕏", linkedin: "💼", facebook: "👤", generic: "📊" };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      {title && (
        <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, marginBottom: 40, opacity: interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" }) }}>
          {title}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: platforms.length > 2 ? "1fr 1fr" : "1fr", gap: 20, width: "100%" }}>
        {platforms.map((platform, i) => {
          const delay = i * fps * 0.2;
          const progress = interpolate(clipFrame, [delay, delay + fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const target = parseInt(String(platform.count).replace(/[^0-9]/g, '')) || 0;
          const current = Math.round(progress * target);
          const suffix = platform.count.replace(/[0-9,]/g, '');
          const slideIn = interpolate(clipFrame, [delay, delay + fps * 0.3], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

          return (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${accent}25`,
              borderRadius: 16, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 16,
              opacity: progress > 0 ? 1 : 0,
              transform: `translateY(${slideIn}px)`,
              boxShadow: `0 0 30px ${accent}08`,
            }}>
              <div style={{ fontSize: 40 }}>{platformEmojis[platform.platform] || platformEmojis.generic}</div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", lineHeight: 1, textShadow: `0 0 20px ${accent}40` }}>
                  {current.toLocaleString()}{suffix}
                </div>
                <div style={{ fontSize: 13, color: accent, textTransform: "uppercase", letterSpacing: 2, marginTop: 4, fontFamily: "Arial, sans-serif" }}>
                  {platform.label || platform.platform}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
