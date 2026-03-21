import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { quote: "Alea iacta est", translation: "The die is cast", attribution: "Julius Caesar — 49 BC" }
export const QuoteParchment = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.quote) return null;

  const quote = data.quote;
  const translation = data.translation || "";
  const attribution = data.attribution || "";

  const op = interpolate(clipFrame, [0, fps * 0.6], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const transOp = interpolate(clipFrame, [fps * 0.7, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const attribOp = interpolate(clipFrame, [fps * 1.0, fps * 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.4, fps * 0.9], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const quoteFontSize = quote.length > 60 ? 24 : quote.length > 35 ? 32 : 44;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ background: "linear-gradient(135deg, rgba(210,175,110,0.12), rgba(210,175,110,0.06))", border: "1px solid rgba(210,175,110,0.25)", borderRadius: 12, padding: "40px 48px", opacity, width: "100%", maxWidth: 700 }}>
        {/* Latin/Original quote */}
        <div style={{ fontSize: quoteFontSize, fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.9)", textAlign: "center", lineHeight: 1.5, fontStyle: "italic", opacity: op, letterSpacing: 1 }}>
          "{quote}"
        </div>

        {/* Divider */}
        <div style={{ width: lineW, height: 1, background: "linear-gradient(90deg, transparent, rgba(210,175,110,0.5), transparent)", margin: "24px auto" }} />

        {/* Translation */}
        {translation && (
          <div style={{ fontSize: 20, fontFamily: "Georgia, serif", color: "rgba(255,255,255,0.55)", textAlign: "center", fontStyle: "italic", opacity: transOp, lineHeight: 1.5 }}>
            "{translation}"
          </div>
        )}

        {/* Attribution */}
        {attribution && (
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, color: "rgba(210,175,110,0.7)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", textAlign: "center", marginTop: 20, opacity: attribOp }}>
            — {attribution}
          </div>
        )}
      </div>
    </div>
  );
};
