import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export const QuoteCard = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quote = data.quote || data.title || '';
  const author = data.author || data.subtitle || '';

  const quoteOpacity = interpolate(frame, [fps * 0.2, fps * 0.7], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const quoteSlide = interpolate(frame, [fps * 0.2, fps * 0.7], [30, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const authorOpacity = interpolate(frame, [fps * 0.8, fps * 1.2], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const markScale = interpolate(frame, [0, fps * 0.5], [0.5, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const markOpacity = interpolate(frame, [0, fps * 0.4], [0, 0.3], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 150 }}>
      {/* Large quote mark */}
      <div style={{
        position: 'absolute', top: 200, left: 250,
        fontSize: 300, fontFamily: 'Georgia, serif', color: '#4a9eff',
        opacity: markOpacity, transform: `scale(${markScale})`, lineHeight: 1,
      }}>"</div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30,
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          fontSize: 48, fontWeight: 400, fontStyle: 'italic', color: 'white',
          fontFamily: 'Georgia, serif', textAlign: 'center', lineHeight: 1.5,
          maxWidth: 1200, opacity: quoteOpacity, transform: `translateY(${quoteSlide}px)`,
        }}>"{quote}"</div>

        {author && (
          <div style={{
            fontSize: 28, color: '#6688aa', fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            opacity: authorOpacity,
          }}>— {author}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
