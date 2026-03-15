import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// QuizCard — Quiz question reveal with answer
// data: { question: "What % of Americans have less than $1000 saved?", options: ["25%","51%","78%","90%"], answer: 2, explanation: "78% live paycheck to paycheck" }
// USE WHEN: narrator poses a question to the viewer before revealing an answer or statistic
export const QuizCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.question) return null;

  const options = (data.options || []).slice(0, 4);
  const answerIdx = data.answer ?? 0;
  const revealAt = fps * 1.5;

  const questionOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const questionY = interpolate(clipFrame, [0, fps * 0.4], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 70px", gap: 20 }}>
      {/* Question */}
      <div style={{ fontSize: 26, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4, opacity: questionOp, transform: `translateY(${questionY}px)` }}>
        {data.question}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((opt, i) => {
          const delay = fps * (0.4 + i * 0.15);
          const optOp = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isAnswer = i === answerIdx;
          const revealed = clipFrame >= revealAt;
          const bg = revealed && isAnswer ? `${accent}25` : "rgba(255,255,255,0.04)";
          const border = revealed && isAnswer ? `2px solid ${accent}` : "1px solid rgba(255,255,255,0.1)";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: bg, border, borderRadius: 12, padding: "14px 20px", opacity: optOp }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${revealed && isAnswer ? accent : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: revealed && isAnswer ? accent : "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", flexShrink: 0 }}>
                {String.fromCharCode(65 + i)}
              </div>
              <div style={{ fontSize: 18, fontWeight: revealed && isAnswer ? 700 : 500, color: revealed && isAnswer ? "white" : "rgba(255,255,255,0.75)", fontFamily: "Arial, sans-serif" }}>
                {opt}
              </div>
              {revealed && isAnswer && <div style={{ marginLeft: "auto", fontSize: 20 }}>✅</div>}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {data.explanation && clipFrame >= revealAt && (
        <div style={{ fontSize: 17, color: accent, fontFamily: "Arial, sans-serif", fontStyle: "italic", opacity: interpolate(clipFrame, [revealAt, revealAt + fps * 0.3], [0, 1], { extrapolateRight: "clamp" }) }}>
          💡 {data.explanation}
        </div>
      )}
    </div>
  );
};
