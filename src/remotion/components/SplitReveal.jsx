import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img, staticFile } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * SplitReveal v1 — Image on one side, animated content panel on the other
 * Replaces the old SplitLayout keyword display
 * The right panel shows intentional content: stat, quote, or kinetic words
 * data.panel_type: "stat" | "words" | "quote" | "clean"
 */
export const SplitReveal = ({ imageSrc, position = "left", clipFrame = 0, theme = "blue_grid", clip = null }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  // Image animations
  const imgOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(clipFrame, [0, fps * 0.2], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const driftX = interpolate(Math.sin(clipFrame / (fps * 2.5)), [-1, 1], [-4, 4]);
  const driftY = interpolate(Math.cos(clipFrame / (fps * 3)), [-1, 1], [-3, 3]);
  const zoom = interpolate(clipFrame, [0, fps * 8], [1, 1.05], { extrapolateRight: "clamp" });

  // Panel animations
  const panelOp = interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const panelX = interpolate(clipFrame, [fps * 0.2, fps * 0.5], [position === "left" ? -30 : 30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const pulse = 0.6 + Math.sin(clipFrame / fps * 1.5) * 0.2;
  const isLeft = position === "left";

  // Determine what to show in the panel
  const panelText = clip?.panel_text || null;
  const panelType = clip?.panel_type || (panelText ? "words" : "clean");

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
      {/* Image side */}
      {imageSrc && (
        <div style={{
          position: "absolute", top: 40, bottom: 40,
          [isLeft ? "left" : "right"]: 32,
          width: "48%",
          borderRadius: 20, overflow: "hidden",
          opacity: imgOp,
          transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
          boxShadow: "0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
          border: "1.5px solid rgba(255,255,255,0.15)",
        }}>
          <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        </div>
      )}

      {/* Content panel */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        [isLeft ? "right" : "left"]: 0,
        width: "46%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 28px",
        opacity: panelOp,
        transform: `translateX(${panelX}px)`,
      }}>
        {panelType === "clean" && null}

        {panelType === "words" && panelText && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ width: 40, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, margin: "0 auto 24px", borderRadius: 2, opacity: pulse }} />
            {panelText.split(/\s+/).slice(0, 3).map((word, i) => (
              <div key={i} style={{
                fontSize: i === 0 ? 64 : 48,
                fontWeight: 900,
                fontFamily: "Arial Black, Arial, sans-serif",
                color: i === 0 ? "#ffffff" : `rgba(255,255,255,0.65)`,
                textTransform: "uppercase",
                letterSpacing: 2,
                lineHeight: 1.1,
                marginBottom: 6,
                textShadow: i === 0 ? `0 0 40px ${accent}50` : "none",
                opacity: interpolate(clipFrame, [fps * (0.2 + i * 0.1), fps * (0.4 + i * 0.1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translateY(${interpolate(clipFrame, [fps * (0.2 + i * 0.1), fps * (0.4 + i * 0.1)], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}>
                {word.toUpperCase()}
              </div>
            ))}
            <div style={{ width: 40, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, margin: "20px auto 0", borderRadius: 2, opacity: pulse }} />
          </div>
        )}

        {panelType === "stat" && clip?.panel_stat && (
          <div style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}25`, borderRadius: 16, padding: "28px 24px", width: "100%" }}>
            <div style={{ fontSize: 80, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffff", lineHeight: 1, textShadow: `0 0 40px ${accent}60`, marginBottom: 8 }}>
              {clip.panel_stat.value}
            </div>
            <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`, margin: "12px 0" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 3 }}>
              {clip.panel_stat.label}
            </div>
          </div>
        )}

        {panelType === "icon" && clip?.panel_icon && (
          <div style={{ textAlign: "center" }}>
            {/* Big animated icon */}
            <div style={{
              fontSize: 120,
              lineHeight: 1,
              filter: `drop-shadow(0 0 40px ${accent}80)`,
              transform: `scale(${interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) })}) translateY(${Math.sin(clipFrame / fps * 1.2) * 8}px)`,
              opacity: interpolate(clipFrame, [fps * 0.2, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              {clip.panel_icon}
            </div>
            {/* Pulse ring */}
            <div style={{
              width: 160, height: 160,
              borderRadius: "50%",
              border: `2px solid ${accent}${Math.round(pulse * 60).toString(16).padStart(2, '0')}`,
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }} />
            {/* Panel text below icon */}
            {panelText && (
              <div style={{
                fontSize: 28, fontWeight: 900,
                fontFamily: "Arial Black, Arial, sans-serif",
                color: "white", textTransform: "uppercase",
                letterSpacing: 2, marginTop: 24,
                opacity: interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                textShadow: `0 0 20px ${accent}40`,
              }}>
                {panelText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
