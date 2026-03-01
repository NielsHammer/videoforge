import React from "react";
import { AbsoluteFill, Img, useVideoConfig, interpolate, Easing } from "remotion";

export const LayeredScene = ({ imageSrc, clipFrame = 0, isCutout = false }) => {
  const { fps } = useVideoConfig();
  const bgScale = interpolate(clipFrame, [0, fps * 6], [1.05, 1.15], { extrapolateRight: "clamp" });
  const fgP = interpolate(clipFrame, [fps * 0.15, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const fgScale = interpolate(fgP, [0, 1], [0.75, 1]);
  const fgY = interpolate(fgP, [0, 1], [50, 0]);
  const floatY = Math.sin(clipFrame / fps * 0.9) * 3;

  return (
    <AbsoluteFill>
      {imageSrc && (
        <div style={{
          position: "absolute", top: -20, left: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)",
          transform: `scale(${bgScale})`, transformOrigin: "center",
          filter: "blur(14px) brightness(0.4) saturate(0.6)",
        }}>
          <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,20,0.2)" }} />

      {/* Yellow circle - centered behind person */}
      {isCutout && (
        <div style={{
          position: "absolute", top: "5%", left: "calc(50% - 140px)",
          width: 280, height: 280, borderRadius: "50%",
          background: "#f5c542",
          opacity: interpolate(fgP, [0.2, 0.6], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `scale(${interpolate(fgP, [0, 0.7, 1], [0.3, 1.05, 1])})`,
          zIndex: 1,
        }} />
      )}

      <div style={{
        position: "absolute", top: 0, bottom: 0, left: "15%", width: "70%",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        transform: `scale(${fgScale}) translateY(${fgY + floatY}px)`,
        transformOrigin: "bottom center", zIndex: 2,
      }}>
        {imageSrc && (
          <Img src={imageSrc} style={{
            maxWidth: "95%", maxHeight: "95%", objectFit: "contain",
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
