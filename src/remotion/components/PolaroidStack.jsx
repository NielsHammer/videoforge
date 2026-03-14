import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Img } from "remotion";
import { getTheme } from "../../themes.js";

// PolaroidStack: Images displayed as stacked polaroid photos falling/sliding into place
// Best for: story content, lifestyle, travel, before/after, memories, personal brands
// Gracefully degrades: if no imagePaths, shows labeled placeholder cards
// data: { captions: ["caption1", "caption2", "caption3"] }
// imagePaths: passed from clip.imagePaths (up to 3)
export const PolaroidStack = ({ data, imagePaths = [], clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  const captions = data?.captions || ["", "", ""];
  const count = Math.max(1, Math.min(3, imagePaths.length || captions.filter(Boolean).length || 2));

  const rotations = [-8, 3, -5];
  const offsets = [
    { x: -120, y: 40 },
    { x: 80, y: -30 },
    { x: -20, y: 80 },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      {Array.from({ length: count }).map((_, i) => {
        const delay = i * fps * 0.25;
        const fallOp = interpolate(clipFrame, [delay, delay + fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const fallY = interpolate(clipFrame, [delay, delay + fps * 0.5], [-300, offsets[i].y], { extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: (t) => 1 - Math.pow(1 - t, 3) });
        const fallRot = interpolate(clipFrame, [delay, delay + fps * 0.5], [0, rotations[i]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        const img = imagePaths[i] || null;

        return (
          <div key={i} style={{
            position: "absolute",
            transform: `translate(${offsets[i].x}px, ${fallY}px) rotate(${fallRot}deg)`,
            opacity: fallOp,
            zIndex: i,
          }}>
            {/* Polaroid frame */}
            <div style={{
              backgroundColor: "white",
              padding: "14px 14px 40px 14px",
              borderRadius: 4,
              boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
              width: 240,
            }}>
              {/* Photo area */}
              <div style={{
                width: 212, height: 200, overflow: "hidden",
                backgroundColor: img ? "transparent" : `${accent}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {img ? (
                  <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ fontSize: 48 }}>📷</div>
                )}
              </div>
              {/* Caption */}
              {captions[i] && (
                <div style={{
                  fontSize: 14, fontFamily: "'Comic Sans MS', cursive, Arial, sans-serif",
                  color: "#333", textAlign: "center", marginTop: 8, lineHeight: 1.3,
                }}>
                  {captions[i]}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
