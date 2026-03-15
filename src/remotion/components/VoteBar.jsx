import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// VoteBar — Poll/survey results showing percentages
// data: { question: "Do you live paycheck to paycheck?", options: [{label:"Yes",pct:78,winner:true},{label:"No",pct:22}] }
// USE WHEN: narrator cites survey results, poll data, or asks a rhetorical question with a percentage answer
export const VoteBar = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.options?.length) return null;

  const options = data.options.slice(0, 4);
  const questionOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 80px", gap: 20 }}>
      {data.question && (
        <div style={{ fontSize: 24, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4, marginBottom: 8, opacity: questionOp }}>
          {data.question}
        </div>
      )}
      {options.map((opt, i) => {
        const delay = fps * (0.3 + i * 0.2);
        const barW = interpolate(clipFrame, [delay, delay + fps * 0.6], [0, opt.pct || 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const labelOp = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const barColor = opt.winner ? accent : "rgba(255,255,255,0.25)";
        return (
          <div key={i} style={{ opacity: labelOp }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: opt.winner ? 800 : 600, color: opt.winner ? "white" : "rgba(255,255,255,0.7)", fontFamily: "Arial, sans-serif" }}>{opt.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: opt.winner ? accent : "rgba(255,255,255,0.5)", fontFamily: "Arial Black, Arial, sans-serif" }}>{Math.round(barW)}%</div>
            </div>
            <div style={{ height: opt.winner ? 20 : 14, background: "rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ width: `${barW}%`, height: "100%", background: barColor, borderRadius: 8, boxShadow: opt.winner ? `0 0 20px ${accent}60` : "none" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
