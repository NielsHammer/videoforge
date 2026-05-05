import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

export const NotionPage = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "Untitled";
  const emoji = data.emoji || "📝";
  const blocks = (data.blocks || []).slice(0, 10);

  return (
    <AnimatedBg tint1="#ffffff" tint2="#a0a0a0" tint3="#e5e5e5" baseColor="#0a0a0c">
      <ParticleField count={25} color="rgba(255,255,255,0.15)" />
      <div style={{ position: "absolute", inset: "60px 90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <PremiumCard accent="#ffffff" style={{ width: "100%", maxWidth: 900, padding: "60px 80px", background: "linear-gradient(180deg, #fafafa 0%, #f2f2f2 100%)" }}>
          <div style={{ fontSize: 68, marginBottom: 16, opacity: springIn(clipFrame, fps, 0, 0.4) }}>{emoji}</div>
          <div style={{
            fontSize: 44, fontWeight: 900, color: "#37352f", letterSpacing: "-1.2px",
            marginBottom: 30,
            opacity: springIn(clipFrame, fps, 0.1, 0.4),
          }}>{title}</div>
          {blocks.map((b, i) => {
            const op = springIn(clipFrame, fps, 0.25 + i * 0.1, 0.4);
            const ty = interpolate(op, [0, 1], [10, 0]);
            const commonStyle = { marginBottom: 12, opacity: op, transform: `translateY(${ty}px)`, color: "#37352f" };
            if (b.type === "heading") return <div key={i} style={{ ...commonStyle, fontSize: 26, fontWeight: 700, marginTop: 18, marginBottom: 10 }}>{b.text}</div>;
            if (b.type === "callout") {
              return (
                <div key={i} style={{ ...commonStyle, background: "#f7f6f3", padding: "18px 22px", borderRadius: 8, display: "flex", gap: 14, border: "1px solid #e9e8e5" }}>
                  <div style={{ fontSize: 22 }}>💡</div>
                  <div style={{ fontSize: 16, lineHeight: 1.65 }}>{b.text}</div>
                </div>
              );
            }
            if (b.type === "todo") {
              return (
                <div key={i} style={{ ...commonStyle, display: "flex", gap: 12, alignItems: "center", fontSize: 16 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    border: "1.8px solid rgba(55,53,47,0.3)",
                    background: b.checked ? "#2383e2" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "all 0.2s",
                  }}>{b.checked && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}</div>
                  <div style={{ textDecoration: b.checked ? "line-through" : "none", opacity: b.checked ? 0.5 : 1 }}>{b.text}</div>
                </div>
              );
            }
            if (b.type === "bullet") {
              return (
                <div key={i} style={{ ...commonStyle, display: "flex", gap: 14, alignItems: "flex-start", fontSize: 16, lineHeight: 1.65 }}>
                  <div style={{ marginTop: 11, width: 7, height: 7, borderRadius: "50%", background: "#37352f", flexShrink: 0 }} />
                  <div>{b.text}</div>
                </div>
              );
            }
            return <div key={i} style={{ ...commonStyle, fontSize: 16, lineHeight: 1.7 }}>{b.text}</div>;
          })}
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
