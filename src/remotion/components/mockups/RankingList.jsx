import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * RankingList — animated top-N ranking with horizontal bars that fill in sequence.
 * data: { title: "optional", items: [{ label: "Tokyo", value: "$4,200", rank: 1 }], accent: "optional color" }
 */
export const RankingList = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = (data.items || []).slice(0, 7);
  const accent = data.accent || "#4a9eff";

  const maxVal = Math.max(...items.map(it => parseFloat(String(it.value).replace(/[^0-9.]/g, "")) || 1), 1);
  const titleOp = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 120px" }}>
        {title && (
          <div style={{ fontSize: 38, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", marginBottom: 40, opacity: titleOp, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {title}
          </div>
        )}
        <div style={{ width: "100%", maxWidth: 1200, display: "flex", flexDirection: "column", gap: 18 }}>
          {items.map((item, i) => {
            const delay = 0.3 + i * 0.15;
            const barW = interpolate(clipFrame, [fps * delay, fps * (delay + 0.6)], [0, 100], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
            });
            const rowOp = interpolate(clipFrame, [fps * (delay - 0.1), fps * delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const numVal = parseFloat(String(item.value).replace(/[^0-9.]/g, "")) || 0;
            const pct = (numVal / maxVal) * 100;

            // Gradient: top rank gets full accent, lower ranks fade
            const alpha = 1 - (i / items.length) * 0.5;

            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: rowOp }}>
                {/* Rank number */}
                <div style={{ width: 50, fontSize: 32, fontWeight: 800, color: i === 0 ? accent : "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", textAlign: "right" }}>
                  {item.rank || i + 1}
                </div>
                {/* Label */}
                <div style={{ width: 240, fontSize: 26, fontWeight: 600, color: "#fff", fontFamily: "Inter, sans-serif", textAlign: "right" }}>
                  {item.label}
                </div>
                {/* Bar */}
                <div style={{ flex: 1, height: 36, background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    width: `${(barW / 100) * pct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${accent}${Math.round(alpha * 255).toString(16).padStart(2, "0")}, ${accent}${Math.round(alpha * 180).toString(16).padStart(2, "0")})`,
                    borderRadius: 8,
                    boxShadow: i === 0 ? `0 0 20px ${accent}40` : "none",
                  }} />
                </div>
                {/* Value */}
                <div style={{ width: 140, fontSize: 26, fontWeight: 700, color: i === 0 ? accent : "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif" }}>
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedBg>
  );
};
