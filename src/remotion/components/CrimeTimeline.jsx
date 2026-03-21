import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { events: [{time: "10:15 PM", event: "Last seen leaving apartment"}, ...] }
export const CrimeTimeline = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.events?.length) return null;

  const events = data.events.slice(0, 5);
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 80px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 6, color: "rgba(255,255,255,0.3)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: titleOp, marginBottom: 28 }}>
        SEQUENCE OF EVENTS
      </div>

      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div style={{ position: "absolute", left: 95, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, rgba(220,38,38,0.6), rgba(220,38,38,0.1))" }} />

        {events.map((ev, i) => {
          const delay = fps * (0.2 + i * 0.3);
          const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(clipFrame, [delay, delay + fps * 0.3], [-20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 24, opacity: op, transform: `translateX(${x}px)` }}>
              {/* Time */}
              <div style={{ width: 80, fontSize: 13, fontWeight: 800, color: "#ef4444", fontFamily: "Arial, sans-serif", textAlign: "right", paddingTop: 2, flexShrink: 0, letterSpacing: 1 }}>
                {ev.time}
              </div>
              {/* Dot */}
              <div style={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0, paddingTop: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 12px rgba(220,38,38,0.8), 0 0 4px rgba(220,38,38,1)" }} />
              </div>
              {/* Event */}
              <div style={{ flex: 1, fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>
                {ev.event}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ClassifiedStamp — CLASSIFIED or DECLASSIFIED stamp slams onto a document background
// CENTERED with dramatic slam effect. True crime and conspiracy gold.
// data: { status: "CLASSIFIED"|"DECLASSIFIED"|"TOP SECRET"|"CASE CLOSED", subtext: "FBI File #..." }
