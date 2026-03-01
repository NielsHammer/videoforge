import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export const Comparison = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = data.left || 'Option A';
  const right = data.right || 'Option B';
  const leftItems = data.left_items || [];
  const rightItems = data.right_items || [];

  const leftSlide = interpolate(frame, [fps * 0.2, fps * 0.6], [-200, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const rightSlide = interpolate(frame, [fps * 0.2, fps * 0.6], [200, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const contentOpacity = interpolate(frame, [fps * 0.2, fps * 0.6], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const vsScale = interpolate(frame, [fps * 0.4, fps * 0.7, fps * 0.85], [0, 1.3, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const vsOpacity = interpolate(frame, [fps * 0.4, fps * 0.7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
        {/* Left side */}
        <div style={{
          width: 700, padding: 50, borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(37, 99, 235, 0.05))',
          border: '1px solid rgba(74, 158, 255, 0.2)',
          transform: `translateX(${leftSlide}px)`, opacity: contentOpacity,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            fontSize: 48, fontWeight: 700, color: '#4a9eff',
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          }}>{left}</div>
          {leftItems.map((item, i) => (
            <div key={i} style={{
              fontSize: 28, color: '#aabbdd',
              fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            }}>{item}</div>
          ))}
        </div>

        {/* VS */}
        <div style={{
          fontSize: 64, fontWeight: 900, color: '#4a9eff',
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          transform: `scale(${vsScale})`, opacity: vsOpacity,
          textShadow: '0 0 40px rgba(74, 158, 255, 0.5)',
        }}>VS</div>

        {/* Right side */}
        <div style={{
          width: 700, padding: 50, borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          transform: `translateX(${rightSlide}px)`, opacity: contentOpacity,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            fontSize: 48, fontWeight: 700, color: '#ef4444',
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          }}>{right}</div>
          {rightItems.map((item, i) => (
            <div key={i} style={{
              fontSize: 28, color: '#ddaabb',
              fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            }}>{item}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
