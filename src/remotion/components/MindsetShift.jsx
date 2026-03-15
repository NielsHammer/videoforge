import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// MindsetShift — Shows a mental model shift, old thinking crossed out → new thinking
// data: { old: "Save what's left after spending", new: "Spend what's left after saving", label: "The Mindset Shift" }
// USE WHEN: narrator presents a reframe, paradigm shift, or contrasts wrong vs right thinking
export const MindsetShift = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.old || !data?.new) return null;

  const oldOp = interpolate(clipFrame, [0, fps * 0.35], [0, 1], { extrapolateRight: "clamp" });
  const strikeW = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrowOp = interpolate(clipFrame, [fps * 0.8, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const newOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const newY = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const labelOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px", gap: 20 }}>
      {data.label && (
        <div style={{ fontSize: 14, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: labelOp, marginBottom: 8 }}>
          {data.label}
        </div>
      )}

      {/* Old thinking */}
      <div style={{ width: "100%", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "22px 28px", position: "relative", overflow: "hidden", opacity: oldOp }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 8 }}>OLD THINKING</div>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{data.old}</div>
        {/* Strikethrough */}
        <div style={{ position: "absolute", top: "55%", left: "5%", width: `${strikeW * 90}%`, height: 3, background: "#ef4444", opacity: 0.7, borderRadius: 2 }} />
      </div>

      {/* Arrow */}
      <div style={{ fontSize: 32, color: accent, opacity: arrowOp }}>↓</div>

      {/* New thinking */}
      <div style={{ width: "100%", background: `${accent}08`, border: `1px solid ${accent}30`, borderRadius: 14, padding: "22px 28px", opacity: newOp, transform: `translateY(${newY}px)`, boxShadow: `0 0 40px ${accent}15` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 8 }}>NEW THINKING</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{data.new}</div>
      </div>
    </div>
  );
};
