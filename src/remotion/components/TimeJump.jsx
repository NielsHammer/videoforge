import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { time: "3 YEARS LATER", context: "optional small context text" }
export const TimeJump = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.time) return null;

  const time = (data.time || "").toUpperCase();
  const context = data.context || "";

  const op = interpolate(clipFrame, [0, fps * 0.5, fps * 1.5, fps * 2], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 350], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contextOp = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: op }}>
      {/* Film grain effect using noise pattern */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)", pointerEvents: "none" }} />
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`, marginBottom: 20 }} />
      <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", letterSpacing: 6, textTransform: "uppercase", textAlign: "center", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
        {time}
      </div>
      <div style={{ width: lineW, height: 1, background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`, marginTop: 20 }} />
      {context && (
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 4, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: contextOp, marginTop: 20 }}>
          {context}
        </div>
      )}
    </div>
  );
};

// LocationStamp — Documentary-style establishing shot text overlay
// BOTTOM-LEFT aligned like a real documentary. Location name + coordinates.
// data: { location: "ROME, ITALY", sublocation: "The Imperial Palace", year: "476 AD" }
