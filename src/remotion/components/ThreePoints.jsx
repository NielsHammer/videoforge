import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const ThreePoints = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "";
  const points = data.points || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "50px 80px",
    }}>
      {title && (
        <div style={{
          opacity: titleOp, marginBottom: 50,
          fontFamily: "sans-serif", fontWeight: 800,
          fontSize: 32, color: accent,
          textTransform: "uppercase", letterSpacing: 4,
        }}>{title}</div>
      )}

      <div style={{
        display: "flex", gap: 32, width: "100%",
        justifyContent: "center",
      }}>
        {points.slice(0, 3).map((point, i) => {
          const delay = fps * (0.1 + i * 0.22);
          const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const y = interpolate(clipFrame, [delay, delay + fps * 0.35], [60, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.2)),
          });

          const icon = point.icon || ["💰", "📈", "🎯"][i] || "•";
          const label = point.label || point;
          const desc = point.desc || "";

          return (
            <div key={i} style={{
              flex: 1, maxWidth: 280,
              transform: `translateY(${y}px)`, opacity: op,
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "32px 24px",
              background: `${accent}12`,
              border: `1.5px solid ${accent}33`,
              borderRadius: 16,
              textAlign: "center",
            }}>
              <span style={{ fontSize: 56, marginBottom: 20 }}>{icon}</span>
              <span style={{
                fontFamily: "sans-serif", fontWeight: 800,
                fontSize: 24, color: "#ffffff",
                lineHeight: 1.3, marginBottom: desc ? 12 : 0,
              }}>{label}</span>
              {desc && (
                <span style={{
                  fontFamily: "sans-serif", fontWeight: 400,
                  fontSize: 18, color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.4,
                }}>{desc}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
