import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * PnLLedger — running trade log with W/L entries.
 * data: { trades: [{ symbol, side, pnl: "+$1,240" | "-$320", date, winning: true|false }], total_pnl: "+$4,820", win_rate: "68%" }
 */
export const PnLLedger = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const trades = (data.trades || []).slice(0, 6);
  const totalPnl = data.total_pnl || "+$0";
  const winRate = data.win_rate || "0%";
  const isOverallUp = totalPnl.startsWith("+");
  const accent = isOverallUp ? "#22ee88" : "#ef4444";

  return (
    <AnimatedBg tint1={accent} tint2="#3b82f6" tint3="#fbbf24" baseColor="#030812">
      <ParticleField count={25} color={`${accent}44`} />

      <div style={{
        position: "absolute", inset: "60px 100px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard accent={accent} style={{ width: "100%", maxWidth: 1000, padding: "42px 48px" }}>
          {/* Header — total P&L and win rate */}
          <div style={{
            display: "flex", alignItems: "center", gap: 40,
            paddingBottom: 30,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 26,
            opacity: springIn(clipFrame, fps, 0, 0.4),
          }}>
            <div>
              <div style={{
                fontSize: 12, color: "#9ca3af", textTransform: "uppercase",
                letterSpacing: 2, fontWeight: 700, marginBottom: 6,
              }}>Total P&L</div>
              <div style={{
                fontSize: 56, fontWeight: 900, color: accent,
                letterSpacing: "-1.5px", lineHeight: 1,
                fontFamily: "'Inter', sans-serif",
                textShadow: `0 0 ${breathe(clipFrame, fps, 2.4, 10, 25)}px ${accent}66`,
              }}>{totalPnl}</div>
            </div>
            <div style={{ flex: 1 }} />
            <div>
              <div style={{
                fontSize: 12, color: "#9ca3af", textTransform: "uppercase",
                letterSpacing: 2, fontWeight: 700, marginBottom: 6,
              }}>Win Rate</div>
              <div style={{
                fontSize: 42, fontWeight: 800, color: "#fff",
                letterSpacing: "-1px", lineHeight: 1,
                fontFamily: "'Inter', sans-serif",
              }}>{winRate}</div>
            </div>
          </div>

          {/* Trades list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trades.map((t, i) => {
              const op = springIn(clipFrame, fps, 0.2 + i * 0.1, 0.4);
              const tx = interpolate(op, [0, 1], [-20, 0]);
              const tradeUp = t.winning !== false && String(t.pnl || "").startsWith("+");
              const tColor = tradeUp ? "#22ee88" : "#ef4444";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 18,
                  padding: "14px 20px",
                  background: `linear-gradient(90deg, ${tColor}10, transparent)`,
                  border: `1px solid ${tColor}22`,
                  borderRadius: 10,
                  opacity: op,
                  transform: `translateX(${tx}px)`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: tColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#0a0a0a", fontSize: 15, fontWeight: 900,
                    boxShadow: `0 0 12px ${tColor}88`,
                  }}>{tradeUp ? "✓" : "✕"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", fontFamily: "'Inter', sans-serif" }}>
                      {t.symbol || "—"}
                      <span style={{
                        marginLeft: 10,
                        fontSize: 11, padding: "3px 8px",
                        background: t.side === "SHORT" ? "rgba(239,68,68,0.2)" : "rgba(34,238,136,0.2)",
                        color: t.side === "SHORT" ? "#ef4444" : "#22ee88",
                        borderRadius: 4, fontWeight: 700, letterSpacing: 1,
                      }}>{t.side || "LONG"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{t.date || ""}</div>
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 800, color: tColor,
                    fontFamily: "'Inter', sans-serif", fontVariantNumeric: "tabular-nums",
                  }}>{t.pnl || "$0"}</div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
