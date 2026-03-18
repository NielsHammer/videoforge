import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const GoogleSearch = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const query = data.query || "how to build wealth";
  const results = data.results || [
    { title: "10 Proven Steps to Build Long-Term Wealth", source: "Forbes" },
    { title: "The Simple Truth About Getting Rich", source: "Investopedia" },
    { title: "Why 96% of People Never Build Wealth", source: "MarketWatch" },
  ];

  // Typing animation
  const typedLen = interpolate(clipFrame, [fps * 0.1, fps * 0.6], [0, query.length], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const typedQuery = query.slice(0, Math.round(typedLen));

  const cardScale = interpolate(clipFrame, [0, fps * 0.15, fps * 0.25], [0.94, 1.02, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const cardOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `scale(${cardScale})`, opacity: cardOp,
        width: 540,
      }}>
        {/* Search bar */}
        <div style={{
          background: "#202124",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24, padding: "14px 20px",
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{
            fontFamily: "sans-serif", fontSize: 17,
            color: "#e8eaed", flex: 1,
          }}>
            {typedQuery}
            {Math.round(typedLen) < query.length && (
              <span style={{
                display: "inline-block", width: 2, height: 18,
                background: "#4285f4", marginLeft: 1,
                animation: "none",
                opacity: Math.floor(clipFrame / (fps * 0.5)) % 2 === 0 ? 1 : 0,
              }} />
            )}
          </span>
          <span style={{ fontSize: 20 }}>✕</span>
        </div>

        {/* Results info */}
        <div style={{
          fontFamily: "sans-serif", fontSize: 13,
          color: "rgba(255,255,255,0.35)",
          marginBottom: 16, paddingLeft: 4,
          opacity: interpolate(clipFrame, [fps * 0.5, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>About 2,840,000,000 results (0.42 seconds)</div>

        {/* Results */}
        {results.slice(0, 3).map((r, i) => {
          const delay = fps * (0.55 + i * 0.2);
          const rOp = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const rY = interpolate(clipFrame, [delay, delay + fps * 0.3], [12, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div key={i} style={{
              opacity: rOp, transform: `translateY(${rY}px)`,
              padding: "14px 4px",
              borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{
                fontFamily: "sans-serif", fontSize: 13,
                color: "rgba(255,255,255,0.4)", marginBottom: 4,
              }}>www.{r.source.toLowerCase().replace(/\s+/g, "")}.com</div>
              <div style={{
                fontFamily: "sans-serif", fontSize: 18,
                color: "#8ab4f8", marginBottom: 4,
                cursor: "pointer",
              }}>{r.title}</div>
              <div style={{
                fontFamily: "sans-serif", fontSize: 13,
                color: "rgba(255,255,255,0.5)",
              }}>
                {r.source} — {query.slice(0, 30)}...
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
