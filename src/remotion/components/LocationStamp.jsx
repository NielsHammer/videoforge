import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { location: "ROME, ITALY", sublocation: "The Imperial Palace", year: "476 AD" }
export const LocationStamp = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.location) return null;

  const location = (data.location || "").toUpperCase();
  const sublocation = data.sublocation || "";
  const year = data.year || "";

  const op = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const x = interpolate(clipFrame, [0, fps * 0.4], [-30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const lineW = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Bottom-left positioning like a real documentary */}
      <div style={{ position: "absolute", bottom: 80, left: 60, opacity: op, transform: `translateX(${x}px)` }}>
        {/* Accent line */}
        <div style={{ width: lineW, height: 2, background: accent, marginBottom: 10 }} />
        {/* Location name */}
        <div style={{ fontSize: 26, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", letterSpacing: 4, textTransform: "uppercase", textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
          {location}
        </div>
        {/* Sublocation */}
        {sublocation && (
          <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", letterSpacing: 3, textTransform: "uppercase", marginTop: 4, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
            {sublocation}
          </div>
        )}
        {/* Year */}
        {year && (
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: "Arial, sans-serif", letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
            {year}
          </div>
        )}
      </div>
    </div>
  );
};
