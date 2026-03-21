import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { count: 12, label: "ROME'S TREASURY", sublabel: "depleted in 50 years" }
export const CoinDrop = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;

  const count = Math.min(data.count || 8, 16);
  const label = (data.label || "").toUpperCase();
  const sublabel = data.sublabel || "";
  const gold = "#f59e0b";
  const coins = Array.from({ length: count }, (_, i) => ({
    x: 10 + (i / (count - 1)) * 80,
    delay: i * (fps * 0.08),
    size: 32 + Math.floor(i % 3) * 8,
  }));

  const labelOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Coins area */}
      <div style={{ position: "relative", width: "100%", height: 280 }}>
        {coins.map((coin, i) => {
          const start = coin.delay;
          const land = start + fps * 0.5;
          const y = interpolate(clipFrame, [start, land], [-80, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
          const bounce1 = interpolate(clipFrame, [land, land + fps * 0.1, land + fps * 0.2], [160, 130, 145], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const finalY = clipFrame < land ? y : bounce1;
          const op = interpolate(clipFrame, [start, start + fps * 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const squash = clipFrame > land && clipFrame < land + fps * 0.15
            ? interpolate(clipFrame, [land, land + fps * 0.08, land + fps * 0.15], [0.6, 1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 1;

          return (
            <div key={i} style={{ position: "absolute", left: `${coin.x}%`, top: finalY, opacity: op, transform: `translateX(-50%) scaleY(${squash})` }}>
              <div style={{ width: coin.size, height: coin.size, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #fde68a, ${gold}, #92400e)`, border: `2px solid ${gold}`, boxShadow: `0 2px 8px rgba(0,0,0,0.4), 0 0 ${coin.size * 0.5}px ${gold}40` }}>
                <div style={{ position: "absolute", inset: "25%", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {label && (
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 4, color: gold, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: labelOp, marginTop: 8 }}>
          {label}
        </div>
      )}
      {sublabel && (
        <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", opacity: labelOp, marginTop: 6 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
};

// PopulationBleed — Person icons disappear one by one. Plague, war, decline.
// GRID of person icons. They fade out sequentially.
// data: { total: 20, lost: 12, label: "ROMAN CITIZENS LOST", sublabel: "in the Crisis of the Third Century" }
