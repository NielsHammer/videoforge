import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { lines: ["The suspect was a", "senior government official"], revealed: [1] (which lines reveal) }
export const RedactedReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.lines?.length) return null;

  const lines = data.lines.slice(0, 4);
  const revealed = new Set(data.revealed || [lines.length - 1]);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 16 }}>
      {lines.map((line, i) => {
        const isRevealed = revealed.has(i);
        const revealDelay = fps * (0.5 + i * 0.4);
        const barW = isRevealed
          ? interpolate(clipFrame, [revealDelay, revealDelay + fps * 0.5], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 100;
        const textOp = isRevealed
          ? interpolate(clipFrame, [revealDelay + fps * 0.3, revealDelay + fps * 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 1;

        const lineOp = interpolate(clipFrame, [fps * (i * 0.2), fps * (i * 0.2 + 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div key={i} style={{ position: "relative", width: "100%", opacity: lineOp }}>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "Arial, sans-serif", color: "white", textAlign: "center", opacity: textOp, lineHeight: 1.3 }}>
              {line}
            </div>
            {/* Redaction bar */}
            {barW > 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: `${barW}%`, height: "100%", background: isRevealed ? `${accent}` : "rgba(0,0,0,0.9)", borderRadius: 2, maxHeight: 48 }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// CrimeTimeline — Dark timeline with red dots. Events click into place.
// VERTICAL LIST on left side with time markers. Max 5 events.
// data: { events: [{time: "10:15 PM", event: "Last seen leaving apartment"}, ...] }
