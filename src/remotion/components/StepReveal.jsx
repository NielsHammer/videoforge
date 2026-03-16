import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const StepReveal = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "How To";
  const steps = data.steps || [];
  const active = data.active || 0; // which step is highlighted

  const titleOp = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "50px 100px",
    }}>
      {/* Title */}
      <div style={{
        opacity: titleOp, marginBottom: 36,
        fontFamily: "sans-serif", fontWeight: 800,
        fontSize: 30, color: accent,
        textTransform: "uppercase", letterSpacing: 4,
      }}>{title}</div>

      {/* Steps */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        {steps.slice(0, 5).map((step, i) => {
          const delay = fps * (0.1 + i * 0.2);
          const op = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const x = interpolate(clipFrame, [delay, delay + fps * 0.3], [-80, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const isActive = i === active;

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 24,
              transform: `translateX(${x}px)`, opacity: op,
              padding: "18px 28px",
              background: isActive ? `${accent}22` : `${accent}0a`,
              border: `1.5px solid ${isActive ? accent : accent + "30"}`,
              borderRadius: 10,
            }}>
              {/* Step number */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: isActive ? accent : `${accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: isActive ? `0 0 20px ${accent}66` : "none",
              }}>
                <span style={{
                  fontFamily: "sans-serif", fontWeight: 900,
                  fontSize: 22, color: isActive ? "#000" : accent,
                }}>{i + 1}</span>
              </div>

              {/* Step text */}
              <span style={{
                fontFamily: "sans-serif",
                fontWeight: isActive ? 700 : 500,
                fontSize: 26, color: isActive ? "#fff" : "rgba(255,255,255,0.8)",
                lineHeight: 1.3,
              }}>{typeof step === "string" ? step : step.label || step}</span>

              {/* Active indicator */}
              {isActive && (
                <span style={{
                  marginLeft: "auto", fontSize: 24, color: accent,
                }}>◀</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
