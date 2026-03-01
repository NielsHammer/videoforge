import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const AnimatedBackground = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  return (
    <AbsoluteFill>
      {/* Base dark gradient */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at 50% 50%, #0f1129 0%, #070710 70%, #030306 100%)',
      }} />

      {/* Animated grid */}
      <svg
        width="1920"
        height="1080"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.12 }}
      >
        {/* Horizontal grid lines */}
        {Array.from({ length: 20 }).map((_, i) => {
          const y = (i * 60) + (time * 8) % 60;
          return (
            <line
              key={`h${i}`}
              x1="0"
              y1={y}
              x2="1920"
              y2={y}
              stroke="#4a9eff"
              strokeWidth="0.5"
              opacity={0.3 + Math.sin(time + i * 0.5) * 0.2}
            />
          );
        })}
        
        {/* Vertical grid lines */}
        {Array.from({ length: 35 }).map((_, i) => {
          const x = (i * 60) + (time * 5) % 60;
          return (
            <line
              key={`v${i}`}
              x1={x}
              y1="0"
              x2={x}
              y2="1080"
              stroke="#4a9eff"
              strokeWidth="0.5"
              opacity={0.3 + Math.cos(time + i * 0.3) * 0.2}
            />
          );
        })}

        {/* Grid intersection glow dots */}
        {Array.from({ length: 12 }).map((_, i) => {
          const x = 160 + (i % 4) * 480 + Math.sin(time * 0.5 + i) * 30;
          const y = 180 + Math.floor(i / 4) * 360 + Math.cos(time * 0.3 + i) * 20;
          const pulse = 0.3 + Math.sin(time * 2 + i * 1.2) * 0.3;
          return (
            <circle
              key={`dot${i}`}
              cx={x}
              cy={y}
              r={2 + pulse * 2}
              fill="#4a9eff"
              opacity={pulse}
            />
          );
        })}
      </svg>

      {/* Floating particles */}
      <svg
        width="1920"
        height="1080"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {Array.from({ length: 25 }).map((_, i) => {
          const seed = i * 137.508; // Golden angle
          const x = ((seed * 7.3) % 1920);
          const baseY = ((seed * 3.1) % 1080);
          const y = (baseY - time * (15 + i * 2)) % 1080;
          const adjustedY = y < 0 ? y + 1080 : y;
          const size = 1 + (i % 3);
          const opacity = 0.1 + Math.sin(time + i) * 0.08;
          
          return (
            <circle
              key={`p${i}`}
              cx={x + Math.sin(time * 0.5 + i) * 20}
              cy={adjustedY}
              r={size}
              fill="#4a9eff"
              opacity={opacity}
            />
          );
        })}
      </svg>

      {/* Subtle vignette overlay */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)',
      }} />

      {/* Top and bottom subtle accent lines */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent, #4a9eff33, transparent)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent, #4a9eff33, transparent)',
      }} />
    </AbsoluteFill>
  );
};
