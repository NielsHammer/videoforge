import React from "react";
import { AbsoluteFill, Img, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * CutoutScene v22: BIGGER images, themed decorative elements, no yellow orb.
 * Images now take up 75-85% of the frame instead of 65%.
 * 15 decoration variants per clip for variety.
 */
export const CutoutScene = ({ imageSrc, position = "right", clipFrame = 0, isCutout = false, clipIndex = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!imageSrc) return null;

  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#6c5ce7";
  const isRight = position === "right";

  // Entry animation — 4 types based on clipIndex
  const entryType = clipIndex % 4;
  let entry, slideX, imgOpacity;

  if (entryType === 0) {
    // Classic slide
    entry = interpolate(clipFrame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    slideX = interpolate(entry, [0, 1], [isRight ? 80 : -80, 0]);
    imgOpacity = interpolate(entry, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });
  } else if (entryType === 1) {
    // Scale up
    entry = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    slideX = 0;
    imgOpacity = interpolate(entry, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  } else if (entryType === 2) {
    // Slide from bottom
    entry = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    slideX = 0;
    imgOpacity = interpolate(entry, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  } else {
    // Fade drift
    entry = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
    slideX = interpolate(entry, [0, 1], [isRight ? 30 : -30, 0]);
    imgOpacity = entry;
  }

  const scaleEntry = entryType === 1 ? interpolate(entry, [0, 1], [0.85, 1]) : 1;
  const slideY = entryType === 2 ? interpolate(entry, [0, 1], [60, 0]) : 0;

  // Breathing + slow zoom
  const breathe = 1.0 + Math.sin(clipFrame / fps * 1.8) * 0.008;
  const slowZoom = 1.0 + (clipFrame / fps) * 0.005;
  const totalScale = slowZoom * breathe * scaleEntry;

  const filterStyle = isCutout ? "grayscale(0.55) contrast(1.1)" : "none";

  return (
    <AbsoluteFill>
      {/* Subtle gradient bg */}
      <div style={{
        position: "absolute", inset: 0,
        background: isRight
          ? "linear-gradient(135deg, rgba(10,15,40,0.3) 0%, transparent 50%)"
          : "linear-gradient(225deg, rgba(10,15,40,0.3) 0%, transparent 50%)",
      }} />

      {/* Themed decorative element (replaces yellow orb) */}
      <Decoration clipIndex={clipIndex} isRight={isRight} clipFrame={clipFrame} fps={fps} accent={accent} />

      {/* Person / Image — BIGGER: 80% max width */}
      <Img src={imageSrc} style={{
        position: "absolute",
        [isRight ? "right" : "left"]: 0,
        bottom: 0,
        height: "100%", width: "auto", maxWidth: "80%",
        objectFit: "contain",
        objectPosition: `${isRight ? "right" : "left"} bottom`,
        filter: filterStyle,
        transform: `translateX(${slideX}px) translateY(${slideY}px) scale(${totalScale})`,
        opacity: imgOpacity,
        zIndex: 5,
        imageOrientation: "from-image",
      }} />
    </AbsoluteFill>
  );
};

// 15 decoration variants
const Decoration = ({ clipIndex, isRight, clipFrame, fps, accent }) => {
  const variant = clipIndex % 15;
  const entry = interpolate(clipFrame, [fps * 0.08, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)),
  });
  const float = Math.sin(clipFrame / fps * 1.0) * 8;
  const pulse = 1.0 + Math.sin(clipFrame / fps * 2.5) * 0.04;
  const side = isRight ? "left" : "right";

  const base = {
    position: "absolute",
    [side]: "8%",
    top: "12%",
    opacity: entry * 0.7,
    transform: `scale(${entry * pulse}) translateY(${float}px)`,
    zIndex: 1,
    pointerEvents: "none",
  };

  switch (variant) {
    case 0: return <div style={{ ...base, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${accent}40, transparent 70%)`, filter: "blur(8px)" }} />;
    case 1: return <div style={{ ...base, width: 160, height: 160, borderRadius: "50%", border: `3px solid ${accent}40` }} />;
    case 2: return <><div style={{ ...base, width: 120, height: 3, borderRadius: 2, background: `${accent}30` }} /><div style={{ ...base, top: "16%", width: 80, height: 3, borderRadius: 2, background: `${accent}20` }} /></>;
    case 3: return <div style={{ ...base, width: 100, height: 100, transform: `${base.transform} rotate(45deg)`, border: `2px solid ${accent}30`, borderRadius: 8 }} />;
    case 4: {
      const dots = Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const r = 70;
        return <div key={i} style={{ position: "absolute", left: 90 + Math.cos(a) * r, top: 90 + Math.sin(a) * r, width: 6, height: 6, borderRadius: "50%", background: `${accent}35` }} />;
      });
      return <div style={{ ...base, width: 180, height: 180 }}>{dots}</div>;
    }
    case 5: return <><div style={{ ...base, width: 40, height: 40, borderLeft: `3px solid ${accent}40`, borderTop: `3px solid ${accent}40` }} /><div style={{ ...base, [side]: "14%", top: "18%", width: 40, height: 40, borderRight: `3px solid ${accent}40`, borderBottom: `3px solid ${accent}40` }} /></>;
    case 6: return <div style={{ ...base, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle, ${accent}25, transparent 60%)`, boxShadow: `0 0 40px ${accent}15` }} />;
    case 7: return <><div style={{ ...base, width: 20, height: 20, background: `${accent}30` }} /><div style={{ ...base, [side]: "12%", width: 20, height: 20, background: `${accent}20` }} /></>;
    case 8: {
      const circles = [0, 1, 2].map(i => <div key={i} style={{ position: "absolute", left: 60 - i * 5, top: 60 - i * 5, width: 40 + i * 30, height: 40 + i * 30, borderRadius: "50%", border: `1px solid ${accent}${15 + i * 8}` }} />);
      return <div style={{ ...base, width: 180, height: 180 }}>{circles}</div>;
    }
    case 9: {
      const hexPoints = "50,0 93,25 93,75 50,100 7,75 7,25";
      return <div style={base}><svg width="120" height="120" viewBox="0 0 100 100"><polygon points={hexPoints} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.3" /></svg></div>;
    }
    case 10: {
      const dashes = Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ width: 3, height: 15 + (i % 3) * 8, background: `${accent}${20 + i * 5}`, borderRadius: 2 }} />);
      return <div style={{ ...base, display: "flex", gap: 8, alignItems: "flex-end" }}>{dashes}</div>;
    }
    case 11: return <div style={{ ...base, width: 0, height: 0, borderLeft: "50px solid transparent", borderRight: "50px solid transparent", borderBottom: `90px solid ${accent}15` }} />;
    case 12: {
      const squares = [0, 1, 2].map(i => <div key={i} style={{ position: "absolute", left: i * 30, top: i * 25, width: 30, height: 30, border: `1.5px solid ${accent}${20 + i * 10}`, borderRadius: 4 }} />);
      return <div style={{ ...base, width: 120, height: 120 }}>{squares}</div>;
    }
    case 13: return <div style={{ ...base, width: 160, height: 80, borderRadius: "80px 80px 0 0", border: `2px solid ${accent}25`, borderBottom: "none" }} />;
    case 14: {
      const dots = Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ position: "absolute", left: 20 + (i * 17) % 100, top: 10 + (i * 23) % 80, width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3, borderRadius: "50%", background: `${accent}${20 + (i % 4) * 8}` }} />);
      return <div style={{ ...base, width: 140, height: 100 }}>{dots}</div>;
    }
    default: return null;
  }
};
