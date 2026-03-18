import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const CandlestickChart = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "Price Action";
  const candles = data.candles || [
    { open: 100, close: 120, high: 130, low: 90 },
    { open: 120, close: 110, high: 135, low: 105 },
    { open: 110, close: 145, high: 150, low: 108 },
    { open: 145, close: 138, high: 155, low: 130 },
    { open: 138, close: 165, high: 170, low: 132 },
    { open: 165, close: 150, high: 172, low: 145 },
    { open: 150, close: 180, high: 185, low: 148 },
  ];
  const labels = data.labels || [];

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [0, fps * 0.25], [-20, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  const chartH = 200;
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const toY = (p) => chartH - ((p - minP) / range) * chartH;

  const candleW = 44;
  const gap = 12;
  const totalW = candles.length * (candleW + gap);

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, padding: "50px 60px",
    }}>
      <div style={{
        transform: `translateY(${titleY}px)`,
        fontFamily: "sans-serif", fontWeight: 800,
        fontSize: 26, color: accent,
        textTransform: "uppercase", letterSpacing: 4,
        marginBottom: 36,
      }}>{title}</div>

      <div style={{ position: "relative", width: totalW, height: chartH + 30 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0,
            top: pct * chartH,
            height: 1, background: "rgba(255,255,255,0.06)",
          }} />
        ))}

        {candles.map((c, i) => {
          const delay = fps * (0.2 + i * 0.08);
          const op = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const scaleY = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          const isBull = c.close >= c.open;
          const color = isBull ? "#22c55e" : "#ef4444";
          const x = i * (candleW + gap);
          const bodyTop = toY(Math.max(c.open, c.close));
          const bodyH = Math.max(2, Math.abs(toY(c.open) - toY(c.close)));
          const wickTop = toY(c.high);
          const wickBot = toY(c.low);

          return (
            <div key={i} style={{ position: "absolute", left: x, top: 0, width: candleW, opacity: op }}>
              {/* Wick */}
              <div style={{
                position: "absolute",
                left: candleW / 2 - 1, width: 2,
                top: wickTop, height: (wickBot - wickTop) * scaleY,
                background: color, transformOrigin: "top",
              }} />
              {/* Body */}
              <div style={{
                position: "absolute",
                left: 0, width: candleW,
                top: bodyTop,
                height: bodyH * scaleY,
                background: isBull ? `${color}cc` : color,
                border: `1px solid ${color}`,
                borderRadius: 3,
                boxShadow: `0 0 8px ${color}44`,
                transformOrigin: "top",
              }} />
              {/* Label */}
              {labels[i] && (
                <div style={{
                  position: "absolute", top: chartH + 8,
                  left: "50%", transform: "translateX(-50%)",
                  fontFamily: "sans-serif", fontSize: 10,
                  color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap",
                }}>{labels[i]}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 24, marginTop: 20,
        opacity: interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, background: "#22c55e", borderRadius: 2 }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Bullish</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 14, background: "#ef4444", borderRadius: 2 }} />
          <span style={{ fontFamily: "sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Bearish</span>
        </div>
      </div>
    </div>
  );
};
