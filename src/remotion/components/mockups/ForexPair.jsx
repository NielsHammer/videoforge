import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, springIn, breathe } from "./_shared.jsx";

/**
 * ForexPair — animated forex/crypto pair display with live-feel price.
 * data: { symbol: "XAUUSD", name: "Gold / US Dollar", price: "2847.52", change: "+0.73%", direction: "up", bid: "2847.48", ask: "2847.56" }
 */
export const ForexPair = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const symbol = data.symbol || "XAUUSD";
  const name = data.name || "Gold / US Dollar";
  const price = data.price || "0.00";
  const change = data.change || "+0.00%";
  const direction = data.direction || "up";
  const bid = data.bid || "";
  const ask = data.ask || "";

  const isUp = direction === "up";
  const accent = isUp ? "#22ee88" : "#ef4444";
  const pulseGlow = breathe(clipFrame, fps, 1.6, 20, 50);
  const priceFloat = Math.sin(clipFrame / fps * 0.8) * 1.5;

  return (
    <AnimatedBg tint1={accent} tint2="#3b82f6" tint3="#fbbf24" baseColor="#030512">
      <ParticleField count={30} color={`${accent}55`} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 20,
      }}>
        {/* Symbol — huge */}
        <div style={{
          fontSize: 140, fontWeight: 900, color: "#fff",
          letterSpacing: "-4px", lineHeight: 1,
          fontFamily: "'Inter', sans-serif",
          textShadow: `0 0 ${pulseGlow * 0.8}px ${accent}`,
          opacity: springIn(clipFrame, fps, 0, 0.4),
          transform: `scale(${interpolate(springIn(clipFrame, fps, 0, 0.4), [0, 1], [0.85, 1])})`,
        }}>{symbol}</div>

        {/* Pair name */}
        <div style={{
          fontSize: 22, color: "#9ca3af", fontWeight: 500,
          textTransform: "uppercase", letterSpacing: 3,
          opacity: springIn(clipFrame, fps, 0.15, 0.4),
        }}>{name}</div>

        {/* Price + change */}
        <div style={{
          display: "flex", alignItems: "center", gap: 32,
          marginTop: 20,
          opacity: springIn(clipFrame, fps, 0.3, 0.5),
          transform: `translateY(${priceFloat}px)`,
        }}>
          <div style={{
            fontSize: 96, fontWeight: 800, color: "#fff",
            letterSpacing: "-2px", lineHeight: 1,
            fontFamily: "'Inter', sans-serif",
            fontVariantNumeric: "tabular-nums",
          }}>{price}</div>
          <div style={{
            padding: "14px 22px",
            background: `linear-gradient(135deg, ${accent}22, ${accent}05)`,
            border: `2px solid ${accent}`,
            borderRadius: 14,
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: `0 0 ${pulseGlow}px ${accent}66`,
          }}>
            <span style={{ fontSize: 30, color: accent, fontWeight: 900 }}>{isUp ? "▲" : "▼"}</span>
            <span style={{ fontSize: 32, color: accent, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>{change}</span>
          </div>
        </div>

        {/* Bid / Ask strip */}
        {(bid || ask) && (
          <div style={{
            display: "flex", gap: 32, marginTop: 28,
            opacity: springIn(clipFrame, fps, 0.5, 0.5),
          }}>
            {bid && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Bid</div>
                <div style={{ fontSize: 26, color: "#fff", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{bid}</div>
              </div>
            )}
            {ask && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Ask</div>
                <div style={{ fontSize: 26, color: "#fff", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{ask}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </AnimatedBg>
  );
};
