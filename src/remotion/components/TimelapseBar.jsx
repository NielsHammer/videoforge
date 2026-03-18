import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const TimelapseBar = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const start = data.start || "Age 20";
  const end = data.end || "Age 65";
  const current = data.current || "Age 35";
  const label = data.label || "Your Window";
  const currentPos = data.currentPos || 0.33;
  const events = data.events || [];

  const fadeIn = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const barFill = interpolate(clipFrame, [fps * 0.3, fps * 1.2], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const markerOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const pulse = 0.8 + Math.sin(clipFrame / fps * 2) * 0.2;

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, opacity: fadeIn, padding: "50px 100px",
    }}>
      <div style={{
        fontFamily: "sans-serif", fontWeight: 800,
        fontSize: 24, color: accent,
        textTransform: "uppercase", letterSpacing: 4,
        marginBottom: 48,
      }}>{label}</div>

      {/* Bar container */}
      <div style={{ width: "100%", position: "relative" }}>
        {/* Start / end labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{start}</span>
          <span style={{ fontFamily: "sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{end}</span>
        </div>

        {/* Track */}
        <div style={{
          width: "100%", height: 24, background: "rgba(255,255,255,0.06)",
          borderRadius: 12, overflow: "hidden", position: "relative",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {/* Elapsed fill */}
          <div style={{
            width: `${(currentPos * 100 * barFill) / 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${accent}88, ${accent})`,
            borderRadius: 12,
            boxShadow: `0 0 16px ${accent}55`,
          }} />
        </div>

        {/* Current position marker */}
        <div style={{
          position: "absolute", top: 32,
          left: `${currentPos * 100}%`,
          transform: "translateX(-50%)",
          opacity: markerOp,
        }}>
          <div style={{
            width: 3, height: 36,
            background: "#ffffff",
            margin: "0 auto",
            boxShadow: `0 0 ${12 * pulse}px ${accent}`,
          }} />
          <div style={{
            fontFamily: "sans-serif", fontWeight: 800,
            fontSize: 16, color: "#ffffff",
            textAlign: "center", marginTop: 8,
            whiteSpace: "nowrap",
            textShadow: `0 0 20px ${accent}`,
          }}>📍 {current}</div>
        </div>

        {/* Events */}
        {events.map((e, i) => {
          const eOp = interpolate(clipFrame, [fps * (0.7 + i * 0.2), fps * (0.9 + i * 0.2)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{
              position: "absolute", top: -30,
              left: `${e.pos * 100}%`,
              transform: "translateX(-50%)",
              opacity: eOp, textAlign: "center",
            }}>
              <div style={{
                fontFamily: "sans-serif", fontSize: 12,
                color: accent, whiteSpace: "nowrap",
                background: `${accent}18`,
                padding: "3px 10px", borderRadius: 8,
                border: `1px solid ${accent}33`,
              }}>{e.label}</div>
              <div style={{ width: 1, height: 12, background: accent, margin: "2px auto" }} />
            </div>
          );
        })}
      </div>

      {/* Remaining label */}
      <div style={{
        marginTop: 60,
        opacity: markerOp,
        fontFamily: "sans-serif", fontWeight: 600,
        fontSize: 20, color: "rgba(255,255,255,0.6)",
        textAlign: "center",
      }}>
        <span style={{ color: accent, fontWeight: 900 }}>{Math.round((1 - currentPos) * 100)}%</span> of your window remaining
      </div>
    </div>
  );
};
