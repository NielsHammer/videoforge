import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// NewsHeadline — Newspaper or news channel style headline reveal
// data: { outlet: "BREAKING NEWS", headline: "96% of Americans Will Never Build Wealth", subtext: "New study reveals shocking truth about financial literacy", date: "2024" }
// USE WHEN: narrator reveals a shocking stat or fact that sounds like breaking news
export const NewsHeadline = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.headline) return null;

  const bannerW = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const headlineOp = interpolate(clipFrame, [fps * 0.25, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineY = interpolate(clipFrame, [fps * 0.25, fps * 0.6], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subtextOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tickerX = interpolate(clipFrame, [0, fps * 4], [1920, -2000], { extrapolateRight: "clamp" });

  const fontSize = data.headline.length > 60 ? 34 : data.headline.length > 40 ? 40 : 48;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0" }}>
      {/* Top breaking banner */}
      <div style={{ background: "#cc0000", padding: "10px 40px", width: `${bannerW * 100}%`, overflow: "hidden", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "white", letterSpacing: 4, fontFamily: "Arial Black, Arial, sans-serif", flexShrink: 0 }}>
          {data.outlet || "BREAKING NEWS"}
        </div>
        <div style={{ width: 2, height: 16, background: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Arial, sans-serif" }}>{data.date || new Date().getFullYear()}</div>
      </div>

      {/* Main headline */}
      <div style={{ padding: "32px 40px 24px", opacity: headlineOp, transform: `translateY(${headlineY}px)` }}>
        <div style={{ fontSize, fontWeight: 900, fontFamily: "Georgia, serif", color: "white", lineHeight: 1.25, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
          {data.headline}
        </div>
      </div>

      {/* Divider line */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)`, margin: "0 40px", opacity: headlineOp }} />

      {/* Subtext */}
      {data.subtext && (
        <div style={{ padding: "16px 40px", fontSize: 20, color: "rgba(255,255,255,0.7)", fontFamily: "Georgia, serif", fontStyle: "italic", opacity: subtextOp, lineHeight: 1.5 }}>
          {data.subtext}
        </div>
      )}

      {/* Ticker bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: accent, padding: "8px 0", overflow: "hidden" }}>
        <div style={{ transform: `translateX(${tickerX}px)`, whiteSpace: "nowrap", fontSize: 14, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", letterSpacing: 2 }}>
          {data.ticker || `${data.headline} • ${data.headline} • ${data.headline} •`}
        </div>
      </div>
    </div>
  );
};
