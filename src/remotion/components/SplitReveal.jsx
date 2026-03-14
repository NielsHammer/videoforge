import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img, staticFile } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * SplitReveal v2 — Dynamic split layout
 *
 * LEFT/RIGHT side: main image (large, framed, subtle drift + zoom)
 * PANEL side (other half): one of four modes, chosen automatically:
 *   1. "multi_image" — if clip.imagePaths has 2+ images: shows 2 smaller framed images
 *      appearing one at a time (top image at 0.3s, bottom image at 1.2s)
 *   2. "stat" — if clip.panel_stat exists: big number/value + label
 *   3. "icon" — if clip.panel_icon exists: large animated emoji + pulse ring
 *   4. "clean" — subtle accent line element (better than empty)
 */
export const SplitReveal = ({ imageSrc, position = "left", clipFrame = 0, clipIndex = 0, theme = "blue_grid", clip = null }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const isLeft = position === "left";

  // Main image animations
  const imgOp   = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(clipFrame, [0, fps * 0.2], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const driftX  = interpolate(Math.sin(clipFrame / (fps * 2.5)), [-1, 1], [-4, 4]);
  const driftY  = interpolate(Math.cos(clipFrame / (fps * 3)), [-1, 1], [-3, 3]);
  const zoom    = interpolate(clipFrame, [0, fps * 8], [1, 1.05], { extrapolateRight: "clamp" });

  // Panel slide-in
  const panelOp = interpolate(clipFrame, [fps * 0.15, fps * 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const panelX  = interpolate(clipFrame, [fps * 0.15, fps * 0.45], [isLeft ? -25 : 25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const pulse   = 0.6 + Math.sin(clipFrame / fps * 1.5) * 0.2;

  // Decide panel mode
  const allPaths = clip?.imagePaths || [];
  // Get secondary images (everything after the first one)
  const secondaryPaths = allPaths.length > 1 ? allPaths.slice(1) : [];

  // Helper to convert path to staticFile basename
  const toSrc = (p) => {
    if (!p) return null;
    const base = (p.includes("/") || p.includes("\\"))
      ? p.replace(/\\/g, "/").split("/").pop()
      : p;
    return base ? staticFile(base) : null;
  };

  const sec1Src = toSrc(secondaryPaths[0]);
  // Only show second panel image if there's actually a different third image
  const sec2Src = secondaryPaths.length >= 2 ? toSrc(secondaryPaths[1]) : null;

  const hasMultiImage = sec1Src !== null;
  const hasStat  = !!(clip?.panel_stat?.value);
  const hasIcon  = !!(clip?.panel_icon);

  const mode = hasMultiImage ? "multi_image" : hasStat ? "stat" : hasIcon ? "icon" : "clean";

  // Multi-image: second image slides in at 0.3s, third at 1.5s
  const img2Op = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const img2Y  = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const img3Op = interpolate(clipFrame, [fps * 1.5, fps * 1.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const img3Y  = interpolate(clipFrame, [fps * 1.5, fps * 1.8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>

      {/* ── MAIN IMAGE SIDE ── */}
      {imageSrc && (
        <div style={{
          position: "absolute",
          top: 40, bottom: 40,
          [isLeft ? "left" : "right"]: 32,
          width: "48%",
          borderRadius: 20,
          overflow: "hidden",
          opacity: imgOp,
          transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
          boxShadow: "0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
          border: "1.5px solid rgba(255,255,255,0.15)",
        }}>
          <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
        </div>
      )}

      {/* ── PANEL SIDE ── */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0,
        [isLeft ? "right" : "left"]: 0,
        width: "46%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        opacity: panelOp,
        transform: `translateX(${panelX}px)`,
        gap: 16,
      }}>

        {/* MODE 1: Two smaller images stacked, appearing timed to script */}
        {mode === "multi_image" && (
          <>
            {/* Top smaller image */}
            <div style={{
              width: "100%",
              height: "44%",
              borderRadius: 14,
              overflow: "hidden",
              opacity: img2Op,
              transform: `translateY(${img2Y}px)`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              flexShrink: 0,
            }}>
              <Img src={sec1Src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            {/* Accent divider */}
            <div style={{
              width: 40, height: 2,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              opacity: pulse * 0.7,
              flexShrink: 0,
            }} />

            {/* Bottom smaller image - only if different from top */}
            {sec2Src && (
            <div style={{
              width: "100%",
              height: "44%",
              borderRadius: 14,
              overflow: "hidden",
              opacity: img3Op,
              transform: `translateY(${img3Y}px)`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              flexShrink: 0,
            }}>
              <Img src={sec2Src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            )}
          </>
        )}

        {/* MODE 2: Stat card — big number + label */}
        {mode === "stat" && (
          <div style={{
            textAlign: "center",
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${accent}30`,
            borderRadius: 20,
            padding: "32px 24px",
            width: "100%",
          }}>
            <div style={{
              fontSize: clip.panel_stat.value.length > 6 ? 56 : 80,
              fontWeight: 900,
              fontFamily: "Arial Black, Arial, sans-serif",
              color: "#ffffff",
              lineHeight: 1,
              textShadow: `0 0 40px ${accent}70`,
              marginBottom: 12,
              opacity: interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `scale(${interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) })})`,
            }}>
              {clip.panel_stat.value}
            </div>
            <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`, margin: "0 0 12px" }} />
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              color: accent,
              textTransform: "uppercase",
              letterSpacing: 3,
              opacity: interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              {clip.panel_stat.label}
            </div>
          </div>
        )}

        {/* MODE 3: Icon — large animated emoji */}
        {mode === "icon" && (
          <div style={{ textAlign: "center", position: "relative" }}>
            <div style={{
              fontSize: 110,
              lineHeight: 1,
              filter: `drop-shadow(0 0 30px ${accent}70)`,
              transform: `scale(${interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) })}) translateY(${Math.sin(clipFrame / fps * 1.2) * 8}px)`,
              opacity: interpolate(clipFrame, [fps * 0.2, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}>
              {clip.panel_icon}
            </div>
            <div style={{
              width: 150, height: 150, borderRadius: "50%",
              border: `2px solid ${accent}${Math.round(pulse * 60).toString(16).padStart(2, "0")}`,
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }} />
          </div>
        )}

        {/* MODE 4: Clean — subtle accent decoration */}
        {mode === "clean" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: 0.35 }}>
            <div style={{ width: 2, height: 70, background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`, opacity: pulse }} />
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${accent}`, opacity: pulse * 0.6 }} />
            <div style={{ width: 2, height: 70, background: `linear-gradient(to bottom, ${accent}, transparent)`, opacity: pulse * 0.4 }} />
          </div>
        )}

      </div>
    </div>
  );
};
