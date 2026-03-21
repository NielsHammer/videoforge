import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { title: "IMPERIAL DECREE", content: "By order of Emperor Theodosius...", seal: "SPQR" }
export const DocumentReveal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.content) return null;

  const title = (data.title || "OFFICIAL DOCUMENT").toUpperCase();
  const content = data.content;
  const seal = data.seal || "✦";

  const unfold = interpolate(clipFrame, [0, fps * 0.7], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const contentOp = interpolate(clipFrame, [fps * 0.5, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sealOp = interpolate(clipFrame, [fps * 0.2, fps * 0.5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const parchment = "#d4b483";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ width: "100%", maxWidth: 640, position: "relative" }}>
        {/* Wax seal (appears then breaks) */}
        <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", zIndex: 10, opacity: sealOp }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #ef4444, #991b1b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.9)" }}>{seal}</span>
          </div>
        </div>

        {/* Document */}
        <div style={{ background: `linear-gradient(135deg, ${parchment}ee, ${parchment}dd)`, borderRadius: 8, border: "2px solid rgba(139,100,50,0.5)", padding: "32px 36px", transform: `scaleY(${unfold})`, transformOrigin: "center top", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", overflow: "hidden" }}>
          <div style={{ opacity: contentOp }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(42,26,10,0.6)", letterSpacing: 5, textTransform: "uppercase", textAlign: "center", fontFamily: "Arial, sans-serif", marginBottom: 16, borderBottom: "1px solid rgba(42,26,10,0.2)", paddingBottom: 12 }}>
              {title}
            </div>
            <div style={{ fontSize: 17, fontWeight: 400, color: "#2a1a0a", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.7, textAlign: "center" }}>
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// QuoteParchment — Historical quote styled on aged parchment. Elegant and period-accurate.
// CENTERED. For real historical quotes from real people.
// data: { quote: "Alea iacta est", translation: "The die is cast", attribution: "Julius Caesar — 49 BC" }
