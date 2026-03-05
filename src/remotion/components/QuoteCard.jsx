import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * QuoteCard v24: Elegant quote display with accent bar and optional attribution.
 * Props via data:
 *   quote: "The best time to invest was yesterday."
 *   attribution: "Warren Buffett"
 *   style: "elegant" | "bold" | "minimal"
 */
export const QuoteCard = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.quote) return null;

  const quote = data.quote;
  const attribution = data.attribution || "";
  const style = data.style || "elegant";
  const color = data.color || "#4a9eff";

  const cardOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barH = interpolate(clipFrame, [fps * 0.15, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const textOp = interpolate(clipFrame, [fps * 0.25, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const attrOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (style === "bold") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 120px", opacity: cardOp }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 60, fontWeight: 900, fontStyle: "italic", fontFamily: "Georgia, serif",
            color: "white", lineHeight: 1.2, opacity: textOp,
            textShadow: `0 4px 30px rgba(0,0,0,0.5), 0 0 60px ${color}20`,
          }}>
            "{quote}"
          </div>
          {attribution && (
            <div style={{ fontSize: 26, fontWeight: 500, fontFamily: "Arial Black, Arial, sans-serif", color, marginTop: 30, opacity: attrOp, letterSpacing: 3, textTransform: "uppercase" }}>
              — {attribution}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (style === "minimal") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 200px", opacity: cardOp }}>
        <div>
          <div style={{ width: 50, height: 3, background: color, borderRadius: 2, marginBottom: 25, opacity: barH }} />
          <div style={{ fontSize: 42, fontWeight: 400, fontFamily: "Georgia, serif", color: "#ffffff", lineHeight: 1.5, opacity: textOp }}>
            {quote}
          </div>
          {attribution && (
            <div style={{ fontSize: 22, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffff", marginTop: 20, opacity: attrOp }}>
              {attribution}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: elegant (card with left accent bar)
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 140px", opacity: cardOp }}>
      <div style={{
        display: "flex", padding: "50px 60px", borderRadius: 20, overflow: "hidden",
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(0,0,0,0.50)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
      }}>
        {/* Accent bar */}
        <div style={{
          width: 5, borderRadius: 3, marginRight: 40, flexShrink: 0,
          background: `linear-gradient(180deg, ${color}, ${color}60)`,
          transform: `scaleY(${barH})`, transformOrigin: "top",
        }} />

        <div>
          {/* Big quote mark */}
          <div style={{ fontSize: 80, fontFamily: "Georgia, serif", color: `${color}40`, lineHeight: 0.5, marginBottom: 15 }}>"</div>

          <div style={{ fontSize: 38, fontWeight: 400, fontFamily: "Georgia, serif", color: "#ffffff", lineHeight: 1.5, opacity: textOp }}>
            {quote}
          </div>

          {attribution && (
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "Arial Black, Arial, sans-serif", color, marginTop: 25, opacity: attrOp, letterSpacing: 1 }}>
              — {attribution}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
