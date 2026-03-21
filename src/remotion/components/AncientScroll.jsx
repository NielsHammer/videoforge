import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { text: "main content text", title: "THE EDICT OF MILAN", attribution: "Emperor Constantine — 313 AD" }
export const AncientScroll = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.text) return null;

  const text = data.text;
  const title = (data.title || "").toUpperCase();
  const attribution = data.attribution || "";

  // Scroll height animates from 0 to full
  const scrollH = interpolate(clipFrame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const contentOp = interpolate(clipFrame, [fps * 0.5, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(clipFrame, [fps * 0.6, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const parchment = "rgba(210,175,110,";
  const ink = "#2a1a0a";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ width: "100%", maxWidth: 700, overflow: "hidden", height: `${scrollH * 380}px`, position: "relative" }}>
        {/* Parchment background */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${parchment}0.92), ${parchment}0.85), ${parchment}0.90))`, borderRadius: 8, border: `2px solid rgba(139,100,50,0.6)`, boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(139,100,50,0.15)" }}>
          {/* Aged texture vignette */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 50%, rgba(100,60,20,0.2) 100%)", borderRadius: 8 }} />
          {/* Horizontal grain lines */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 20px)", borderRadius: 8 }} />
        </div>

        {/* Content */}
        <div style={{ position: "relative", padding: "32px 40px", opacity: contentOp }}>
          {title && (
            <div style={{ fontSize: 14, fontWeight: 800, color: ink, letterSpacing: 4, textTransform: "uppercase", textAlign: "center", marginBottom: 20, opacity: titleOp, fontFamily: "Georgia, serif", borderBottom: `1px solid rgba(42,26,10,0.3)`, paddingBottom: 12 }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 400, color: ink, fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.7, textAlign: "center" }}>
            {text}
          </div>
          {attribution && (
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(42,26,10,0.6)", fontFamily: "Georgia, serif", textAlign: "right", marginTop: 20, fontStyle: "normal" }}>
              — {attribution}
            </div>
          )}
        </div>

        {/* Scroll curl effect at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 20, background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.1))", borderRadius: "0 0 8px 8px" }} />
      </div>
    </div>
  );
};

// EmpireRiseFall — Territory/power bar fills then drains. Rise and fall visualized.
// HORIZONTAL BAR with animated fill. Works for any rise/decline narrative.
// data: { label: "Roman Empire", peak: "27 BC", fall: "476 AD", peakFrame: 0.5 (where peak is, 0-1) }
