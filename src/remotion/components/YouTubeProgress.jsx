import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// YouTubeProgress: YouTube-style stats card — views, subscribers, revenue milestone
// Best for: YouTube growth content, social media topics, creator economy, viral content
// data: { views: "10.2M", subs: "500K", title: "This video changed everything", views_bar: 0.82 }
export const YouTubeProgress = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const ytRed = "#FF0000";

  if (!data) return null;
  const views = data.views || "1M";
  const subs = data.subs || "";
  const title = data.title || "Watch time";
  const barProgress = data.views_bar || 0.75;
  const revenue = data.revenue || "";

  const slideUp = interpolate(clipFrame, [0, fps * 0.5], [60, 0], { extrapolateRight: "clamp" });
  const opIn = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const barW = interpolate(clipFrame, [fps * 0.4, fps * 1.4], [0, barProgress * 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "60px",
    }}>
      <div style={{
        width: "100%", maxWidth: 800,
        backgroundColor: "rgba(10,10,10,0.92)",
        borderRadius: 16, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        opacity: opIn, transform: `translateY(${slideUp}px)`,
      }}>
        {/* YT Header bar */}
        <div style={{
          height: 8, backgroundColor: ytRed,
          boxShadow: `0 0 20px ${ytRed}`,
        }} />

        <div style={{ padding: "28px 32px" }}>
          {/* YouTube logo row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              backgroundColor: ytRed, borderRadius: 6, padding: "4px 10px",
              fontSize: 14, fontWeight: 900, color: "white", fontFamily: "Arial Black, sans-serif",
              letterSpacing: 1,
            }}>▶ YouTube</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif" }}>Studio Analytics</div>
          </div>

          {/* Video title */}
          <div style={{
            fontSize: 22, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif",
            marginBottom: 24, lineHeight: 1.3, borderLeft: `3px solid ${ytRed}`, paddingLeft: 12,
          }}>{title}</div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 32, marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Views", value: views, color: "white" },
              ...(subs ? [{ label: "Subscribers", value: subs, color: accent }] : []),
              ...(revenue ? [{ label: "Revenue", value: revenue, color: "#22c55e" }] : []),
            ].map((stat, i) => {
              const statOp = interpolate(clipFrame, [fps * (0.3 + i * 0.15), fps * (0.6 + i * 0.15)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ opacity: statOp }}>
                  <div style={{ fontSize: 38, fontWeight: 900, color: stat.color, fontFamily: "Arial Black, sans-serif", lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* Progress bar — watch time or views */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif" }}>Watch time</div>
              <div style={{ fontSize: 13, color: ytRed, fontFamily: "Arial, sans-serif", fontWeight: 700 }}>{Math.round(barProgress * 100)}%</div>
            </div>
            <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${barW}%`, backgroundColor: ytRed, borderRadius: 3, boxShadow: `0 0 10px ${ytRed}` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
