import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// GoogleSearch — Animated Google search results
// data: { query: "how to build wealth", results: [{title: "The 7 Steps to Wealth Building", source: "Forbes"}, {title: "Why 96% Never Reach $1M", source: "Inc.com"}] }
// USE WHEN: narrator mentions search trends, common questions, or what people look up
export const GoogleSearch = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.query) return null;

  const results = (data.results || []).slice(0, 3);
  const cardOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const cardY = interpolate(clipFrame, [0, fps * 0.3], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const typedChars = Math.floor(interpolate(clipFrame, [0, fps * 0.8], [0, data.query.length], { extrapolateRight: "clamp" }));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px", gap: 12 }}>
      {/* Search bar */}
      <div style={{ width: "100%", background: "white", borderRadius: 24, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", opacity: cardOp, transform: `translateY(${cardY}px)` }}>
        <div style={{ fontSize: 20 }}>🔍</div>
        <div style={{ fontSize: 18, color: "#333", fontFamily: "Arial, sans-serif", flex: 1 }}>
          {data.query.slice(0, typedChars)}
          {typedChars < data.query.length && <span style={{ borderRight: "2px solid #333", animation: "none" }}>&nbsp;</span>}
        </div>
      </div>
      {/* Results */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.96)", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
        {results.map((result, i) => {
          const resOp = interpolate(clipFrame, [fps * (0.6 + i * 0.2), fps * (0.9 + i * 0.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ padding: "14px 20px", borderBottom: i < results.length - 1 ? "1px solid #e0e0e0" : "none", opacity: resOp }}>
              <div style={{ fontSize: 12, color: "#006621", fontFamily: "Arial, sans-serif", marginBottom: 4 }}>{result.source || "article.com"}</div>
              <div style={{ fontSize: 17, color: "#1a0dab", fontFamily: "Arial, sans-serif", fontWeight: 400 }}>{result.title || "Article title"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
