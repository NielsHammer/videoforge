import React from 'react';
import { AbsoluteFill, interpolate, Easing } from 'remotion';

export const KeywordOverlay = ({ keywords, clipFrame, fps }) => {
  if (!keywords || keywords.length === 0) return null;

  const opacity = interpolate(clipFrame, [fps * 0.3, fps * 0.6, fps * 3, fps * 3.5], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slide = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div style={{
      position: 'absolute',
      bottom: 120,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 16,
      opacity,
      transform: `translateY(${slide}px)`,
    }}>
      {keywords.map((word, i) => (
        <div key={i} style={{
          padding: '10px 28px',
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(74, 158, 255, 0.3)',
          fontSize: 28,
          fontWeight: 600,
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          color: '#4a9eff',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          {word}
        </div>
      ))}
    </div>
  );
};
