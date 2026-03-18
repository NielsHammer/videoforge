import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const MapCallout = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const location = data.location || "United States";
  const stat = data.stat || "96%";
  const statLabel = data.statLabel || "never reach $1M";
  const subtitle = data.subtitle || "";
  const emoji = data.emoji || "📍";

  const fadeIn = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });

  // Pin drops from top
  const pinY = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [-80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.bounce),
  });
  const pinOp = interpolate(clipFrame, [fps * 0.1, fps * 0.25], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Stats pop up from pin
  const statsScale = interpolate(clipFrame, [fps * 0.4, fps * 0.65], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });
  const statsOp = interpolate(clipFrame, [fps * 0.4, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, gap: 0,
    }}>
      {/* Location pin */}
      <div style={{
        transform: `translateY(${pinY}px)`,
        opacity: pinOp,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ fontSize: 80 }}>{emoji}</div>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 900,
          fontSize: 38, color: "#ffffff",
          textAlign: "center",
        }}>{location}</div>
      </div>

      {/* Stats callout */}
      <div style={{
        transform: `scale(${statsScale})`, opacity: statsOp,
        marginTop: 32, textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          padding: "28px 60px",
          background: `${accent}14`,
          border: `2px solid ${accent}44`,
          borderRadius: 20,
          boxShadow: `0 0 40px ${accent}22`,
        }}>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 96, lineHeight: 1,
            color: accent,
            textShadow: `0 0 50px ${accent}66`,
          }}>{stat}</div>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 600,
            fontSize: 24, color: "rgba(255,255,255,0.8)",
            marginTop: 8,
          }}>{statLabel}</div>
          {subtitle && (
            <div style={{
              fontFamily: "sans-serif", fontWeight: 400,
              fontSize: 16, color: "rgba(255,255,255,0.45)",
              marginTop: 8, fontStyle: "italic",
            }}>{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};
