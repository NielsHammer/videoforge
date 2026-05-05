import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { springIn, breathe } from "./_shared.jsx";

/**
 * CinematicText — a film-title style text reveal with slow dolly zoom,
 * deep vignette, letterbox bars, and elegant typography. No flashing.
 * Feels like the opening frame of a prestige documentary.
 * data: { text: "the line", subtext: "optional secondary line" }
 */
export const CinematicText = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const text = data.text || "";
  const subtext = data.subtext || "";

  // Slow continuous zoom
  const zoom = 1 + (clipFrame / fps) * 0.012;
  const textOp = springIn(clipFrame, fps, 0.3, 1.0);
  const textY = interpolate(textOp, [0, 1], [30, 0]);
  const subOp = springIn(clipFrame, fps, 0.9, 0.7);

  // Letterbox bars slide in at the start
  const barHeight = interpolate(clipFrame, [0, fps * 0.5], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "#000",
      overflow: "hidden",
    }}>
      {/* Background: deep gradient with slow parallax */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, #12182e 0%, #050814 60%, #010205 100%)",
        transform: `scale(${zoom})`,
      }} />

      {/* Subtle moving light rays */}
      <div style={{
        position: "absolute", inset: 0,
        background: `conic-gradient(from ${clipFrame / fps * 8}deg at 50% 50%, transparent 0deg, rgba(255,240,200,0.03) 40deg, transparent 80deg, transparent 180deg, rgba(140,180,255,0.03) 220deg, transparent 260deg)`,
        pointerEvents: "none",
      }} />

      {/* Letterbox top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: barHeight,
        background: "#000",
        zIndex: 10,
        boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
      }} />
      {/* Letterbox bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: barHeight,
        background: "#000",
        zIndex: 10,
        boxShadow: "0 -10px 40px rgba(0,0,0,0.8)",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
        pointerEvents: "none",
      }} />

      {/* Text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 5,
      }}>
        <div style={{
          fontSize: text.length > 50 ? 68 : 88,
          fontWeight: 300,
          color: "#f0ebe0",
          letterSpacing: "3px",
          lineHeight: 1.2,
          textAlign: "center",
          maxWidth: 1500,
          padding: "0 120px",
          opacity: textOp,
          transform: `translateY(${textY}px)`,
          fontFamily: "'Playfair Display', 'Crimson Text', Georgia, serif",
          textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 10px rgba(220,190,140,0.2)",
          textTransform: "uppercase",
        }}>{text}</div>
        {subtext && (
          <div style={{
            marginTop: 36,
            fontSize: 20,
            color: "rgba(220,200,170,0.6)",
            letterSpacing: 5,
            textTransform: "uppercase",
            fontWeight: 300,
            fontFamily: "'Inter', sans-serif",
            opacity: subOp,
          }}>{subtext}</div>
        )}
      </div>
    </div>
  );
};
