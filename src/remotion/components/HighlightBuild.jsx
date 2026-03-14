import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { getTheme } from "../../themes.js";

// HighlightBuild: Words appear one by one, each gets a colored highlighter swipe behind it
// Works great for: key phrases, lists of benefits, important takeaways
// data: { lines: ["word or phrase", ...], delay: 0.3 }
export const HighlightBuild = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  if (!data || !data.lines) return null;
  const lines = data.lines.slice(0, 6);
  const delayPerLine = (data.delay || 0.4) * fps;

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "0 120px", gap: 18,
    }}>
      {lines.map((line, i) => {
        const lineStart = i * delayPerLine;
        const textOp = interpolate(clipFrame, [lineStart, lineStart + fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const highlightW = interpolate(clipFrame, [lineStart + fps * 0.1, lineStart + fps * 0.45], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div key={i} style={{ position: "relative", display: "inline-block", opacity: textOp }}>
            {/* Highlight bar sweeping in */}
            <div style={{
              position: "absolute", left: -8, top: "15%", height: "70%",
              width: `${highlightW}%`, backgroundColor: `${accent}55`,
              borderRadius: 4, transition: "none",
            }} />
            <div style={{
              fontSize: 52, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif",
              color: "white", letterSpacing: 2, textTransform: "uppercase",
              position: "relative", zIndex: 1, padding: "0 8px",
              textShadow: `2px 2px 0 rgba(0,0,0,0.5)`,
            }}>
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};
