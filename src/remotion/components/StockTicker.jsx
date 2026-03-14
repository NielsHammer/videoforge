import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

export const StockTicker = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.items) return null;
  const items = data.items; // [{symbol, value, change, up}]
  const title = data.title || "";

  // Scroll offset
  const totalWidth = items.length * 260;
  const scrollOffset = (clipFrame * 1.5) % totalWidth;

  const fadeIn = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: fadeIn }}>
      {title && (
        <div style={{ fontSize: 28, fontWeight: 700, color: "white", letterSpacing: 4, textTransform: "uppercase", marginBottom: 32, fontFamily: "Arial Black, Arial, sans-serif" }}>
          {title}
        </div>
      )}

      {/* Ticker container */}
      <div style={{ width: "100%", background: "rgba(0,0,0,0.6)", borderTop: `1px solid ${accent}40`, borderBottom: `1px solid ${accent}40`, padding: "16px 0", overflow: "hidden", position: "relative" }}>
        {/* Fade edges */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 100, height: "100%", background: "linear-gradient(90deg, rgba(6,12,36,1), transparent)", zIndex: 10, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: "100%", background: "linear-gradient(-90deg, rgba(6,12,36,1), transparent)", zIndex: 10, pointerEvents: "none" }} />

        <div style={{ display: "flex", transform: `translateX(-${scrollOffset}px)`, width: totalWidth * 2 }}>
          {[...items, ...items].map((item, i) => (
            <div key={i} style={{ width: 260, flexShrink: 0, display: "flex", alignItems: "center", gap: 16, padding: "0 20px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", letterSpacing: 1 }}>{item.symbol}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "Arial, sans-serif" }}>{item.value}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: (item.change || "").startsWith("+") ? "#22c55e" : "#ef4444", fontFamily: "Arial, sans-serif" }}>
                {(item.change || "").startsWith("+") ? "▲" : "▼"} {item.change}
              </div>
              <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.15)", marginLeft: 4 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Main featured stat below */}
      {data.featured && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textShadow: `0 0 40px ${accent}60` }}>
            {data.featured.value}
          </div>
          <div style={{ fontSize: 20, color: accent, letterSpacing: 3, textTransform: "uppercase", marginTop: 8, fontFamily: "Arial, sans-serif" }}>
            {data.featured.label}
          </div>
        </div>
      )}
    </div>
  );
};
