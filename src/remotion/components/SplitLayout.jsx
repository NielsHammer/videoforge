import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing, Img } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * SplitLayout v32:
 * - Left side: Image in rounded-corner frame with drift/tilt/Ken Burns
 * - Right side: Animated content panel — keyword, stat, or topic display
 *   No more empty space. No subtitles. Just clean visual content.
 */
export const SplitLayout = ({ imageSrc, position = "left", clipFrame = 0, clipIndex = 0, theme = "blue_grid", clip = null }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";

  const imgOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(clipFrame, [0, fps * 0.2], [0.93, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const driftX = interpolate(Math.sin(clipFrame / (fps * 2.5)), [-1, 1], [-4, 4]);
  const driftY = interpolate(Math.cos(clipFrame / (fps * 3)), [-1, 1], [-3, 3]);
  const tilt = interpolate(Math.sin(clipFrame / (fps * 4)), [-1, 1], [-1, 1]);
  const zoom = interpolate(clipFrame, [0, fps * 8], [1, 1.05], { extrapolateRight: "clamp" });

  // Right panel animations
  const panelOp = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const panelY = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [20, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Subtle pulse on accent line
  const pulse = 0.6 + Math.sin(clipFrame / fps * 1.5) * 0.2;

  const isLeft = position === "left";

  // Extract content for right panel from clip data
  // Priority: panel_text from director (intentional) > filtered search query words (fallback)
  const panelText = clip?.panel_text || null;
  const SKIP_WORDS = new Set(["person","people","waiting","scene","cinematic","stock","image","photo","video","showing","looking","with","from","into","that","this","they","their","them","have","been","about","over","under","after","before","during","while","where","when","what","which","professional","background","frustrated","confident","determined","successful","entrepreneur"]);
  const searchQuery = clip?.search_query || "";
  const rawWords = searchQuery.replace(/[^a-zA-Z\s]/g, "").split(" ").filter(w => w.length > 3);
  const filteredWords = rawWords.filter(w => !SKIP_WORDS.has(w.toLowerCase())).slice(0, 2);
  // Use panel_text if provided, otherwise fall back to filtered words
  const keywords = panelText
    ? panelText.split(/[\s·\-]+/).filter(w => w.length > 0).slice(0, 3)
    : (filteredWords.length > 0 ? filteredWords : rawWords.slice(0, 2));

  // Pick a panel style based on clipIndex for variety
  const panelStyle = clipIndex % 3;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
      {/* Image side */}
      {imageSrc && (
        <div style={{
          position: "absolute",
          top: 50,
          bottom: 50,
          [isLeft ? "left" : "right"]: 40,
          width: "46%",
          borderRadius: 24,
          overflow: "hidden",
          opacity: imgOp,
          transform: `scale(${imgScale}) translate(${driftX}px, ${driftY}px) rotate(${tilt}deg)`,
          boxShadow: "0 12px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.50)",
          border: "2px solid rgba(255,255,255,0.3)",
        }}>
          <Img
            src={imageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${zoom})`,
            }}
          />
        </div>
      )}

      {/* Right/Left content panel — opposite side from image */}
      <div style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [isLeft ? "right" : "left"]: 0,
        width: "48%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        opacity: panelOp,
        transform: `translateY(${panelY}px)`,
      }}>
        {panelStyle === 0 && (
          /* Style A: Keyword stack with accent lines */
          <div style={{ textAlign: "center", width: "100%" }}>
            {/* Top accent */}
            <div style={{
              width: 50,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              margin: "0 auto 28px",
              borderRadius: 2,
              opacity: pulse,
            }} />

            {/* Keywords stacked */}
            {keywords.map((word, i) => (
              <div key={i} style={{
                fontSize: i === 0 ? 52 : i === 1 ? 42 : 34,
                fontWeight: 900,
                fontFamily: "Arial Black, Arial, sans-serif",
                color: i === 0 ? "#ffffff" : `rgba(255,255,255,${0.6 - i * 0.15})`,
                textTransform: "uppercase",
                letterSpacing: 2,
                lineHeight: 1.1,
                marginBottom: 8,
                textShadow: i === 0 ? `0 0 40px ${accent}60` : "none",
                opacity: interpolate(clipFrame, [fps * (0.1 + i * 0.08), fps * (0.3 + i * 0.08)], [0, 1], {
                  extrapolateLeft: "clamp", extrapolateRight: "clamp",
                }),
                transform: `translateY(${interpolate(clipFrame, [fps * (0.1 + i * 0.08), fps * (0.3 + i * 0.08)], [15, 0], {
                  extrapolateLeft: "clamp", extrapolateRight: "clamp",
                })}px)`,
              }}>
                {word.toUpperCase()}
              </div>
            ))}

            {/* Bottom accent */}
            <div style={{
              width: 50,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              margin: "24px auto 0",
              borderRadius: 2,
              opacity: pulse,
            }} />
          </div>
        )}

        {panelStyle === 1 && (
          /* Style B: Bold number/stat card */
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${accent}30`,
            borderRadius: 20,
            padding: "32px 28px",
            textAlign: "center",
            width: "100%",
            boxShadow: `0 0 40px ${accent}10, inset 0 0 30px rgba(0,0,0,0.2)`,
          }}>
            {/* Glowing dot */}
            <div style={{
              width: 10, height: 10,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 12px ${accent}`,
              margin: "0 auto 20px",
              opacity: pulse,
            }} />

            {/* Main keyword large */}
            <div style={{
              fontSize: 48,
              fontWeight: 900,
              fontFamily: "Arial Black, Arial, sans-serif",
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 1,
              lineHeight: 1.1,
              textShadow: `0 0 30px ${accent}50`,
              marginBottom: 12,
            }}>
              {keywords[0]?.toUpperCase() || ""}
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
              margin: "12px 0",
            }} />

            {/* Supporting keywords */}
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: `${accent}`,
              fontFamily: "Arial, sans-serif",
              letterSpacing: 3,
              textTransform: "uppercase",
              opacity: 0.8,
            }}>
              {keywords.slice(1).join("  ·  ").toUpperCase()}
            </div>
          </div>
        )}

        {panelStyle === 2 && (
          /* Style C: Animated highlight bars */
          <div style={{ width: "100%", textAlign: "left" }}>
            {keywords.map((word, i) => {
              const barWidth = interpolate(
                clipFrame,
                [fps * (0.15 + i * 0.1), fps * (0.45 + i * 0.1)],
                [0, 100],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
              );
              const wordOp = interpolate(
                clipFrame,
                [fps * (0.12 + i * 0.1), fps * (0.3 + i * 0.1)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return (
                <div key={i} style={{ marginBottom: 20, opacity: wordOp }}>
                  <div style={{
                    fontSize: i === 0 ? 44 : i === 1 ? 36 : 30,
                    fontWeight: 900,
                    fontFamily: "Arial Black, Arial, sans-serif",
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 6,
                    textShadow: i === 0 ? `0 0 20px ${accent}40` : "none",
                  }}>
                    {word.toUpperCase()}
                  </div>
                  <div style={{
                    height: i === 0 ? 4 : 2,
                    width: `${barWidth}%`,
                    background: i === 0
                      ? `linear-gradient(90deg, ${accent}, ${accent}40)`
                      : `linear-gradient(90deg, rgba(255,255,255,0.3), transparent)`,
                    borderRadius: 2,
                  }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
