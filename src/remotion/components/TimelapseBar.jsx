import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// TimelapseBar — A timeline bar showing progression through time
// data: { start: "Age 25", end: "Age 65", current: "Age 35", label: "Your Wealth Building Window", events: [{pos:0.1,label:"Start investing"},{pos:0.5,label:"Compound kicks in"},{pos:1.0,label:"Financial freedom"}] }
// USE WHEN: narrator describes a timeline, life stages, or a time window for action
export const TimelapseBar = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.start) return null;

  const events = (data.events || []).slice(0, 4);
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const barProgress = interpolate(clipFrame, [fps * 0.3, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const currentPos = data.currentPos ?? 0.25;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 80px", gap: 28 }}>
      {data.label && (
        <div style={{ fontSize: 20, fontWeight: 700, color: accent, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp }}>
          {data.label}
        </div>
      )}

      {/* Timeline */}
      <div style={{ position: "relative", padding: "40px 0" }}>
        {/* Base track */}
        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, position: "relative" }}>
          {/* Progress fill */}
          <div style={{ width: `${barProgress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${accent}, ${accent}aa)`, borderRadius: 3, boxShadow: `0 0 12px ${accent}60` }} />
          {/* Current position marker */}
          {data.current && (
            <div style={{ position: "absolute", left: `${currentPos * 100}%`, top: "50%", transform: "translate(-50%, -50%)", width: 16, height: 16, borderRadius: "50%", background: "#fff", border: `3px solid ${accent}`, boxShadow: `0 0 20px ${accent}`, zIndex: 2 }} />
          )}
          {/* Event dots */}
          {events.map((ev, i) => {
            const evOp = interpolate(clipFrame, [fps * (0.4 + i * 0.2), fps * (0.6 + i * 0.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ position: "absolute", left: `${ev.pos * 100}%`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 1, opacity: evOp }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}` }} />
                <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif", whiteSpace: "nowrap", textAlign: "center" }}>
                  {ev.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Start / end labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif" }}>{data.start}</div>
          {data.current && <div style={{ fontSize: 16, fontWeight: 800, color: accent, fontFamily: "Arial, sans-serif" }}>YOU ARE HERE → {data.current}</div>}
          <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "Arial, sans-serif" }}>{data.end}</div>
        </div>
      </div>
    </div>
  );
};
