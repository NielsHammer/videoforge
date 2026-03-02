import React from "react";
import { AbsoluteFill, Img, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * LayeredScene v22: Blurred bg + foreground person/image.
 * - No more yellow circle
 * - Themed decorations based on clipIndex
 * - Foreground takes up more space (85% width)
 */
export const LayeredScene = ({ imageSrc, clipFrame = 0, isCutout = false, clipIndex = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#6c5ce7";

  const bgScale = interpolate(clipFrame, [0, fps * 6], [1.05, 1.15], { extrapolateRight: "clamp" });
  const fgP = interpolate(clipFrame, [fps * 0.15, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fgScale = interpolate(fgP, [0, 1], [0.8, 1]);
  const fgY = interpolate(fgP, [0, 1], [40, 0]);
  const floatY = Math.sin(clipFrame / fps * 0.9) * 3;

  // Decoration variant based on clipIndex
  const variant = clipIndex % 5;

  return (
    <AbsoluteFill>
      {/* Blurred background */}
      {imageSrc && (
        <div style={{
          position: "absolute", top: -20, left: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)",
          transform: `scale(${bgScale})`, transformOrigin: "center",
          filter: "blur(14px) brightness(0.4) saturate(0.6)",
        }}>
          <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,20,0.2)" }} />

      {/* Themed decoration behind person (replaces yellow circle) */}
      {isCutout && (
        <LayeredDecoration variant={variant} accent={accent} fgP={fgP} clipFrame={clipFrame} fps={fps} />
      )}

      {/* Foreground image — BIGGER: 85% width */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: "7.5%", width: "85%",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        transform: `scale(${fgScale}) translateY(${fgY + floatY}px)`,
        transformOrigin: "bottom center", zIndex: 2,
      }}>
        {imageSrc && (
          <Img src={imageSrc} style={{
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
            filter: isCutout
              ? "grayscale(0.55) contrast(1.1) brightness(1.05) drop-shadow(0 15px 40px rgba(0,0,0,0.6))"
              : "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
            borderRadius: isCutout ? 0 : 16,
          }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

const LayeredDecoration = ({ variant, accent, fgP, clipFrame, fps }) => {
  const scale = interpolate(fgP, [0, 0.7, 1], [0.3, 1.05, 1]);
  const opacity = interpolate(fgP, [0.2, 0.6], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const base = {
    position: "absolute",
    top: "5%",
    left: "50%",
    transform: `translateX(-50%) scale(${scale})`,
    opacity,
    zIndex: 1,
    pointerEvents: "none",
  };

  switch (variant) {
    case 0: // Soft glow circle
      return <div style={{ ...base, width: 280, height: 280, marginLeft: -140, borderRadius: "50%", background: `radial-gradient(circle, ${accent}35, transparent 65%)` }} />;
    case 1: // Ring outline
      return <div style={{ ...base, width: 260, height: 260, marginLeft: -130, borderRadius: "50%", border: `3px solid ${accent}30` }} />;
    case 2: // Soft glow blob
      return <div style={{ ...base, width: 300, height: 250, marginLeft: -150, borderRadius: "50%", background: `radial-gradient(ellipse, ${accent}20, transparent 60%)`, filter: "blur(10px)" }} />;
    case 3: // Rotated square
      return <div style={{ ...base, width: 200, height: 200, marginLeft: -100, transform: `translateX(-50%) scale(${scale}) rotate(45deg)`, border: `2px solid ${accent}25`, borderRadius: 12 }} />;
    case 4: // Double ring
      return (
        <>
          <div style={{ ...base, width: 240, height: 240, marginLeft: -120, borderRadius: "50%", border: `2px solid ${accent}25` }} />
          <div style={{ ...base, width: 300, height: 300, marginLeft: -150, borderRadius: "50%", border: `1px solid ${accent}12` }} />
        </>
      );
    default: return null;
  }
};
