import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * FramedScene — image-in-a-frame with rich variant styles.
 *
 * Variants (picked by the v2 planner via clip.frame_variant or by rotation):
 *   center, wide, tall, offset_left, offset_right    — classic rounded rectangles
 *   polaroid_tilted                                  — white polaroid frame, slight rotation
 *   circular                                         — circular crop with accent ring
 *   magazine                                         — full-bleed with corner accent bar
 *   vintage_film                                     — sepia film-strip with grain
 *   split_diagonal                                   — diagonal mask reveal
 *   hero_centered                                    — smaller centered image, heavy vignette
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

  // ───── VARIANT: POLAROID ─────
  if (variant === "polaroid_tilted") {
    const tilt = interpolate(clipFrame, [0, fps * 0.6], [-12, -4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 1100, background: "#fafaf7",
          padding: "32px 32px 80px",
          borderRadius: 6,
          boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.4)",
          transform: `rotate(${tilt}deg) scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
          opacity: imgOp,
        }}>
          <div style={{ width: "100%", aspectRatio: "16/10", overflow: "hidden", background: "#000" }}>
            {imageSrc && <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />}
          </div>
        </div>
      </div>
    );
  }

  // ───── VARIANT: CIRCULAR ─────
  if (variant === "circular") {
    const ringGlow = 20 + Math.sin(clipFrame / fps * 1.6) * 10;
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 1040, height: 1040, borderRadius: "50%",
          overflow: "hidden",
          opacity: imgOp,
          transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
          boxShadow: `0 0 ${ringGlow}px ${accent}88, 0 30px 80px rgba(0,0,0,0.6)`,
          border: `4px solid ${accent}`,
          background: "linear-gradient(135deg, #1a1f2e, #0a0e18)",
        }}>
          {imageSrc
            ? <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontSize: 120, opacity: 0.3 }}>◯</div>
          }
        </div>
      </div>
    );
  }

  // ───── VARIANT: MAGAZINE (full bleed + corner accent) ─────
  if (variant === "magazine") {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, opacity: imgOp }}>
          {imageSrc && <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom + 0.02})` }} />}
        </div>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }} />
        {/* Top-left accent bar */}
        <div style={{
          position: "absolute", top: 60, left: 60,
          width: interpolate(clipFrame, [fps * 0.2, fps * 0.8], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          height: 6, background: accent,
          boxShadow: `0 0 20px ${accent}`,
        }} />
        {/* Bottom-right accent bar */}
        <div style={{
          position: "absolute", bottom: 60, right: 60,
          width: interpolate(clipFrame, [fps * 0.4, fps * 1.0], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          height: 6, background: accent,
          boxShadow: `0 0 20px ${accent}`,
        }} />
      </div>
    );
  }

  // ───── VARIANT: VINTAGE FILM (sepia tone, grain, old photo vibe) ─────
  if (variant === "vintage_film") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 1280, aspectRatio: "16/10",
          background: "#2a1d10",
          padding: 18,
          borderRadius: 4,
          opacity: imgOp,
          transform: `scale(${imgScale})`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 0 4px #3a2818 inset",
          position: "relative",
        }}>
          <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: "#000" }}>
            {imageSrc && (
              <Img src={imageSrc} style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: "sepia(0.6) contrast(1.1) brightness(0.95)",
                transform: `scale(${zoom})`,
              }} />
            )}
            {/* Film grain overlay — simulated with subtle dotted gradient */}
            <div style={{
              position: "absolute", inset: 0,
              background: "repeating-radial-gradient(circle, rgba(255,240,200,0.02) 0, rgba(255,240,200,0.02) 1px, transparent 1px, transparent 3px)",
              pointerEvents: "none",
            }} />
            {/* Vignette */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
              pointerEvents: "none",
            }} />
          </div>
        </div>
      </div>
    );
  }

  // ───── VARIANT: SPLIT DIAGONAL ─────
  if (variant === "split_diagonal") {
    const maskProgress = interpolate(clipFrame, [0, fps * 0.8], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{
          position: "absolute", inset: 60,
          clipPath: `polygon(0 0, ${maskProgress}% 0, ${Math.max(0, maskProgress - 8)}% 100%, 0 100%)`,
          opacity: imgOp,
          transform: `scale(${imgScale})`,
          overflow: "hidden",
          borderRadius: 8,
          boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${accent}20`,
        }}>
          {imageSrc && <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />}
        </div>
        {/* Diagonal accent line */}
        <div style={{
          position: "absolute",
          top: 60, bottom: 60,
          left: `calc(${maskProgress}% - 4px)`,
          width: 4,
          background: accent,
          boxShadow: `0 0 16px ${accent}`,
          transform: "skewX(-5deg)",
        }} />
      </div>
    );
  }

  // ───── VARIANT: HERO CENTERED ─────
  if (variant === "hero_centered") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "#030512" }} />
        <div style={{
          width: 900, aspectRatio: "1/1",
          borderRadius: 16, overflow: "hidden",
          opacity: imgOp,
          transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
          boxShadow: `0 40px 100px rgba(0,0,0,0.9), 0 0 0 2px ${accent}, 0 0 100px ${accent}40`,
        }}>
          {imageSrc && <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />}
        </div>
        {/* Heavy vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }} />
      </div>
    );
  }

  // ───── DEFAULT: rectangular variants (center/wide/tall/offset_left/offset_right) ─────
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
      <div style={{
        position: "absolute",
        top: f.top, left: f.left, right: f.right, bottom: f.bottom,
        borderRadius: 20, overflow: "hidden",
        opacity: imgOp,
        transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px)`,
        boxShadow: `0 20px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px ${accent}10`,
        border: `1.5px solid rgba(255,255,255,0.12)`,
      }}>
        {imageSrc && <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />}
      </div>
      {/* Corner brackets — only on default variants, not fancy ones */}
      <div style={{ position: "absolute", top: f.top - 8, left: f.left - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
      <div style={{ position: "absolute", top: f.top - 8, right: f.right - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
      <div style={{ position: "absolute", bottom: f.bottom - 8, left: f.left - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
      <div style={{ position: "absolute", bottom: f.bottom - 8, right: f.right - 8, opacity: 0.7 }}>
        <div style={{ position: "absolute", bottom: 0, right: 0, width: cornerLen, height: 2, background: accent }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 2, height: cornerLen, background: accent }} />
      </div>
    </div>
  );
};
