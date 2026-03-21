import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { chapter: "Chapter Two", title: "THE CRACKS NOBODY SAW" }
export const ChapterBreak = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.title) return null;

  const chapter = data.chapter || "";
  const title = (data.title || "").toUpperCase();

  const fadeIn = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.2, fps * 0.7], [0, 500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(clipFrame, [fps * 0.4, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(clipFrame, [fps * 0.4, fps * 0.8], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
      <div style={{ opacity: fadeIn, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {chapter && (
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 6, color: `${accent}99`, fontFamily: "Arial, sans-serif", textTransform: "uppercase", marginBottom: 20 }}>
            {chapter}
          </div>
        )}
        <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginBottom: 20 }} />
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 5, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textAlign: "center", opacity: titleOp, transform: `translateY(${titleY}px)`, lineHeight: 1.2, maxWidth: 800, padding: "0 40px" }}>
          {title}
        </div>
        <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginTop: 20 }} />
      </div>
    </div>
  );
};

// TimeJump — "3 YEARS LATER" cinematic time transition
// CENTERED. Film-grain texture, fades in and holds.
// data: { time: "3 YEARS LATER", context: "optional small context text" }
