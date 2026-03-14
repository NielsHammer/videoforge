import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const LightbulbMoment = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#eab308";
  if (!data) return null;
  const text = data.text || "";
  const subtitle = data.subtitle || "";

  // Flicker sequence then stays on
  const flickerOn = clipFrame > fps * 0.1 && clipFrame < fps * 0.2;
  const flickerOff = clipFrame > fps * 0.25 && clipFrame < fps * 0.32;
  const flickerOn2 = clipFrame > fps * 0.35 && clipFrame < fps * 0.42;
  const solidOn = clipFrame > fps * 0.5;
  const bulbOn = solidOn || flickerOn || flickerOn2;

  const bulbScale = interpolate(clipFrame, [0, fps * 0.3], [0.7, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.3)) });
  const textOp = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = bulbOn ? (0.7 + Math.sin(clipFrame / fps * 3) * 0.15) : 0;
  const glowColor = "#eab308";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Glow behind bulb */}
      {bulbOn && (
        <div style={{
          position: "absolute",
          width: 300, height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}${Math.round(glow * 80).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          pointerEvents: "none",
          top: "50%", left: "50%",
          transform: "translate(-50%, -60%)",
        }} />
      )}

      {/* Lightbulb SVG */}
      <div style={{ transform: `scale(${bulbScale})`, marginBottom: 24 }}>
        <svg width="120" height="150" viewBox="0 0 120 150">
          {/* Bulb body */}
          <path d="M 60 10 C 30 10 15 35 15 55 C 15 75 30 88 40 95 L 40 110 L 80 110 L 80 95 C 90 88 105 75 105 55 C 105 35 90 10 60 10 Z"
            fill={bulbOn ? glowColor : "rgba(255,255,255,0.1)"}
            stroke={bulbOn ? glowColor : "rgba(255,255,255,0.3)"}
            strokeWidth="2"
            style={{ filter: bulbOn ? `drop-shadow(0 0 20px ${glowColor})` : "none", transition: "none" }}
          />
          {/* Base */}
          <rect x="38" y="110" width="44" height="8" rx="2" fill={bulbOn ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"} />
          <rect x="40" y="120" width="40" height="8" rx="2" fill={bulbOn ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"} />
          <rect x="44" y="130" width="32" height="8" rx="4" fill={bulbOn ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} />
          {/* Filament */}
          {bulbOn && (
            <path d="M 48 90 L 52 70 L 56 80 L 60 60 L 64 80 L 68 70 L 72 90"
              stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 4px white)" }}
            />
          )}
        </svg>
      </div>

      {/* Text */}
      {text && (
        <div style={{ textAlign: "center", opacity: textOp, transform: `translateY(${textY}px)`, padding: "0 80px" }}>
          <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, lineHeight: 1.2, textShadow: `0 0 30px ${glowColor}40` }}>
            {text}
          </div>
          {subtitle && (
            <div style={{ fontSize: 22, color: `rgba(255,255,255,0.65)`, marginTop: 12, fontFamily: "Arial, sans-serif", letterSpacing: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
