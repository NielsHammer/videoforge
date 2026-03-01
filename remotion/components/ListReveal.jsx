import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export const ListReveal = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = data.title || '';
  const items = data.items || ['Item 1', 'Item 2', 'Item 3'];

  const titleOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleSlide = interpolate(frame, [0, fps * 0.4], [-40, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{
      justifyContent: 'center',
      alignItems: 'center',
      padding: 100,
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 24,
        maxWidth: 1200,
        width: '100%',
      }}>
        {/* Title */}
        {title && (
          <div style={{
            fontSize: 52,
            fontWeight: 700,
            fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            color: 'white',
            opacity: titleOpacity,
            transform: `translateY(${titleSlide}px)`,
            marginBottom: 20,
            alignSelf: 'center',
          }}>
            {title}
          </div>
        )}

        {/* List items */}
        {items.map((item, i) => {
          const delay = fps * 0.3 + i * fps * 0.35;
          
          const itemOpacity = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          
          const itemSlide = interpolate(frame, [delay, delay + fps * 0.3], [40, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });

          const barWidth = interpolate(frame, [delay, delay + fps * 0.5], [0, 100], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                opacity: itemOpacity,
                transform: `translateX(${itemSlide}px)`,
                width: '100%',
              }}
            >
              {/* Number badge */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4a9eff, #2563eb)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 28,
                fontWeight: 800,
                fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 4px 20px rgba(74, 158, 255, 0.3)',
              }}>
                {i + 1}
              </div>

              {/* Item content */}
              <div style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: '18px 28px',
                border: '1px solid rgba(74, 158, 255, 0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Progress bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${barWidth}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(74, 158, 255, 0.08), transparent)',
                }} />

                <div style={{
                  fontSize: 36,
                  fontWeight: 500,
                  fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
                  color: '#e0e8f0',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  {item}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
