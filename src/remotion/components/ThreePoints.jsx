import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// ThreePoints — Exactly 3 key points with icons, clean and impactful
// data: { title: "3 Wealth Killers", points: [{icon:"💸", label:"Lifestyle Inflation", desc:"spending more as you earn more"}, {icon:"⏰", label:"Starting Late", desc:"compound interest needs time"}, {icon:"🎰", label:"Speculation", desc:"gambling with savings"}] }
// USE WHEN: narrator covers exactly 3 reasons, rules, principles, or categories
export const ThreePoints = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.points?.length) return null;

  const points = data.points.slice(0, 3);
  const title = data.title || "";
  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", gap: 20 }}>
      {title && (
        <div style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp, marginBottom: 8 }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", width: "100%", gap: 16 }}>
        {points.map((point, i) => {
          const delay = i * fps * 0.2 + fps * 0.2;
          const op = interpolate(clipFrame, [delay, delay + fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(clipFrame, [delay, delay + fps * 0.4], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return (
            <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}20`, borderRadius: 16, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: op, transform: `translateY(${y}px)` }}>
              <div style={{ fontSize: 48, lineHeight: 1, filter: `drop-shadow(0 4px 12px ${accent}40)` }}>{point.icon || "•"}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "white", fontFamily: "Arial Black, Arial, sans-serif", textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>{point.label}</div>
              {point.desc && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "Arial, sans-serif", textAlign: "center", lineHeight: 1.4 }}>{point.desc}</div>
              )}
              <div style={{ width: "60%", height: 2, background: `linear-gradient(90deg, transparent, ${accent}50, transparent)`, borderRadius: 1 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
