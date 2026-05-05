import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

/**
 * Shared building blocks for premium-feeling branded mockup components.
 *
 * Each helper is designed for continuous motion (not just one-shot fade-in)
 * so components feel alive throughout their entire screen time, not just at
 * scene entry.
 */

/**
 * <AnimatedBg> — a subtle gradient backdrop with slowly drifting radial glows.
 * Takes over the entire AbsoluteFill and becomes the parent of the content.
 * Props: tint1, tint2, tint3 — hex colors for the glow orbs.
 */
export const AnimatedBg = ({ tint1 = "#3b82f6", tint2 = "#9333ea", tint3 = "#06b6d4", baseColor = "#060a14", children, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // One very subtle orb — barely visible, just enough to not be pure black
  const orbX = 50 + Math.sin(t * 0.2) * 15;
  const orbY = 45 + Math.cos(t * 0.18) * 10;

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: baseColor,
      overflow: "hidden",
      ...style,
    }}>
      <div style={{
        position: "absolute",
        left: `${orbX}%`, top: `${orbY}%`,
        width: 1200, height: 1200,
        background: `radial-gradient(circle, ${tint1}0a 0%, transparent 50%)`,
        transform: "translate(-50%, -50%)",
        filter: "blur(80px)",
        pointerEvents: "none",
      }} />
      {/* Content */}
      <div style={{ position: "absolute", inset: 0 }}>
        {children}
      </div>
    </div>
  );
};

/**
 * <ParticleField> — subtle floating dots/stars for extra depth.
 * Use sparingly on top of AnimatedBg.
 */
export const ParticleField = ({ count = 40, color = "rgba(255,255,255,0.3)" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const particles = Array.from({ length: count }).map((_, i) => {
    const seed = i * 17.13;
    const baseX = (Math.sin(seed) * 50 + 50);
    const baseY = ((seed * 2.7) % 100);
    const driftX = baseX + Math.sin(t * 0.2 + seed) * 2;
    const driftY = (baseY + t * 1.5 + seed * 3) % 100;
    const size = 1 + ((seed * 1.3) % 3);
    const opacity = 0.3 + Math.sin(t * 0.5 + seed) * 0.3;
    return { x: driftX, y: driftY, size, opacity, key: i };
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {particles.map(p => (
        <div key={p.key} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: color,
          opacity: p.opacity,
        }} />
      ))}
    </div>
  );
};

/**
 * Premium card wrapper with gradient border, shadow, and breathing scale.
 * Wrap content in this for that "hovering in front of a gradient" feel.
 */
export const PremiumCard = ({ accent = "#3b82f6", children, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const breath = 1 + Math.sin(t * 0.8) * 0.002;
  const floatY = Math.sin(t * 0.5) * 2;

  return (
    <div style={{
      position: "relative",
      borderRadius: 20,
      background: "linear-gradient(180deg, #0e1424 0%, #0a0e1a 100%)",
      border: `1px solid ${accent}25`,
      padding: "38px 42px",
      boxShadow: `
        0 30px 80px rgba(0,0,0,0.7),
        0 10px 30px rgba(0,0,0,0.4),
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 0 60px ${accent}18
      `,
      transform: `scale(${breath}) translateY(${floatY}px)`,
      ...style,
    }}>
      {children}
    </div>
  );
};

/**
 * springIn — interpolate a value with spring-style ease for premium entrance.
 * Returns a value in [0, 1] that can be used for opacity, scale, translate.
 */
export const springIn = (frame, fps, delay = 0, duration = 0.6) => {
  return interpolate(
    frame,
    [fps * delay, fps * (delay + duration)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );
};

/**
 * breathe — continuous sine wave for pulsing/breathing effects.
 * Returns a value that oscillates between min and max over the given period (in seconds).
 */
export const breathe = (frame, fps, period = 2, min = 0, max = 1, phase = 0) => {
  const t = frame / fps;
  const sine = (Math.sin(t * (Math.PI * 2) / period + phase) + 1) / 2; // 0..1
  return min + sine * (max - min);
};

/**
 * Typed text effect — reveals text character by character.
 */
export const useTypedText = (text, frame, fps, startSec = 0, charsPerSec = 35) => {
  const elapsed = Math.max(0, frame / fps - startSec);
  const charsVisible = Math.floor(elapsed * charsPerSec);
  return (text || "").slice(0, charsVisible);
};
