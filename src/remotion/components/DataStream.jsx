import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { label: "PROCESSING", value: "1.8T PARAMETERS", sublabel: "neural network active" }
export const DataStream = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;

  const label = (data.label || "DATA STREAM").toUpperCase();
  const value = data.value || "";
  const sublabel = data.sublabel || "";

  // Generate "matrix" characters
  const chars = "01ABCDEFアイウエオカキクケコ数字文字";
  const columns = 20;
  const colData = Array.from({ length: columns }, (_, i) => ({
    x: (i / columns) * 100,
    speed: 0.8 + (i % 5) * 0.3,
    offset: (i * 37) % 100,
    char: chars[i % chars.length],
  }));

  const mainOp = interpolate(clipFrame, [fps * 0.5, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const valueOp = interpolate(clipFrame, [fps * 0.6, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Streaming columns */}
      {colData.map((col, i) => {
        const y = ((clipFrame * col.speed + col.offset * 6) % 120) - 10;
        const colOp = 0.08 + (i % 3) * 0.04;
        return (
          <div key={i} style={{ position: "absolute", left: `${col.x}%`, top: `${y}%`, color: accent, fontSize: 14, fontFamily: "monospace", opacity: colOp, whiteSpace: "nowrap", userSelect: "none" }}>
            {col.char}
          </div>
        );
      })}

      {/* Center content */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "rgba(0,0,0,0.8)", border: `1px solid ${accent}40`, borderRadius: 12, padding: "28px 48px", textAlign: "center", backdropFilter: "blur(10px)", opacity: mainOp }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 6, color: `${accent}80`, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 12 }}>
            {label}
          </div>
          {value && (
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: accent, opacity: valueOp, textShadow: `0 0 20px ${accent}80`, letterSpacing: 2 }}>
              {value}
            </div>
          )}
          {sublabel && (
            <div style={{ fontSize: 13, color: `${accent}60`, fontFamily: "monospace", marginTop: 8, opacity: valueOp }}>
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
