import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { headline: "EMPEROR ASSASSINATED", subhead: "The Roman Republic in Crisis", date: "March 15, 44 BC" }
export const NewspaperFlash = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.headline) return null;

  const headline = (data.headline || "").toUpperCase();
  const subhead = data.subhead || "";
  const date = data.date || "";

  // Spin in: rotate from 720 degrees and zoom from 0 to 1
  const rotation = interpolate(clipFrame, [0, fps * 0.5], [720, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const scale = interpolate(clipFrame, [0, fps * 0.5], [0.1, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.1)) });
  const op = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });

  const headlineFontSize = headline.length > 30 ? 26 : headline.length > 20 ? 32 : 40;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 60px" }}>
      <div style={{ transform: `rotate(${rotation}deg) scale(${scale})`, opacity: op, width: "100%", maxWidth: 640 }}>
        {/* Newspaper */}
        <div style={{ background: "#f0ead6", borderRadius: 4, padding: "24px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.7), -2px -2px 0 rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.15)" }}>
          {/* Newspaper nameplate */}
          <div style={{ textAlign: "center", borderBottom: "3px double rgba(0,0,0,0.4)", paddingBottom: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.4)", fontFamily: "Georgia, serif", letterSpacing: 6, textTransform: "uppercase" }}>THE DAILY CHRONICLE</div>
            {date && <div style={{ fontSize: 9, color: "rgba(0,0,0,0.4)", fontFamily: "Arial, sans-serif", marginTop: 2 }}>{date}</div>}
          </div>
          {/* Main headline */}
          <div style={{ fontSize: headlineFontSize, fontWeight: 900, fontFamily: "Georgia, serif", color: "#1a1a1a", textTransform: "uppercase", textAlign: "center", lineHeight: 1.15, letterSpacing: 1 }}>
            {headline}
          </div>
          {subhead && (
            <div style={{ fontSize: 14, fontWeight: 500, fontFamily: "Georgia, serif", color: "rgba(0,0,0,0.5)", textAlign: "center", marginTop: 10, fontStyle: "italic", borderTop: "1px solid rgba(0,0,0,0.15)", paddingTop: 10 }}>
              {subhead}
            </div>
          )}
          {/* Fake text lines */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 3 }}>
            {[1, 0.8, 0.95, 0.7].map((w, i) => (
              <div key={i} style={{ height: 6, background: `rgba(0,0,0,${0.12 * w})`, borderRadius: 2, width: `${w * 100}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// MissingPoster — Missing person / wanted poster style card
// CENTERED. Aged poster aesthetic with dramatic typography.
// data: { status: "MISSING"|"WANTED", name: "JULIUS CAESAR", description: "Last seen March 15th", reward: "1,000 Gold Denarii" }
