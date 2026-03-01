import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export const TitleCard = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = data.title || '';
  const subtitle = data.subtitle || '';
  const number = data.number || '';

  // Animations
  const numberSlide = interpolate(frame, [0, fps * 0.4], [-100, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const numberOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleSlide = interpolate(frame, [fps * 0.15, fps * 0.55], [60, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const titleOpacity = interpolate(frame, [fps * 0.15, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtitleOpacity = interpolate(frame, [fps * 0.4, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lineWidth = interpolate(frame, [fps * 0.2, fps * 0.7], [0, 200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const glowPulse = interpolate(frame, [0, fps * 2], [0, Math.PI * 2]);
  const glowOpacity = 0.15 + Math.sin(glowPulse) * 0.05;

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(74, 158, 255, ${glowOpacity}), transparent 70%)`,
        filter: 'blur(80px)',
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        {/* Number */}
        {number && (
          <div style={{
            fontSize: 160,
            fontWeight: 900,
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            background: 'linear-gradient(180deg, #4a9eff, #2563eb)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            transform: `translateY(${numberSlide}px)`,
            opacity: numberOpacity,
            letterSpacing: -5,
          }}>
            {number}
          </div>
        )}

        {/* Accent line */}
        <div style={{
          width: lineWidth,
          height: 3,
          background: 'linear-gradient(90deg, transparent, #4a9eff, transparent)',
          borderRadius: 2,
        }} />

        {/* Title */}
        <div style={{
          fontSize: number ? 64 : 72,
          fontWeight: 700,
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          color: 'white',
          textAlign: 'center',
          transform: `translateY(${titleSlide}px)`,
          opacity: titleOpacity,
          maxWidth: 1400,
          lineHeight: 1.2,
          textShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}>
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div style={{
            fontSize: 32,
            fontWeight: 400,
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            color: '#8899bb',
            opacity: subtitleOpacity,
            textAlign: 'center',
            maxWidth: 1000,
          }}>
            {subtitle}
          </div>
        )}

        {/* Bottom accent line */}
        <div style={{
          width: lineWidth * 0.6,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #4a9eff66, transparent)',
          borderRadius: 2,
          marginTop: 10,
        }} />
      </div>
    </AbsoluteFill>
  );
};
