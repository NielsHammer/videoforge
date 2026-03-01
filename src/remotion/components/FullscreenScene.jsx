import React from "react";
import { AbsoluteFill, Img, useVideoConfig, interpolate, Easing } from "remotion";

export const FullscreenScene = ({ imageSrc, clipFrame = 0, zoom = false, clipIndex = 0, sceneIndex = 0, framed = false }) => {
  const { fps } = useVideoConfig();
  if (!imageSrc) return null;

  const entry = interpolate(clipFrame, [0, fps * 0.2], [0, 1], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(entry, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Stronger Ken Burns - more cinematic movement
  const direction = (sceneIndex * 3 + clipIndex) % 6;
  const zoomBase = zoom ? 1.08 : 1.04;
  const zoomEnd = zoom ? 1.18 : 1.1;
  const scale = interpolate(clipFrame, [0, fps * 5], [zoomBase, zoomEnd], { extrapolateRight: "clamp" });
  
  // Varied pan directions for visual interest
  const panPatterns = [
    { x: 8, y: 4 },   // drift right-down
    { x: -8, y: -3 },  // drift left-up
    { x: 6, y: -5 },   // drift right-up
    { x: -6, y: 4 },   // drift left-down
    { x: 0, y: 6 },    // drift down
    { x: -10, y: 0 },  // drift left
  ];
  const pan = panPatterns[direction];
  const progress = clipFrame / (fps * 4);
  const panX = pan.x * progress;
  const panY = pan.y * progress;

  // Cinematic vignette overlay
  const vignette = (
    <div style={{
      position: "absolute", inset: 0, zIndex: 2,
      background: "radial-gradient(ellipse at center, transparent 50%, rgba(5,5,16,0.5) 100%)",
      pointerEvents: "none",
    }} />
  );

  if (framed) {
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
        <div style={{
          width: "78%", height: "82%",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,158,255,0.1)",
          border: "2px solid rgba(74,158,255,0.08)",
          position: "relative",
        }}>
          <Img src={imageSrc} style={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            imageOrientation: "from-image",
          }} />
          {vignette}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img src={imageSrc} style={{
        width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
        imageOrientation: "from-image",
      }} />
      {vignette}
    </AbsoluteFill>
  );
};
