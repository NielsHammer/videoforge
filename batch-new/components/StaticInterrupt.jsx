import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "IT NEVER STOPPED", subtext: "The haunting continues to this day" }
export const StaticInterrupt = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.text) return null;

  const text = (data.text || "").toUpperCase();
  const subtext = data.subtext || "";

  // Phase 1: static (0 to 0.4s), Phase 2: text reveal (0.4s+)
  const staticPhase = clipFrame < fps * 0.4;
  const staticOp = interpolate(clipFrame, [0, fps * 0.35, fps * 0.4], [1, 0.5, 0], { extrapolateRight: "clamp" });
  const textOp = interpolate(clipFrame, [fps * 0.35, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textScale = interpolate(clipFrame, [fps * 0.35, fps * 0.7], [1.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Occasional glitch after reveal
  const glitch = clipFrame > fps * 0.7 && Math.floor(clipFrame / 5) % 15 === 0 ? 3 : 0;

  const fontSize = text.length > 20 ? 44 : text.length > 12 ? 60 : 80;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Static overlay */}
      {staticPhase && (
        <div style={{ position: "absolute", inset: 0, opacity: staticOp, background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)", backgroundSize: "100% 4px" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px", opacity: staticOp }} />
        </div>
      )}

      {/* Text */}
      <div style={{ opacity: textOp, transform: `scale(${textScale}) translateX(${glitch}px)` }}>
        <div style={{ fontSize, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textAlign: "center", letterSpacing: 4, textTransform: "uppercase", textShadow: `0 0 20px rgba(255,255,255,0.5), ${glitch}px 0 #ef4444, -${glitch}px 0 #3b82f6` }}>
          {text}
        </div>
      </div>
      {subtext && (
        <div style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", textAlign: "center", opacity: textOp, marginTop: 20, fontStyle: "italic" }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

// CreepZoom — Text slowly creeps toward viewer. Pure unease.
// data: { text: "Something was watching.", label: "They were never alone." }
