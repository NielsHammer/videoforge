import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * FramedScene v2 — Image in a frame with the animated background visible
 * Much more visually interesting than fullscreen - shows the theme
 * display_style: "framed" uses this
 */
export const FramedScene = ({ imageSrc, clipFrame = 0, theme = "blue_grid", clip = null, variant = "center" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  const imgOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(clipFrame, [0, fps * 0.2], [0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const zoom = interpolate(clipFrame, [0, fps * 8], [1, 1.06], { extrapolateRight: "clamp" });
  const driftX = interpolate(Math.sin(clipFrame / (fps * 2.8)), [-1, 1], [-5, 5]);
  const driftY = interpolate(Math.cos(clipFrame / (fps * 3.2)), [-1, 1], [-3, 3]);

  const cornerProgress = interpolate(clipFrame, [fps * 0.1, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const cornerLen = 40 * cornerProgress;

  const frameVariants = {
    center:       { top: 60,  left: 140, right: 140, bottom: 60 },
    wide:         { top: 80,  left: 60,  right: 60,  bottom: 80 },
    tall:         { top: 40,  left: 200, right: 200, bottom: 40 },
    offset_left:  { top: 60,  left: 80,  right: 280, bottom: 60 },
    offset_right: { top: 60,  left: 280, right: 80,  bottom: 60 },
  };
  const f = frameVariants[variant] || frameVariants.center;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
      {/* Main frame */}
      <div style={{
        position: "absolute",
        top: f.top, left: f.left, right: f.right, bottom: f.bottom,
        borderRadius: 20, overflow: "hidden",
        opacity: imgOp,
        transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
        boxShadow: `0 20px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px ${accent}10`,
        border: `1.5px solid rgba(255,255,255,0.12)`,
      }}>
        {imageSrc && (
          <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        )}
      </div>

      {/* Top-left corner */}
      <div style={{ position: "absolute", top: f.top - 8, left: f.left - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
      {/* Top-right corner */}
      <div style={{ position: "absolute", top: f.top - 8, right: f.right - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
      {/* Bottom-left corner */}
      <div style={{ position: "absolute", bottom: f.bottom - 8, left: f.left - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
      {/* Bottom-right corner */}
      <div style={{ position: "absolute", bottom: f.bottom - 8, right: f.right - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
    </div>
  );
};
