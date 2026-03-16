import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const CountdownTimer = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const from = data.from || 10;
  const label = data.label || "years until retirement";
  const subtitle = data.subtitle || "if you start today";
  const urgent = data.urgent || false;
  const urgentColor = urgent ? "#ef4444" : accent;

  // Animate the number counting down visually across clip duration
  // Show the 'from' value, rings animating
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  // Ring fills based on clip progress
  const progress = interpolate(clipFrame, [0, fps * 1.5], [0, 1], {
    extrapolateRight: "clamp", easing: Easing.linear,
  });

  const numberScale = interpolate(clipFrame, [0, fps * 0.3, fps * 0.4], [0.5, 1.08, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const textOp = interpolate(clipFrame, [fps * 0.35, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Pulse urgency
  const pulse = urgent
    ? 0.8 + Math.sin(clipFrame / fps * 3) * 0.2
    : 1;

  // SVG circle ring
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity,
    }}>
      {/* Ring + number */}
      <div style={{ position: "relative", width: 340, height: 340 }}>
        <svg width="340" height="340" style={{ position: "absolute", inset: 0 }}>
          {/* Track */}
          <circle cx="170" cy="170" r={radius}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
          {/* Progress ring */}
          <circle cx="170" cy="170" r={radius}
            fill="none"
            stroke={urgentColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 170 170)"
            style={{ filter: `drop-shadow(0 0 12px ${urgentColor}88)` }}
          />
        </svg>

        {/* Number in center */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${numberScale * pulse})`,
        }}>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 900,
            fontSize: 110, color: urgentColor,
            textShadow: `0 0 50px ${urgentColor}66`,
            lineHeight: 1,
          }}>{from}</span>
        </div>
      </div>

      {/* Label */}
      <div style={{
        opacity: textOp, marginTop: 32, textAlign: "center",
      }}>
        <div style={{
          fontFamily: "sans-serif", fontWeight: 700,
          fontSize: 28, color: "#ffffff",
          textTransform: "uppercase", letterSpacing: 2,
        }}>{label}</div>
        {subtitle && (
          <div style={{
            fontFamily: "sans-serif", fontWeight: 400,
            fontSize: 20, color: "rgba(255,255,255,0.55)",
            fontStyle: "italic", marginTop: 8,
          }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
};
