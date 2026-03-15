import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// ProCon — Pros and cons side by side
// data: { title: "The Trade-off", pros: ["benefit 1", "benefit 2"], cons: ["downside 1", "downside 2"] }
// USE WHEN: narrator weighs advantages vs disadvantages, good vs bad, benefits vs risks
export const ProCon = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.pros?.length && !data?.cons?.length) return null;

  const pros = (data.pros || []).slice(0, 4);
  const cons = (data.cons || []).slice(0, 4);
  const title = data.title || "";

  const titleOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const colOp = interpolate(clipFrame, [fps * 0.2, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const renderItem = (item, i, isPos) => {
    const delay = i * fps * 0.2 + fps * 0.4;
    const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", opacity: op }}>
        <div style={{ fontSize: 16, color: isPos ? "#22c55e" : "#ef4444", flexShrink: 0, marginTop: 1 }}>{isPos ? "✓" : "✗"}</div>
        <div style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", fontFamily: "Arial, sans-serif", lineHeight: 1.4 }}>{item}</div>
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 60px", gap: 20 }}>
      {title && (
        <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", opacity: titleOp }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", width: "100%", gap: 16 }}>
        {/* PROS */}
        <div style={{ flex: 1, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 16, padding: "20px 16px", opacity: colOp }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 16 }}>PROS</div>
          {pros.map((p, i) => renderItem(p, i, true))}
        </div>
        {/* CONS */}
        <div style={{ flex: 1, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: "20px 16px", opacity: colOp }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: 16 }}>CONS</div>
          {cons.map((c, i) => renderItem(c, i, false))}
        </div>
      </div>
    </div>
  );
};
