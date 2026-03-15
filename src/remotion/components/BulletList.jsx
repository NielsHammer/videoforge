import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// BulletList — Clean animated bullet points, one by one
// data: { title: "Key Points", items: ["Point one from script", "Point two", "Point three", "Point four"], icon: "•" }
// USE WHEN: narrator lists 3-5 items, tips, reasons, or steps
export const BulletList = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.items?.length) return null;

  const items = data.items.slice(0, 5);
  const title = data.title || "";
  const icon = data.icon || "▶";
  const delayPerItem = fps * 0.4;

  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 80px", gap: 0 }}>
      {title && (
        <div style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 28, opacity: titleOp }}>
          {title}
        </div>
      )}
      {items.map((item, i) => {
        const delay = i * delayPerItem + fps * 0.15;
        const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(clipFrame, [delay, delay + fps * 0.3], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "12px 0", borderBottom: i < items.length - 1 ? `1px solid rgba(255,255,255,0.06)` : "none", opacity: op, transform: `translateX(${x}px)` }}>
            <div style={{ fontSize: 20, color: accent, flexShrink: 0, marginTop: 2, fontWeight: 900 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{item}</div>
          </div>
        );
      })}
    </div>
  );
};
