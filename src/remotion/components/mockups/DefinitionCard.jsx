import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * DefinitionCard — dictionary-style word definition with phonetic,
 * part of speech, and meaning. Elegant serif typography.
 * data: { word: "Overtourism", phonetic: "/ˌoʊvərˈtʊrɪzəm/", pos: "noun", definition: "the main definition text", example: "optional example sentence in italics" }
 */
export const DefinitionCard = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const word = data.word || "";
  const phonetic = data.phonetic || "";
  const pos = data.pos || "noun";
  const definition = data.definition || "";
  const example = data.example || "";

  const cardScale = springIn(clipFrame, fps, 0.1);
  const wordOp = interpolate(clipFrame, [fps * 0.2, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const defOp = interpolate(clipFrame, [fps * 0.5, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exOp = interpolate(clipFrame, [fps * 0.9, fps * 1.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(clipFrame, [fps * 0.3, fps * 0.8], [0, 600], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${cardScale})` }}>
        <div style={{ width: 1100, padding: "70px 80px", background: "rgba(255,255,255,0.03)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
          {/* Word */}
          <div style={{ opacity: wordOp }}>
            <div style={{ fontSize: 72, fontWeight: 300, color: "#fff", fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: -1 }}>
              {word}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              {phonetic && <span style={{ fontSize: 24, color: "rgba(255,255,255,0.4)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>{phonetic}</span>}
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif", fontStyle: "italic", letterSpacing: 1 }}>{pos}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: lineW, height: 1, background: "rgba(255,255,255,0.12)", margin: "28px 0" }} />

          {/* Definition */}
          <div style={{ opacity: defOp }}>
            <div style={{ fontSize: 34, fontWeight: 400, color: "rgba(255,255,255,0.85)", fontFamily: "Georgia, serif", lineHeight: 1.5 }}>
              {definition}
            </div>
          </div>

          {/* Example */}
          {example && (
            <div style={{ opacity: exOp, marginTop: 28 }}>
              <div style={{ fontSize: 26, color: "rgba(255,255,255,0.45)", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.5, paddingLeft: 20, borderLeft: "3px solid rgba(255,255,255,0.15)" }}>
                "{example}"
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedBg>
  );
};
