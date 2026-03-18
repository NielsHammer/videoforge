import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const QuizCard = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const question = data.question || "";
  const options = data.options || ["A", "B", "C", "D"];
  const answer = data.answer ?? 0; // index of correct answer
  const explanation = data.explanation || "";

  // Question appears first
  const questionOp = interpolate(clipFrame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });
  const questionY = interpolate(clipFrame, [0, fps * 0.3], [-20, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Options stagger in
  const optionsReady = clipFrame > fps * 0.2;

  // Answer reveal
  const revealAt = fps * 1.5;
  const revealed = clipFrame > revealAt;
  const revealOp = interpolate(clipFrame, [revealAt, revealAt + fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "40px 80px",
    }}>
      {/* Question number badge */}
      <div style={{
        opacity: questionOp,
        fontFamily: "sans-serif", fontWeight: 900,
        fontSize: 13, color: accent,
        textTransform: "uppercase", letterSpacing: 4,
        marginBottom: 16,
        padding: "6px 20px",
        border: `1px solid ${accent}44`,
        borderRadius: 20,
      }}>Quick Question</div>

      {/* Question */}
      <div style={{
        opacity: questionOp, transform: `translateY(${questionY}px)`,
        fontFamily: "sans-serif", fontWeight: 700,
        fontSize: 30, color: "#ffffff",
        textAlign: "center", lineHeight: 1.4,
        marginBottom: 36,
      }}>{question}</div>

      {/* Options */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
        {options.slice(0, 4).map((opt, i) => {
          const delay = fps * (0.3 + i * 0.15);
          const oOp = interpolate(clipFrame, [delay, delay + fps * 0.2], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const oX = interpolate(clipFrame, [delay, delay + fps * 0.25], [-40, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          const isCorrect = i === answer;
          const letter = ["A", "B", "C", "D"][i];

          let borderColor = `${accent}30`;
          let bgColor = `${accent}08`;
          let textColor = "rgba(255,255,255,0.85)";

          if (revealed && isCorrect) {
            borderColor = "#22c55e";
            bgColor = "rgba(34,197,94,0.15)";
            textColor = "#ffffff";
          }

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              opacity: oOp, transform: `translateX(${oX}px)`,
              padding: "14px 20px",
              background: bgColor,
              border: `1.5px solid ${borderColor}`,
              borderRadius: 10,
              transition: "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: revealed && isCorrect ? "#22c55e" : `${accent}20`,
                border: `1.5px solid ${revealed && isCorrect ? "#22c55e" : accent + "50"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "sans-serif", fontWeight: 900,
                fontSize: 16, color: revealed && isCorrect ? "#000" : accent,
                flexShrink: 0,
              }}>
                {revealed && isCorrect ? "✓" : letter}
              </div>
              <span style={{
                fontFamily: "sans-serif", fontWeight: isCorrect && revealed ? 700 : 400,
                fontSize: 22, color: textColor,
              }}>{opt}</span>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {explanation && revealed && (
        <div style={{
          opacity: revealOp, marginTop: 24, width: "100%",
          padding: "16px 20px",
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 10,
        }}>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 600,
            fontSize: 18, color: "rgba(255,255,255,0.85)",
          }}>{explanation}</div>
        </div>
      )}
    </div>
  );
};
