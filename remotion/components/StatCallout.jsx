import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export const StatCallout = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stat = data.stat || data.title || '87%';
  const label = data.label || data.subtitle || '';

  // Parse number for counting animation
  const numMatch = stat.match(/(\d+)/);
  const targetNum = numMatch ? parseInt(numMatch[1]) : 0;
  const prefix = stat.substring(0, stat.indexOf(numMatch ? numMatch[0] : ''));
  const suffix = stat.substring(stat.indexOf(numMatch ? numMatch[0] : '') + (numMatch ? numMatch[0].length : 0));

  // Count up animation
  const countProgress = interpolate(frame, [fps * 0.3, fps * 1.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const currentNum = Math.round(targetNum * countProgress);

  // Scale pop
  const scale = interpolate(frame, [fps * 0.2, fps * 0.5, fps * 0.7], [0.5, 1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(frame, [fps * 0.2, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelOpacity = interpolate(frame, [fps * 0.6, fps * 1.0], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const labelSlide = interpolate(frame, [fps * 0.6, fps * 1.0], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Glow pulse
  const glowPulse = 0.2 + Math.sin(frame / fps * 3) * 0.1;

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Circular glow behind stat */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(74, 158, 255, ${glowPulse}), transparent 60%)`,
        filter: 'blur(60px)',
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        transform: `scale(${scale})`,
        opacity,
      }}>
        {/* Big stat number */}
        <div style={{
          fontSize: 180,
          fontWeight: 900,
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          background: 'linear-gradient(180deg, #ffffff, #4a9eff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -3,
          textShadow: 'none',
        }}>
          {prefix}{currentNum}{suffix}
        </div>

        {/* Accent line */}
        <div style={{
          width: 120,
          height: 3,
          background: 'linear-gradient(90deg, transparent, #4a9eff, transparent)',
          borderRadius: 2,
        }} />

        {/* Label */}
        {label && (
          <div style={{
            fontSize: 42,
            fontWeight: 400,
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            color: '#aabbdd',
            opacity: labelOpacity,
            transform: `translateY(${labelSlide}px)`,
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.3,
          }}>
            {label}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
