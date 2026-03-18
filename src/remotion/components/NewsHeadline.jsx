import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const NewsHeadline = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const outlet = data.outlet || "BREAKING NEWS";
  const headline = data.headline || "";
  const subtext = data.subtext || "";
  const date = data.date || new Date().getFullYear().toString();

  const slideIn = interpolate(clipFrame, [0, fps * 0.3], [-60, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  const headlineOp = interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const headlineY = interpolate(clipFrame, [fps * 0.2, fps * 0.45], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subtextOp = interpolate(clipFrame, [fps * 0.5, fps * 0.75], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Ticker scroll
  const tickerX = interpolate(clipFrame, [fps * 0.3, fps * 6], [0, -800], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      justifyContent: "center",
      background: bg,
      opacity: fadeIn,
      transform: `translateX(${slideIn}px)`,
    }}>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 6,
        background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
      }} />

      {/* Outlet badge */}
      <div style={{
        position: "absolute", top: 24, left: 60,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          background: accent, padding: "6px 16px", borderRadius: 4,
          fontFamily: "sans-serif", fontWeight: 900,
          fontSize: 16, color: "#000",
          textTransform: "uppercase", letterSpacing: 2,
        }}>{outlet}</div>
        <div style={{
          fontFamily: "sans-serif", fontSize: 14,
          color: "rgba(255,255,255,0.4)", fontStyle: "italic",
        }}>{date}</div>
      </div>

      {/* Main headline */}
      <div style={{ padding: "0 60px", marginTop: 20 }}>
        <div style={{
          opacity: headlineOp, transform: `translateY(${headlineY}px)`,
          fontFamily: "Georgia, serif", fontWeight: 700,
          fontSize: 48, color: "#ffffff",
          lineHeight: 1.25,
          borderLeft: `5px solid ${accent}`,
          paddingLeft: 24,
        }}>{headline}</div>

        {subtext && (
          <div style={{
            opacity: subtextOp, marginTop: 20, paddingLeft: 29,
            fontFamily: "sans-serif", fontWeight: 400,
            fontSize: 22, color: "rgba(255,255,255,0.6)",
            lineHeight: 1.5,
          }}>{subtext}</div>
        )}
      </div>

      {/* Bottom ticker */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 40, background: accent,
        overflow: "hidden", display: "flex", alignItems: "center",
      }}>
        <div style={{
          transform: `translateX(${tickerX}px)`,
          whiteSpace: "nowrap",
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 14, color: "#000",
          letterSpacing: 1,
        }}>
          {`${outlet} · ${headline} · ${subtext || ""} · `.repeat(3)}
        </div>
      </div>
    </div>
  );
};
