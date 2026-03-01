import React from "react";
import { AbsoluteFill, Img, useVideoConfig, interpolate, Easing } from "remotion";

export const CutoutScene = ({ imageSrc, position = "right", clipFrame = 0, transitionType = 0, isCutout = false }) => {
  const { fps } = useVideoConfig();
  if (!imageSrc) return null;

  const isRight = position === "right";

  // Dynamic slide-in entry
  const entry = interpolate(clipFrame, [0, fps * 0.35], [0, 1], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const slideX = interpolate(entry, [0, 1], [isRight ? 100 : -100, 0]);
  const imgOpacity = interpolate(entry, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Subtle breathing zoom on person
  const breathe = 1.0 + Math.sin(clipFrame / fps * 1.8) * 0.008;
  const slowZoom = 1.0 + (clipFrame / fps) * 0.005;
  const totalScale = slowZoom * breathe;

  const filterStyle = isCutout ? "grayscale(0.55) contrast(1.1)" : "none";

  // Pulsing yellow accent circle
  const circleEntry = interpolate(clipFrame, [fps * 0.08, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)),
  });
  const circleFloat = Math.sin(clipFrame / fps * 1.0) * 8;
  const circlePulse = 1.0 + Math.sin(clipFrame / fps * 2.5) * 0.04;

  return (
    <AbsoluteFill>
      {/* Subtle gradient bg */}
      <div style={{
        position: "absolute", inset: 0,
        background: isRight
          ? "linear-gradient(135deg, rgba(10,15,40,0.3) 0%, transparent 50%)"
          : "linear-gradient(225deg, rgba(10,15,40,0.3) 0%, transparent 50%)",
      }} />

      {/* Yellow accent circle */}
      <div style={{
        position: "absolute",
        [isRight ? "right" : "left"]: "14%",
        top: "6%",
        width: 240, height: 240,
        borderRadius: "50%",
        background: "radial-gradient(circle, #e8b830 0%, #d4a020 50%, transparent 100%)",
        opacity: circleEntry * 0.8,
        transform: `scale(${circleEntry * circlePulse}) translateY(${circleFloat}px)`,
        filter: "blur(1.5px)",
        zIndex: 1,
      }} />

      {/* Person */}
      <Img src={imageSrc} style={{
        position: "absolute",
        [isRight ? "right" : "left"]: 0,
        bottom: 0,
        height: "100%", width: "auto", maxWidth: "65%",
        objectFit: "contain",
        objectPosition: `${isRight ? "right" : "left"} bottom`,
        filter: filterStyle,
        transform: `translateX(${slideX}px) scale(${totalScale})`,
        opacity: imgOpacity,
        zIndex: 5,
        imageOrientation: "from-image",
      }} />
    </AbsoluteFill>
  );
};
