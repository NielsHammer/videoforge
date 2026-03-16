import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const VoteBar = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const question = data.question || "";
  const options = data.options || [
    { label: "Yes", pct: 73, winner: true },
    { label: "No", pct: 27, winner: false },
  ];

  const questionOp = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const questionY = interpolate(clipFrame, [0, fps * 0.25], [-20, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "50px 100px", gap: 36,
    }}>
      {/* Question */}
      {question && (
        <div style={{
          opacity: questionOp, transform: `translateY(${questionY}px)`,
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 30, color: "#ffffff",
          textAlign: "center", lineHeight: 1.4,
        }}>{question}</div>
      )}

      {/* Options */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        {options.slice(0, 4).map((opt, i) => {
          const delay = fps * (0.2 + i * 0.2);
          const barWidth = interpolate(clipFrame, [delay, delay + fps * 0.7], [0, opt.pct], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const op = interpolate(clipFrame, [delay, delay + fps * 0.2], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const barColor = opt.winner ? accent : "rgba(255,255,255,0.25)";

          return (
            <div key={i} style={{ opacity: op }}>
              {/* Label + pct */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginBottom: 8,
              }}>
                <span style={{
                  fontFamily: "sans-serif", fontWeight: opt.winner ? 700 : 500,
                  fontSize: 24, color: opt.winner ? "#fff" : "rgba(255,255,255,0.7)",
                }}>{opt.label}</span>
                <span style={{
                  fontFamily: "sans-serif", fontWeight: 700,
                  fontSize: 24, color: opt.winner ? accent : "rgba(255,255,255,0.5)",
                }}>{Math.round(barWidth)}%</span>
              </div>

              {/* Bar */}
              <div style={{
                width: "100%", height: 18,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 9, overflow: "hidden",
                border: `1px solid rgba(255,255,255,0.1)`,
              }}>
                <div style={{
                  width: `${barWidth}%`, height: "100%",
                  background: opt.winner
                    ? `linear-gradient(90deg, ${accent}aa, ${accent})`
                    : "rgba(255,255,255,0.3)",
                  borderRadius: 9,
                  boxShadow: opt.winner ? `0 0 12px ${accent}55` : "none",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
