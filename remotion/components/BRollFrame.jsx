import React from 'react';
import { AbsoluteFill, Video, useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from 'remotion';

export const BRollFrame = ({ videoSrc, opacity = 1, clipIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle scale animation on entry
  const scale = interpolate(frame, [0, fps * 0.3], [0.95, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Slow Ken Burns zoom
  const zoom = interpolate(frame, [0, fps * 8], [1, 1.06], {
    extrapolateRight: 'clamp',
  });

  // Alternate between different frame positions for visual variety
  const layouts = [
    // Centered large frame
    { top: 60, left: 120, width: 1680, height: 920, borderRadius: 20 },
    // Slightly right
    { top: 80, left: 200, width: 1600, height: 880, borderRadius: 16 },
    // Slightly left
    { top: 80, left: 120, width: 1600, height: 880, borderRadius: 16 },
    // Full width slim
    { top: 100, left: 80, width: 1760, height: 840, borderRadius: 24 },
  ];

  const layout = layouts[clipIndex % layouts.length];

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Frame container with shadow */}
      <div style={{
        position: 'absolute',
        top: layout.top,
        left: layout.left,
        width: layout.width,
        height: layout.height,
        borderRadius: layout.borderRadius,
        overflow: 'hidden',
        transform: `scale(${scale})`,
        boxShadow: '0 20px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(74, 158, 255, 0.1)',
        border: '1px solid rgba(74, 158, 255, 0.15)',
      }}>
        {/* Inner content with zoom */}
        <div style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}>
          {videoSrc && videoSrc.endsWith('.mp4') ? (
            <Video
              src={videoSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : videoSrc ? (
            <Img
              src={videoSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a3e, #0f0f29)',
            }} />
          )}
        </div>

        {/* Subtle gradient overlay on bottom for text readability */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
        }} />
      </div>

      {/* Accent glow behind frame */}
      <div style={{
        position: 'absolute',
        top: layout.top + layout.height / 2 - 100,
        left: layout.left + layout.width / 2 - 200,
        width: 400,
        height: 200,
        background: 'radial-gradient(ellipse, rgba(74, 158, 255, 0.08), transparent)',
        filter: 'blur(60px)',
        zIndex: -1,
      }} />
    </AbsoluteFill>
  );
};
