import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { status: "CLASSIFIED"|"DECLASSIFIED"|"TOP SECRET"|"CASE CLOSED", subtext: "FBI File #..." }
export const ClassifiedStamp = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.status) return null;

  const status = (data.status || "CLASSIFIED").toUpperCase();
  const subtext = data.subtext || "";
  const isDeclassified = status.includes("DECLASSIF");
  const color = isDeclassified ? "#22c55e" : "#ef4444";

  const scale = interpolate(clipFrame, [0, fps * 0.12, fps * 0.22, fps * 0.32], [4, 0.85, 1.05, 1], { extrapolateRight: "clamp" });
  const op = interpolate(clipFrame, [0, fps * 0.06], [0, 1], { extrapolateRight: "clamp" });
  const rotation = interpolate(clipFrame, [0, fps * 0.12], [-8, -3], { extrapolateRight: "clamp" });
  const subOp = interpolate(clipFrame, [fps * 0.4, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Impact rings
  const ring1Scale = interpolate(clipFrame, [fps * 0.12, fps * 0.6], [1, 2.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ring1Op = interpolate(clipFrame, [fps * 0.12, fps * 0.6], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const fontSize = status.length > 12 ? 48 : status.length > 8 ? 64 : 80;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative" }}>
        {/* Impact ring */}
        <div style={{ position: "absolute", inset: -50, border: `3px solid ${color}`, borderRadius: 12, transform: `scale(${ring1Scale}) rotate(${rotation}deg)`, opacity: ring1Op }} />
        {/* Stamp */}
        <div style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, opacity: op }}>
          <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color, border: `8px solid ${color}`, padding: "12px 24px", borderRadius: 8, opacity: 0.85, letterSpacing: 6, textShadow: `0 0 20px ${color}80`, boxShadow: `0 0 30px ${color}30, inset 0 0 15px ${color}10`, textAlign: "center" }}>
            {status}
          </div>
        </div>
      </div>
      {subtext && (
        <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", letterSpacing: 3, textTransform: "uppercase", opacity: subOp, marginTop: 24 }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

// NewspaperFlash — Spinning newspaper lands revealing a headline. Vintage drama.
// CENTERED. The newspaper spins in from darkness, stops, headline visible.
// data: { headline: "EMPEROR ASSASSINATED", subhead: "The Roman Republic in Crisis", date: "March 15, 44 BC" }
