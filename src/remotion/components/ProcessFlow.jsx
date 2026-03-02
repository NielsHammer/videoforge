import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * ProcessFlow v24: Step-by-step process with animated connecting arrows.
 * Props via data:
 *   steps: [{ label: "Research", icon: "🔍" }, { label: "Invest", icon: "💰" }, ...]
 *   title: "Your Investment Process"
 */
export const ProcessFlow = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.steps || data.steps.length < 2) return null;

  const steps = data.steps.slice(0, 5);
  const title = data.title || "";
  const titleOp = interpolate(clipFrame, [fps * 0.05, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const defaultColors = ["#4a9eff", "#22c55e", "#f97316", "#a855f7", "#ec4899"];

  const totalW = 1600;
  const startX = (1920 - totalW) / 2;
  const stepW = totalW / steps.length;
  const centerY = 460;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Title */}
      {title && (
        <div style={{ position: "absolute", top: 80, width: "100%", textAlign: "center", fontSize: 34, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3 }}>
          {title}
        </div>
      )}

      {/* Steps */}
      {steps.map((step, i) => {
        const delay = fps * 0.2 + i * fps * 0.35;
        const stepProgress = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)),
        });
        const stepOp = interpolate(clipFrame, [delay, delay + fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const color = step.color || defaultColors[i % defaultColors.length];
        const cx = startX + stepW * i + stepW / 2;

        return (
          <React.Fragment key={i}>
            {/* Step circle */}
            <div style={{
              position: "absolute",
              left: cx - 55, top: centerY - 55,
              width: 110, height: 110, borderRadius: "50%",
              background: `${color}15`,
              border: `3px solid ${color}50`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              transform: `scale(${stepProgress})`,
              opacity: stepOp,
              boxShadow: `0 0 30px ${color}20`,
            }}>
              {step.icon && <span style={{ fontSize: 36, marginBottom: 2 }}>{step.icon}</span>}
              {!step.icon && (
                <span style={{ fontSize: 32, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color }}>{i + 1}</span>
              )}
            </div>

            {/* Step label below */}
            <div style={{
              position: "absolute",
              left: cx - 100, top: centerY + 70, width: 200,
              textAlign: "center", opacity: stepOp,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color, marginBottom: 4, textTransform: "uppercase", letterSpacing: 2 }}>
                Step {i + 1}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffff" }}>
                {step.label}
              </div>
              {step.description && (
                <div style={{ fontSize: 18, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffffcc", marginTop: 6 }}>
                  {step.description}
                </div>
              )}
            </div>

            {/* Arrow to next step */}
            {i < steps.length - 1 && (
              <div style={{
                position: "absolute",
                left: cx + 60, top: centerY - 8,
                width: stepW - 120, height: 4,
                opacity: interpolate(clipFrame, [delay + fps * 0.2, delay + fps * 0.5], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}>
                <div style={{
                  width: `${interpolate(clipFrame, [delay + fps * 0.2, delay + fps * 0.5], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                  height: "100%", borderRadius: 2,
                  background: `linear-gradient(90deg, ${color}60, ${defaultColors[(i + 1) % defaultColors.length]}60)`,
                }} />
                {/* Arrow head */}
                <div style={{
                  position: "absolute", right: -8, top: -6, width: 0, height: 0,
                  borderTop: "8px solid transparent", borderBottom: "8px solid transparent",
                  borderLeft: `12px solid ${defaultColors[(i + 1) % defaultColors.length]}60`,
                  opacity: interpolate(clipFrame, [delay + fps * 0.4, delay + fps * 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
