import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// StepReveal — Numbered steps that appear one by one
// data: { title: "How To Do It", steps: ["Step one from script", "Step two", "Step three"], active: 0 }
// USE WHEN: narrator explains a process, how-to, or sequence of actions
export const StepReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.steps?.length) return null;

  const steps = data.steps.slice(0, 5);
  const title = data.title || "";
  const delayPerStep = fps * 0.45;
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 70px", gap: 4 }}>
      {title && (
        <div style={{ fontSize: 20, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 24, opacity: titleOp }}>
          {title}
        </div>
      )}
      {steps.map((step, i) => {
        const delay = i * delayPerStep + fps * 0.1;
        const op = interpolate(clipFrame, [delay, delay + fps * 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(clipFrame, [delay, delay + fps * 0.35], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const isActive = data.active === i;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 20px", borderRadius: 12, background: isActive ? `${accent}15` : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? accent + "40" : "rgba(255,255,255,0.06)"}`, opacity: op, transform: `translateX(${x}px)`, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: isActive ? accent : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: isActive ? "white" : accent, fontFamily: "Arial Black, Arial, sans-serif", flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: isActive ? "white" : "rgba(255,255,255,0.75)", fontFamily: "Arial, sans-serif", lineHeight: 1.3 }}>
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
};
