import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const WealthLadder = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "The Wealth Ladder";
  const rungs = data.rungs || [
    { label: "Broke", desc: "Paycheck to paycheck", pct: 40, color: "#ef4444" },
    { label: "Surviving", desc: "Some savings", pct: 30, color: "#f59e0b" },
    { label: "Stable", desc: "3-6 month emergency fund", pct: 20, color: "#3b82f6" },
    { label: "Wealthy", desc: "Assets working for you", pct: 8, color: "#22c55e" },
    { label: "Rich", desc: "Generational wealth", pct: 2, color: "#a855f7" },
  ];

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, padding: "40px 80px",
    }}>
      <div style={{
        fontFamily: "sans-serif", fontWeight: 800,
        fontSize: 26, color: accent,
        textTransform: "uppercase", letterSpacing: 4,
        marginBottom: 32,
      }}>{title}</div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", gap: 8 }}>
        {rungs.map((rung, i) => {
          const delay = fps * (0.1 + i * 0.15);
          const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const x = interpolate(clipFrame, [delay, delay + fps * 0.35], [-60, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          // Width scales with position — higher rungs are narrower (fewer people)
          const widthPct = 40 + (i / (rungs.length - 1)) * 55;

          return (
            <div key={i} style={{
              opacity: op, transform: `translateX(${x}px)`,
              display: "flex", alignItems: "center", gap: 16,
            }}>
              {/* Bar — wider at bottom, narrower at top */}
              <div style={{
                width: `${widthPct}%`,
                padding: "14px 20px",
                background: `${rung.color}18`,
                border: `1.5px solid ${rung.color}55`,
                borderLeft: `4px solid ${rung.color}`,
                borderRadius: "0 8px 8px 0",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{
                    fontFamily: "sans-serif", fontWeight: 800,
                    fontSize: 18, color: rung.color,
                  }}>{rung.label}</div>
                  {rung.desc && (
                    <div style={{
                      fontFamily: "sans-serif", fontWeight: 400,
                      fontSize: 13, color: "rgba(255,255,255,0.55)",
                      marginTop: 2,
                    }}>{rung.desc}</div>
                  )}
                </div>
                <div style={{
                  fontFamily: "sans-serif", fontWeight: 800,
                  fontSize: 20, color: rung.color,
                  opacity: 0.8,
                }}>{rung.pct}%</div>
              </div>

              {/* Arrow up */}
              {i < rungs.length - 1 && (
                <div style={{
                  position: "absolute", right: 20,
                  fontFamily: "sans-serif", fontSize: 16,
                  color: "rgba(255,255,255,0.15)",
                }}>↑</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
