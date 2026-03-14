import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const CheckmarkBuild = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#22c55e";
  if (!data || !data.items) return null;
  const items = data.items.slice(0, 5);
  const title = data.title || "";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
      {title && (
        <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, marginBottom: 32, opacity: interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" }) }}>
          {title}
        </div>
      )}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, i) => {
          const delay = fps * 0.2 + i * fps * 0.35;
          const progress = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
          const slideX = interpolate(progress, [0, 1], [-40, 0]);
          const checkProgress = interpolate(clipFrame, [delay + fps * 0.1, delay + fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: progress, transform: `translateX(${slideX}px)` }}>
              {/* Animated checkmark circle */}
              <div style={{
                width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                background: `rgba(${accent === "#22c55e" ? "34,197,94" : "59,130,246"},${checkProgress * 0.2})`,
                border: `2px solid ${accent}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: checkProgress > 0.5 ? `0 0 20px ${accent}40` : "none",
                transition: "none",
              }}>
                {checkProgress > 0.3 && (
                  <svg width="22" height="22" viewBox="0 0 22 22">
                    <polyline
                      points="4,11 9,16 18,6"
                      stroke={accent}
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="28"
                      strokeDashoffset={28 * (1 - checkProgress)}
                    />
                  </svg>
                )}
              </div>
              {/* Item text */}
              <div style={{ fontSize: 28, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.3 }}>
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
