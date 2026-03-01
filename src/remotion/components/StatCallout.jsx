import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const StatCallout = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stat = data.stat || data.title || "87%";
  const label = data.label || data.subtitle || "";

  const numMatch = stat.match(/(\d+)/);
  const target = numMatch ? parseInt(numMatch[1]) : 0;
  const prefix = numMatch ? stat.substring(0, stat.indexOf(numMatch[0])) : "";
  const suffix = numMatch ? stat.substring(stat.indexOf(numMatch[0]) + numMatch[0].length) : "";

  const count = interpolate(frame, [fps * 0.3, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const current = Math.round(target * count);

  const scale = interpolate(frame, [fps * 0.2, fps * 0.5, fps * 0.65], [0.5, 1.06, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mainOp = interpolate(frame, [fps * 0.2, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(frame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(frame, [fps * 0.7, fps * 1.1], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const glow = 0.14 + Math.sin(frame / fps * 3) * 0.06;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, rgba(74,158,255,${glow}), transparent 55%)`, filter: "blur(50px)" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, transform: `scale(${scale})`, opacity: mainOp, zIndex: 1 }}>
        <div style={{
          fontSize: 180, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif",
          background: "linear-gradient(180deg, #ffffff, #4a9eff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: -2, textShadow: "none",
        }}>{prefix}{current}{suffix}</div>

        <div style={{ width: 120, height: 4, borderRadius: 2, background: "linear-gradient(90deg, transparent, #4a9eff, transparent)" }} />

        {label && (
          <div style={{
            fontSize: 40, fontWeight: 400, fontFamily: "Helvetica Neue, Arial, sans-serif",
            color: "#99aad0", opacity: labelOp, transform: `translateY(${labelY}px)`,
            textAlign: "center", maxWidth: 800, lineHeight: 1.3,
          }}>{label}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
