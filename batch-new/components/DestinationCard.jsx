import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { location: "Tokyo, Japan", stat1: "13.96M", label1: "Population", stat2: "#1", label2: "Most Visited", emoji: "🗾" }
export const DestinationCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.location) return null;

  const op = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const y = interpolate(clipFrame, [0, fps * 0.5], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const statsOp = interpolate(clipFrame, [fps * 0.4, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ width: "100%", maxWidth: 580, opacity: op, transform: `translateY(${y}px)` }}>
        <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))", border: `1px solid ${accent}40`, borderRadius: 20, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}08)`, padding: "24px 28px", borderBottom: `1px solid ${accent}20` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {data.emoji && <div style={{ fontSize: 40 }}>{data.emoji}</div>}
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 1 }}>
                  {data.location}
                </div>
                {data.country && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: `${accent}cc`, fontFamily: "Arial, sans-serif", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
                    {data.country}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: "flex", padding: "20px 28px", gap: 0, opacity: statsOp }}>
            {[{ val: data.stat1, lbl: data.label1 }, { val: data.stat2, lbl: data.label2 }, { val: data.stat3, lbl: data.label3 }].filter(s => s.val).map((stat, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 && data[`stat${i+2}`] ? `1px solid rgba(255,255,255,0.1)` : "none" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: accent, fontFamily: "Arial Black, Arial, sans-serif" }}>{stat.val}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{stat.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// PassportStamp — Passport stamp animates in with ink-blot effect
// data: { country: "ITALY", city: "ROME", date: "476 AD", color: "accent|red|green|gold" }
