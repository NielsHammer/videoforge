import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from "remotion";

/**
 * SplitLayout v25.2: 
 * - Left side: Image in rounded-corner frame with drift/tilt (no background removal ever)
 * - Right side: Clean zone — subtitles centered vertically in this area
 * 
 * Image always has background, always framed with rounded corners.
 * No cutouts, no background removal.
 */
export const SplitLayout = ({ imageSrc, position = "left", clipFrame = 0, clipIndex = 0 }) => {
  const { fps } = useVideoConfig();

  const imgOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(clipFrame, [0, fps * 0.2], [0.93, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Slow drift
  const driftX = interpolate(Math.sin(clipFrame / (fps * 2.5)), [-1, 1], [-4, 4]);
  const driftY = interpolate(Math.cos(clipFrame / (fps * 3)), [-1, 1], [-3, 3]);

  // Subtle tilt
  const tilt = interpolate(Math.sin(clipFrame / (fps * 4)), [-1, 1], [-1, 1]);

  // Ken Burns
  const zoom = interpolate(clipFrame, [0, fps * 8], [1, 1.05], { extrapolateRight: "clamp" });

  const isLeft = position === "left";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
      {imageSrc && (
        <div style={{
          position: "absolute",
          top: 50,
          bottom: 50,
          [isLeft ? "left" : "right"]: 40,
          width: "46%",
          borderRadius: 24,
          overflow: "hidden",
          opacity: imgOp,
          transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px) rotate(${tilt}deg)`,
          boxShadow: "0 12px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.50)",
          border: "2px solid rgba(255,255,255,0.3)",
        }}>
          <Img
            src={imageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${zoom})`,
            }}
          />
        </div>
      )}
    </div>
  );
};
