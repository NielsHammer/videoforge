import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const RocketLaunch = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;
  const text = data.text || "";
  const subtitle = data.subtitle || "";

  const launchDelay = fps * 0.5;
  const rocketY = interpolate(clipFrame, [launchDelay, launchDelay + fps * 1.5], [0, -500], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const rocketOp = interpolate(clipFrame, [launchDelay + fps * 1.2, launchDelay + fps * 1.5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shakeX = clipFrame > launchDelay && clipFrame < launchDelay + fps * 0.3
    ? Math.sin(clipFrame * 25) * 4 : 0;

  const textOp = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Trail particles
  const trailCount = 12;
  const trails = Array.from({ length: trailCount }, (_, i) => ({
    offset: i * 18,
    size: 4 + (i % 3) * 2,
    opacity: Math.max(0, 1 - i / trailCount) * (clipFrame > launchDelay ? 1 : 0),
  }));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Text */}
      {text && (
        <div style={{ textAlign: "center", opacity: textOp, transform: `translateY(${textY}px)`, marginBottom: 40, padding: "0 80px" }}>
          <div style={{ fontSize: 56, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 4, textShadow: `0 0 40px ${accent}60` }}>
            {text}
          </div>
          {subtitle && (
            <div style={{ fontSize: 22, color: accent, marginTop: 12, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif" }}>
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* Rocket + trail */}
      <div style={{ position: "relative", transform: `translateY(${rocketY}px) translateX(${shakeX}px)`, opacity: rocketOp }}>
        {/* Trail */}
        {trails.map((trail, i) => (
          <div key={i} style={{
            position: "absolute",
            left: "50%",
            top: trail.offset + 80,
            width: trail.size,
            height: trail.size,
            borderRadius: "50%",
            background: i < 4 ? "#ff6b00" : i < 8 ? "#ff9900" : "#ffcc00",
            transform: "translateX(-50%)",
            opacity: trail.opacity * 0.8,
            boxShadow: `0 0 ${trail.size * 2}px ${i < 4 ? "#ff6b00" : "#ffcc00"}`,
          }} />
        ))}

        {/* Rocket emoji at large size */}
        <div style={{ fontSize: 80, filter: `drop-shadow(0 0 20px ${accent}80)`, textAlign: "center" }}>
          🚀
        </div>
      </div>
    </div>
  );
};
