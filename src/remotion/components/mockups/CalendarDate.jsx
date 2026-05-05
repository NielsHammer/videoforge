import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * CalendarDate — a specific date presented as a calendar page that flips in.
 * data: { month: "March", day: "15", year: "2024", event: "the event name", context: "optional subtext" }
 */
export const CalendarDate = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const month = data.month || "";
  const day = data.day || "";
  const year = data.year || "";
  const event = data.event || "";
  const context = data.context || "";

  const cardScale = springIn(clipFrame, fps, 0.15);
  const dayOp = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eventOp = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = breathe(clipFrame, fps, 0.6);

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${cardScale})` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          {/* Calendar card */}
          <div style={{
            width: 400, borderRadius: 24, overflow: "hidden",
            boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 ${40 + glow * 20}px rgba(74,158,255,0.15)`,
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            {/* Month header */}
            <div style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              padding: "18px 0",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>
                {month} {year}
              </div>
            </div>
            {/* Day */}
            <div style={{
              background: "rgba(255,255,255,0.95)",
              padding: "30px 0 36px",
              textAlign: "center",
              opacity: dayOp,
            }}>
              <div style={{ fontSize: 120, fontWeight: 800, color: "#1a1a2e", fontFamily: "Inter, sans-serif", lineHeight: 1 }}>
                {day}
              </div>
            </div>
          </div>

          {/* Event name */}
          {event && (
            <div style={{ opacity: eventOp, textAlign: "center", maxWidth: 800 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", lineHeight: 1.3 }}>
                {event}
              </div>
              {context && (
                <div style={{ fontSize: 22, color: "rgba(255,255,255,0.45)", fontFamily: "Inter, sans-serif", marginTop: 12 }}>
                  {context}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AnimatedBg>
  );
};
