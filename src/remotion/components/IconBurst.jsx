import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * IconBurst v1 — Animated emoji/icon burst radiating from center
 * Great for list moments, feature reveals, or celebratory beats
 * data: { icons: ["🚀","💰","🎯","⚡","🔥"], label: "What you'll get", style: "burst|grid|orbit" }
 */
export const IconBurst = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data || !data.icons) return null;

  const icons = data.icons.slice(0, 6);
  const label = data.label || "";
  const style = data.style || "burst";

  if (style === "grid") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
        {label && (
          <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, opacity: interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" }) }}>
            {label}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, maxWidth: 600 }}>
          {icons.map((icon, i) => {
            const delay = i * fps * 0.12;
            const scale = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)) });
            const opacity = interpolate(clipFrame, [delay, delay + fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ fontSize: 64, transform: `scale(${scale})`, opacity, filter: `drop-shadow(0 0 20px ${accent}60)` }}>
                {icon}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (style === "orbit") {
    const orbitRadius = 180;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Center label */}
        <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 2, textAlign: "center", zIndex: 10, maxWidth: 200, lineHeight: 1.2, opacity: interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {label}
        </div>
        {icons.map((icon, i) => {
          const angle = (i / icons.length) * Math.PI * 2 + (clipFrame / fps) * 0.3;
          const delay = i * fps * 0.1;
          const progress = interpolate(clipFrame, [delay, delay + fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const r = orbitRadius * progress;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          return (
            <div key={i} style={{ position: "absolute", fontSize: 48, transform: `translate(${x}px, ${y}px)`, opacity: progress, filter: `drop-shadow(0 0 15px ${accent}80)` }}>
              {icon}
            </div>
          );
        })}
      </div>
    );
  }

  // Default: burst from center
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {label && (
        <div style={{ position: "absolute", fontSize: 40, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3, textAlign: "center", bottom: "25%", opacity: interpolate(clipFrame, [fps * 0.4, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {label}
        </div>
      )}
      {icons.map((icon, i) => {
        const angle = (i / icons.length) * Math.PI * 2 - Math.PI / 2;
        const delay = i * fps * 0.08;
        const dist = interpolate(clipFrame, [delay, delay + fps * 0.5], [0, 240], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const scale = interpolate(clipFrame, [delay, delay + fps * 0.3], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
        const opacity = interpolate(clipFrame, [delay, delay + fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        // Subtle float after burst
        const floatY = Math.sin(clipFrame / fps * 1.5 + i) * 6;
        return (
          <div key={i} style={{ position: "absolute", fontSize: 56, transform: `translate(${x}px, ${y + floatY}px) scale(${scale})`, opacity, filter: `drop-shadow(0 0 20px ${accent}60)` }}>
            {icon}
          </div>
        );
      })}
    </div>
  );
};
