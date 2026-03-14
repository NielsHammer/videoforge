import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img } from "remotion";
import { getTheme } from "../../themes.js";

// OverlayCaption: Full image with bold caption text overlaid at bottom (or top)
// Best for: documentary style, dramatic reveals, quote-over-image, storytelling
// This is better than fullscreen because the text is part of the composition
// data: { caption: "This changes everything", position: "bottom" | "top" | "center", style: "bold" | "subtitle" }
// imagePath: passed from clip.imagePath
export const OverlayCaption = ({ data, imagePath = null, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data) return null;
  const caption = data.caption || "";
  const position = data.position || "bottom";
  const captionStyle = data.style || "bold";

  const imgSrc = imagePath ? staticFile(imagePath) : null;

  const imgOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const textOp = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(clipFrame, [fps * 0.3, fps * 0.7], [position === "bottom" ? 30 : -30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const vertAlign = position === "top" ? "flex-start" : position === "center" ? "center" : "flex-end";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Full image */}
      {imgSrc && (
        <Img
          src={imgSrc}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imgOp }}
        />
      )}

      {/* Gradient overlay so text is always readable */}
      <div style={{
        position: "absolute", inset: 0,
        background: position === "center"
          ? "rgba(0,0,0,0.45)"
          : position === "bottom"
          ? "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)"
          : "linear-gradient(to top, transparent 40%, rgba(0,0,0,0.85) 100%)",
      }} />

      {/* Caption */}
      {caption && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          justifyContent: vertAlign,
          padding: position === "center" ? "0 80px" : "0 60px 60px 60px",
          opacity: textOp, transform: `translateY(${textY}px)`,
        }}>
          {captionStyle === "bold" ? (
            <div style={{
              fontSize: 62, fontWeight: 900, color: "white",
              fontFamily: "Arial Black, Arial, sans-serif",
              lineHeight: 1.15, textAlign: position === "center" ? "center" : "left",
              textShadow: `2px 2px 0 rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)`,
              borderLeft: position !== "center" ? `5px solid ${accent}` : "none",
              paddingLeft: position !== "center" ? 20 : 0,
            }}>
              {caption}
            </div>
          ) : (
            <div style={{
              fontSize: 36, fontWeight: 600, color: "white",
              fontFamily: "Arial, sans-serif", lineHeight: 1.4,
              textAlign: "center", textShadow: "1px 1px 0 rgba(0,0,0,0.9)",
              backgroundColor: "rgba(0,0,0,0.5)", padding: "16px 24px",
              borderRadius: 8, backdropFilter: "blur(4px)",
            }}>
              {caption}
            </div>
          )}
        </div>
      )}

      {/* Accent bar at bottom */}
      {position === "bottom" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          backgroundColor: accent, boxShadow: `0 0 20px ${accent}`,
          opacity: textOp,
        }} />
      )}
    </div>
  );
};
