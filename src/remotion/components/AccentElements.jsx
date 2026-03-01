import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const AccentElements = ({ sceneIndex, totalScenes }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const accentOp = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const bracketOff = interpolate(frame, [0, fps * 0.4], [10, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ opacity: accentOp * 0.5, pointerEvents: "none" }}>
      {/* Corner brackets - subtle */}
      {[
        { top: 14, left: 14, path: "M 0 20 L 0 0 L 20 0", tx: -bracketOff, ty: -bracketOff },
        { top: 14, right: 14, path: "M 12 0 L 32 0 L 32 20", tx: bracketOff, ty: -bracketOff },
        { bottom: 14, left: 14, path: "M 0 12 L 0 32 L 20 32", tx: -bracketOff, ty: bracketOff },
        { bottom: 14, right: 14, path: "M 12 32 L 32 32 L 32 12", tx: bracketOff, ty: bracketOff },
      ].map((b, i) => (
        <svg key={i} width="32" height="32" style={{
          position: "absolute", ...Object.fromEntries(Object.entries(b).filter(([k]) => ["top","bottom","left","right"].includes(k))),
          opacity: 0.4, transform: `translate(${b.tx}px, ${b.ty}px)`,
        }}>
          <path d={b.path} stroke="#4a9eff" strokeWidth="1.5" fill="none" />
        </svg>
      ))}

      {/* Scene counter - top right */}
      <div style={{ position: "absolute", top: 20, right: 55, display: "flex", alignItems: "center", gap: 6, opacity: 0.25 }}>
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4a9eff", opacity: 0.3 + Math.sin(t * 3) * 0.2 }} />
        <div style={{ fontSize: 10, fontWeight: 500, color: "#4a9eff", fontFamily: "Helvetica Neue, Arial, sans-serif", letterSpacing: 2 }}>
          {String(sceneIndex + 1).padStart(2, "0")}/{String(totalScenes).padStart(2, "0")}
        </div>
      </div>
    </AbsoluteFill>
  );
};
