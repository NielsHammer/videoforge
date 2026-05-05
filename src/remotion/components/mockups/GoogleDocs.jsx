import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn } from "./_shared.jsx";

export const GoogleDocs = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const docTitle = data.doc_title || "Untitled document";
  const heading = data.heading || "";
  const paragraphs = (data.paragraphs || []).slice(0, 3);
  const cursorBlink = Math.sin(clipFrame / fps * 6) > 0;

  return (
    <AnimatedBg tint1="#4285f4" tint2="#34a853" tint3="#fbbc04" baseColor="#05080f">
      <ParticleField count={25} color="rgba(66,133,244,0.2)" />

      <div style={{
        position: "absolute", inset: "54px 80px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard
          accent="#4285f4"
          style={{
            width: "100%", maxWidth: 960, padding: 0, overflow: "hidden",
            opacity: springIn(clipFrame, fps, 0, 0.5),
          }}
        >
          {/* Top bar */}
          <div style={{
            height: 58, padding: "0 22px",
            background: "linear-gradient(180deg, #ffffff, #f5f6f8)",
            borderBottom: "1px solid #e0e0e0",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{
              width: 36, height: 46, background: "#4285f4",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 11, fontWeight: 800,
              boxShadow: "0 4px 12px rgba(66,133,244,0.3)",
            }}>DOC</div>
            <div style={{ fontSize: 17, color: "#3c4043", fontWeight: 500 }}>{docTitle}</div>
            <div style={{
              marginLeft: "auto",
              padding: "9px 18px",
              background: "linear-gradient(135deg, #1a73e8, #1558c9)",
              color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 700,
              boxShadow: "0 3px 10px rgba(26,115,232,0.4)",
            }}>Share</div>
          </div>

          {/* Toolbar */}
          <div style={{
            height: 42, padding: "0 22px",
            background: "#f8f9fa",
            borderBottom: "1px solid #e8eaed",
            display: "flex", alignItems: "center", gap: 18,
            fontSize: 13, color: "#5f6368",
          }}>
            {["File", "Edit", "View", "Insert", "Format", "Tools"].map(x => <span key={x}>{x}</span>)}
          </div>

          {/* Document */}
          <div style={{
            padding: "50px 90px",
            background: "#fff",
            minHeight: 560,
          }}>
            {heading && (
              <div style={{
                fontSize: 34, fontWeight: 800, color: "#202124",
                marginBottom: 26, lineHeight: 1.2,
                opacity: springIn(clipFrame, fps, 0.2, 0.5),
              }}>{heading}</div>
            )}
            {paragraphs.map((p, i) => {
              const pStart = fps * (0.35 + i * 0.5);
              const pText = p || "";
              const charsVisible = Math.floor(
                interpolate(clipFrame, [pStart, pStart + fps * 1.4], [0, pText.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
              );
              return (
                <div key={i} style={{
                  fontSize: 16, color: "#202124", lineHeight: 1.85, marginBottom: 20,
                  fontFamily: "'Arial', sans-serif",
                }}>
                  {pText.slice(0, charsVisible)}
                  {charsVisible < pText.length && cursorBlink && (
                    <span style={{ display: "inline-block", width: 2, height: 19, background: "#1a73e8", marginLeft: 1, verticalAlign: "middle" }} />
                  )}
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
