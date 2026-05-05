import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * TradingViewChart — a TradingView-style chart interface.
 * data: {
 *   symbol: "BTCUSD",
 *   timeframe: "4H",
 *   price: "67,420",
 *   change: "+2.4%",
 *   candles: [{ open, close, high, low }],  // 14-20 candles
 *   signal: "BREAKOUT" | "ENTRY" | "EXIT" | null
 * }
 */
export const TradingViewChart = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const symbol = data.symbol || "BTCUSD";
  const timeframe = data.timeframe || "1H";
  const price = data.price || "0.00";
  const change = data.change || "+0.0%";
  const signal = data.signal || null;
  const candles = (data.candles || [
    { open: 100, close: 108, high: 112, low: 98 },
    { open: 108, close: 105, high: 113, low: 102 },
    { open: 105, close: 115, high: 118, low: 103 },
    { open: 115, close: 112, high: 120, low: 110 },
    { open: 112, close: 122, high: 125, low: 110 },
    { open: 122, close: 128, high: 131, low: 120 },
    { open: 128, close: 125, high: 132, low: 123 },
    { open: 125, close: 135, high: 138, low: 123 },
    { open: 135, close: 140, high: 144, low: 133 },
    { open: 140, close: 152, high: 156, low: 138 },
    { open: 152, close: 148, high: 158, low: 145 },
    { open: 148, close: 160, high: 164, low: 146 },
    { open: 160, close: 168, high: 172, low: 158 },
    { open: 168, close: 175, high: 180, low: 166 },
  ]).slice(0, 16);

  // Calculate chart scale
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const chartH = 440;
  const chartW = 1060;
  const candleW = Math.floor((chartW - 60) / candles.length) - 4;
  const gap = 4;
  const toY = p => 30 + (1 - (p - minP) / range) * (chartH - 60);

  // Build moving average line
  const maPoints = candles.map((c, i) => {
    const startIdx = Math.max(0, i - 4);
    const slice = candles.slice(startIdx, i + 1);
    const avg = slice.reduce((s, c) => s + (c.open + c.close) / 2, 0) / slice.length;
    return [40 + i * (candleW + gap) + candleW / 2, toY(avg)];
  });

  // Animate draw: reveal candles one by one
  const drawProg = interpolate(clipFrame, [fps * 0.2, fps * 1.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const visibleCandles = Math.ceil(drawProg * candles.length);

  const isUp = change.startsWith("+") || change.startsWith("▲");
  const priceColor = isUp ? "#22ee88" : "#ef4444";
  const priceGlow = breathe(clipFrame, fps, 2, 15, 30);

  return (
    <AnimatedBg tint1="#3b82f6" tint2="#06b6d4" tint3="#22ee88" baseColor="#020610">
      <ParticleField count={28} color="rgba(59,130,246,0.25)" />

      <div style={{
        position: "absolute", inset: "50px 60px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard accent="#3b82f6" style={{ width: "100%", maxWidth: 1180, padding: 0, overflow: "hidden" }}>
          {/* Top bar */}
          <div style={{
            background: "linear-gradient(180deg, #131722 0%, #0d1117 100%)",
            padding: "18px 24px",
            display: "flex", alignItems: "center", gap: 24,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{symbol}</div>
            <div style={{
              padding: "5px 12px",
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 6,
              fontSize: 12, color: "#6ea6ff", fontWeight: 700, letterSpacing: 1,
            }}>{timeframe}</div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                fontSize: 28, fontWeight: 800, color: priceColor,
                fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 ${priceGlow}px ${priceColor}66`,
              }}>{price}</div>
              <div style={{
                padding: "5px 10px",
                background: `${priceColor}22`,
                border: `1px solid ${priceColor}55`,
                borderRadius: 6,
                fontSize: 13, color: priceColor, fontWeight: 800,
              }}>{change}</div>
            </div>
          </div>

          {/* Chart area */}
          <div style={{
            background: "linear-gradient(180deg, #0d1117 0%, #050810 100%)",
            padding: "30px 40px",
            position: "relative",
          }}>
            <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: "block" }}>
              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map(p => {
                const y = 30 + p * (chartH - 60);
                return <line key={p} x1="30" y1={y} x2={chartW - 30} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
              })}

              {/* Candles */}
              {candles.slice(0, visibleCandles).map((c, i) => {
                const x = 40 + i * (candleW + gap);
                const upCandle = c.close >= c.open;
                const color = upCandle ? "#22ee88" : "#ef4444";
                const bodyTop = toY(Math.max(c.open, c.close));
                const bodyBot = toY(Math.min(c.open, c.close));
                const wickTop = toY(c.high);
                const wickBot = toY(c.low);
                return (
                  <g key={i}>
                    {/* Wick */}
                    <line
                      x1={x + candleW / 2} y1={wickTop}
                      x2={x + candleW / 2} y2={wickBot}
                      stroke={color} strokeWidth="1.8"
                    />
                    {/* Body */}
                    <rect
                      x={x} y={bodyTop}
                      width={candleW} height={Math.max(2, bodyBot - bodyTop)}
                      fill={color}
                      style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
                    />
                  </g>
                );
              })}

              {/* Moving average line */}
              {visibleCandles >= 2 && (
                <path
                  d={maPoints.slice(0, visibleCandles).map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ")}
                  stroke="#6ea6ff" strokeWidth="2" fill="none"
                  strokeDasharray="5,5" opacity="0.7"
                />
              )}
            </svg>

            {/* Signal badge */}
            {signal && (
              <div style={{
                position: "absolute", top: 46, right: 56,
                padding: "8px 16px",
                background: "linear-gradient(135deg, #22ee88, #0bb666)",
                color: "#0a0a0a", fontWeight: 900, fontSize: 13,
                letterSpacing: 1.5, borderRadius: 6,
                boxShadow: `0 0 ${priceGlow}px #22ee88cc`,
                opacity: springIn(clipFrame, fps, 0.9, 0.3),
                transform: `scale(${0.8 + breathe(clipFrame, fps, 1.4, 0, 0.15)})`,
              }}>{signal}</div>
            )}
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
