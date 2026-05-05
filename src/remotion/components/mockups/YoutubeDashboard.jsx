import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * YoutubeDashboard — YouTube Studio analytics view.
 * Premium redesign: continuous motion, gradient background, glow effects,
 * cascading entrance, live-feel counters.
 */
export const YoutubeDashboard = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const subs = data.subscribers || "0";
  const subsDelta = data.subscribers_delta || "";
  const views = data.views || "0";
  const viewsPeriod = data.views_period || "Last 28 days";
  const watchHours = data.watch_hours || "0";
  const topVideo = data.top_video || "";

  // Scalable graph — build from 8 data points, animate the draw
  const pts = [
    [40, 190], [130, 170], [220, 155], [310, 135], [400, 105], [490, 72], [580, 45], [670, 20],
  ];
  const drawProgress = interpolate(clipFrame, [fps * 0.4, fps * 1.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const visibleCount = Math.floor(drawProgress * pts.length);
  const drawn = pts.slice(0, Math.max(2, visibleCount));
  const pathD = drawn.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const areaD = drawn.length >= 2
    ? `${pathD} L${drawn[drawn.length - 1][0]},220 L${drawn[0][0]},220 Z`
    : "";

  // Continuous micro-animations
  const pulseGlow = breathe(clipFrame, fps, 2.4, 0.3, 0.6);
  const cardFloat = breathe(clipFrame, fps, 3, -1, 1);

  return (
    <AnimatedBg tint1="#ff0033" tint2="#ff3366" tint3="#8b0020" baseColor="#050510">
      <ParticleField count={35} color="rgba(255,255,255,0.2)" />

      {/* Floating logo mark */}
      <div style={{
        position: "absolute", top: 48, left: 60,
        display: "flex", alignItems: "center", gap: 14,
        opacity: springIn(clipFrame, fps, 0, 0.4),
      }}>
        <div style={{
          width: 56, height: 40, borderRadius: 10,
          background: "linear-gradient(135deg, #ff0033, #cc0025)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 40px rgba(255, 0, 51, ${pulseGlow})`,
        }}>
          <div style={{
            width: 0, height: 0,
            borderLeft: "16px solid #fff",
            borderTop: "11px solid transparent",
            borderBottom: "11px solid transparent",
            marginLeft: 4,
          }} />
        </div>
        <div style={{
          fontSize: 26, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.5px",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}>YouTube Studio</div>
      </div>

      {/* Main dashboard card */}
      <div style={{
        position: "absolute", inset: "120px 60px 60px 60px",
        display: "flex", flexDirection: "column",
      }}>
        <PremiumCard accent="#ff0033" style={{ flex: 1, padding: "42px 48px" }}>
          {/* Period label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 26,
            opacity: springIn(clipFrame, fps, 0.15, 0.4),
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#ff0033",
              boxShadow: `0 0 12px #ff0033`,
              opacity: 0.5 + Math.sin(clipFrame / fps * 3) * 0.5,
            }} />
            <div style={{ fontSize: 13, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>
              Channel Analytics · {viewsPeriod}
            </div>
          </div>

          {/* 3 stat cards — cascade entrance */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, marginBottom: 36 }}>
            {[
              { label: "Subscribers", value: subs, delta: subsDelta, deltaColor: "#22ee88", icon: "👥" },
              { label: "Views", value: views, delta: viewsPeriod, deltaColor: "#9ca3af", icon: "👁" },
              { label: "Watch Hours", value: watchHours, delta: viewsPeriod, deltaColor: "#9ca3af", icon: "⏱" },
            ].map((s, i) => {
              const cardOp = springIn(clipFrame, fps, 0.25 + i * 0.12, 0.5);
              const cardY = interpolate(cardOp, [0, 1], [24, 0]);
              return (
                <div key={i} style={{
                  position: "relative",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "24px 26px",
                  opacity: cardOp,
                  transform: `translateY(${cardY + cardFloat * (i - 1)}px)`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}>
                  {/* Top accent line */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, #ff0033${60 + Math.floor(pulseGlow * 50).toString(16)}, transparent)`,
                  }} />
                  <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    {s.label}
                  </div>
                  <div style={{
                    fontSize: 44, fontWeight: 800, letterSpacing: "-1.5px", color: "#fff",
                    lineHeight: 1,
                    textShadow: "0 2px 20px rgba(0,0,0,0.6)",
                  }}>{s.value}</div>
                  {s.delta && (
                    <div style={{
                      color: s.deltaColor, fontSize: 13, marginTop: 8, fontWeight: 600,
                      textShadow: s.deltaColor === "#22ee88" ? "0 0 12px rgba(34,238,136,0.5)" : "none",
                    }}>
                      {s.deltaColor === "#22ee88" ? "↑ " : ""}{s.delta}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Graph */}
          <div style={{
            flex: 1,
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: 26,
            opacity: springIn(clipFrame, fps, 0.5, 0.5),
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>Views over time</div>
              <div style={{
                fontSize: 11, color: "#22ee88", fontWeight: 700,
                padding: "4px 10px", borderRadius: 999,
                background: "rgba(34,238,136,0.1)",
                border: "1px solid rgba(34,238,136,0.3)",
              }}>TRENDING UP</div>
            </div>
            <svg width="100%" height="230" viewBox="0 0 720 220" style={{ display: "block" }}>
              <defs>
                <linearGradient id="ytg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff0033" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ff0033" stopOpacity="0" />
                </linearGradient>
                <filter id="ytglow">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {[40, 80, 120, 160, 200].map(y => (
                <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              {drawn.length >= 2 && (
                <>
                  <path d={areaD} fill="url(#ytg)" />
                  <path d={pathD} stroke="#ff0033" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#ytglow)" />
                  {drawn.map((p, i) => {
                    const isLast = i === drawn.length - 1;
                    return (
                      <circle
                        key={i}
                        cx={p[0]} cy={p[1]}
                        r={isLast ? 6 : 4}
                        fill="#ff0033"
                        style={isLast ? { filter: `drop-shadow(0 0 ${6 + pulseGlow * 6}px #ff0033)` } : undefined}
                      />
                    );
                  })}
                </>
              )}
            </svg>
          </div>

          {/* Top video strip */}
          {topVideo && (
            <div style={{
              marginTop: 18,
              background: "linear-gradient(90deg, rgba(255,0,51,0.08), transparent)",
              border: "1px solid rgba(255,0,51,0.15)",
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 16,
              opacity: springIn(clipFrame, fps, 0.7, 0.5),
            }}>
              <div style={{
                width: 88, height: 50, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, #ff0033, #660015)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(255,0,51,0.4)",
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: "14px solid #fff",
                  borderTop: "9px solid transparent",
                  borderBottom: "9px solid transparent",
                  marginLeft: 4,
                }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#ff0033", textTransform: "uppercase", letterSpacing: 1.8, fontWeight: 700 }}>▲ Top performing</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: "#fff" }}>{topVideo}</div>
              </div>
            </div>
          )}
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
