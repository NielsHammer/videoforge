import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// CandlestickChart — Stock market candlestick chart
// data: { title: "S&P 500 - 2008 Crash Recovery", candles: [{open:1400,close:700,high:1450,low:650},{open:700,close:900,high:950,low:680},{open:900,close:1300,high:1350,low:880},{open:1300,close:1800,high:1850,low:1280},{open:1800,close:2800,high:2900,low:1750}], labels:["2007","2009","2012","2015","2020"] }
// USE WHEN: narrator discusses stock markets, crashes, recoveries, investment performance over time
export const CandlestickChart = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.candles?.length) return null;

  const candles = data.candles.slice(0, 8);
  const labels = data.labels || [];
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;

  const chartH = 200, chartW = 760, padH = 20;
  const toY = (p) => padH + (1 - (p - minP) / range) * chartH;
  const candleW = (chartW / candles.length) * 0.5;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 70px", gap: 12 }}>
      {data.title && (
        <div style={{ fontSize: 18, fontWeight: 700, color: accent, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp }}>{data.title}</div>
      )}
      <svg width={chartW} height={chartH + padH * 2} style={{ overflow: "visible" }}>
        {candles.map((c, i) => {
          const delay = fps * (0.3 + i * 0.1);
          const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isUp = c.close >= c.open;
          const color = isUp ? "#22c55e" : "#ef4444";
          const x = (i + 0.5) * (chartW / candles.length);
          const bodyTop = toY(Math.max(c.open, c.close));
          const bodyBot = toY(Math.min(c.open, c.close));
          const bodyH = Math.max(bodyBot - bodyTop, 2);
          return (
            <g key={i} opacity={op}>
              {/* Wick */}
              <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={color} strokeWidth={1.5} />
              {/* Body */}
              <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={2} />
            </g>
          );
        })}
      </svg>
      {/* Labels */}
      {labels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 0 }}>
          {labels.map((l, i) => (
            <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif" }}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
};
