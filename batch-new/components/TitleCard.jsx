import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// TitleCard — Cinematic chapter title. Thin line, elegant fade.
// CENTERED HORIZONTAL. For chapter breaks between major sections.
// data: { number: "Chapter One", title: "THE GOLDEN TRAP", subtitle: "optional" }
export const TitleCard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.title) return null;

  const number = data.number || "";
  const title = (data.title || "").toUpperCase();
  const subtitle = data.subtitle || "";

  const numOp = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.3, fps * 0.8], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 100px" }}>
      {number && (
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 6, color: accent, fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: numOp, marginBottom: 20 }}>
          {number}
        </div>
      )}
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`, marginBottom: 24 }} />
      <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 6, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", textAlign: "center", opacity: titleOp, transform: `translateY(${titleY}px)`, lineHeight: 1.15 }}>
        {title}
      </div>
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`, marginTop: 24 }} />
      {subtitle && (
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 4, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: subOp, marginTop: 20 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
