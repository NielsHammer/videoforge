import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { events: [{year: "753 BC", label: "Rome Founded"}, ...], highlight: 2 (index to glow) }
export const EraTimeline = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.events?.length) return null;

  const events = data.events.slice(0, 6);
  const highlight = data.highlight ?? events.length - 1;
  const lineW = interpolate(clipFrame, [fps * 0.2, fps * 1.0], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 60px" }}>
      {/* Timeline line */}
      <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center" }}>
        {/* Base line */}
        <div style={{ position: "absolute", top: "50%", left: 0, width: `${lineW}%`, height: 2, background: `linear-gradient(90deg, ${accent}60, ${accent})`, transform: "translateY(-50%)" }} />

        {/* Events */}
        {events.map((ev, i) => {
          const evDelay = fps * (0.3 + i * 0.2);
          const evOp = interpolate(clipFrame, [evDelay, evDelay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const evY = interpolate(clipFrame, [evDelay, evDelay + fps * 0.3], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const isHighlight = i === highlight;
          const leftPct = events.length === 1 ? 50 : (i / (events.length - 1)) * 100;

          return (
            <div key={i} style={{ position: "absolute", left: `${leftPct}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", opacity: evOp }}>
              {/* Year above line */}
              <div style={{ fontSize: isHighlight ? 13 : 11, fontWeight: 800, color: isHighlight ? accent : "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, transform: `translateY(${evY}px)`, whiteSpace: "nowrap" }}>
                {ev.year}
              </div>
              {/* Dot */}
              <div style={{ width: isHighlight ? 16 : 10, height: isHighlight ? 16 : 10, borderRadius: "50%", background: isHighlight ? accent : "rgba(255,255,255,0.3)", border: isHighlight ? `2px solid ${accent}` : "none", boxShadow: isHighlight ? `0 0 20px ${accent}, 0 0 40px ${accent}60` : "none" }} />
              {/* Label below line */}
              <div style={{ fontSize: isHighlight ? 13 : 11, fontWeight: isHighlight ? 700 : 500, color: isHighlight ? "white" : "rgba(255,255,255,0.4)", fontFamily: "Arial, sans-serif", marginTop: 8, transform: `translateY(${-evY}px)`, textAlign: "center", maxWidth: 80, lineHeight: 1.3 }}>
                {ev.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// AncientScroll — Parchment texture unrolls revealing text. Uniquely historical.
// CENTERED. The parchment unfurls from top, text appears inside.
// data: { text: "main content text", title: "THE EDICT OF MILAN", attribution: "Emperor Constantine — 313 AD" }
