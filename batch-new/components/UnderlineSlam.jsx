import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "400% MORE SPENDING", subtext: "in just 20 years", underlineColor: "accent|red|green" }
export const UnderlineSlam = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.text) return null;

  const text = (data.text || "").toUpperCase();
  const subtext = data.subtext || "";
  const colorMap = { accent, red: "#ef4444", green: "#22c55e", gold: "#f59e0b" };
  const underlineColor = colorMap[data.underlineColor] || accent;

  const textOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(clipFrame, [0, fps * 0.3], [-40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
  const lineW = interpolate(clipFrame, [fps * 0.3, fps * 0.7], ["0%", "100%"], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(clipFrame, [fps * 0.7, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = text.length > 20 ? 52 : text.length > 12 ? 68 : 88;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, textAlign: "center", opacity: textOp, transform: `translateY(${textY}px)`, lineHeight: 1.1, textShadow: `0 0 40px ${underlineColor}30` }}>
          {text}
        </div>
        {/* Animated underline */}
        <div style={{ height: 6, width: lineW, background: underlineColor, borderRadius: 3, marginTop: 10, boxShadow: `0 0 20px ${underlineColor}80` }} />
      </div>
      {subtext && (
        <div style={{ fontSize: 20, fontWeight: 500, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", textAlign: "center", opacity: subOp, marginTop: 20 }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

// DramaticReveal — Text hidden behind blur that slowly sharpens into focus
// CENTERED. Creates suspense. Good for revelations.
// data: { text: "He had 23 minutes left to live", label: "THE TRUTH" }
