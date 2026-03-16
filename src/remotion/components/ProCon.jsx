import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const ProCon = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const title = data.title || "";
  const pros = data.pros || [];
  const cons = data.cons || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const leftX = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [-80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const rightX = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [80, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const colOp = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const renderItems = (items, color, icon) =>
    items.slice(0, 4).map((item, i) => {
      const delay = fps * (0.3 + i * 0.15);
      const iOp = interpolate(clipFrame, [delay, delay + fps * 0.2], [0, 1], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
      return (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          opacity: iOp, marginBottom: 14,
        }}>
          <span style={{ color, fontSize: 18, flexShrink: 0, marginTop: 2 }}>{icon}</span>
          <span style={{
            fontFamily: "sans-serif", fontWeight: 500,
            fontSize: 21, color: "rgba(255,255,255,0.88)",
            lineHeight: 1.4,
          }}>{typeof item === "string" ? item : item.label || item}</span>
        </div>
      );
    });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: bg, padding: "50px 60px",
    }}>
      {title && (
        <div style={{
          opacity: titleOp, marginBottom: 36,
          fontFamily: "sans-serif", fontWeight: 800,
          fontSize: 30, color: accent,
          textTransform: "uppercase", letterSpacing: 4,
        }}>{title}</div>
      )}

      <div style={{ display: "flex", gap: 24, width: "100%" }}>
        {/* Pros */}
        <div style={{
          flex: 1, transform: `translateX(${leftX}px)`, opacity: colOp,
          padding: "28px 28px",
          background: "rgba(34,197,94,0.08)",
          border: "1.5px solid rgba(34,197,94,0.3)",
          borderTop: "3px solid #22c55e",
          borderRadius: 12,
        }}>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 800,
            fontSize: 20, color: "#22c55e",
            letterSpacing: 3, marginBottom: 20,
            textTransform: "uppercase",
          }}>✅ PROS</div>
          {renderItems(pros, "#22c55e", "+")}
        </div>

        {/* Cons */}
        <div style={{
          flex: 1, transform: `translateX(${rightX}px)`, opacity: colOp,
          padding: "28px 28px",
          background: "rgba(239,68,68,0.08)",
          border: "1.5px solid rgba(239,68,68,0.3)",
          borderTop: "3px solid #ef4444",
          borderRadius: 12,
        }}>
          <div style={{
            fontFamily: "sans-serif", fontWeight: 800,
            fontSize: 20, color: "#ef4444",
            letterSpacing: 3, marginBottom: 20,
            textTransform: "uppercase",
          }}>❌ CONS</div>
          {renderItems(cons, "#ef4444", "−")}
        </div>
      </div>
    </div>
  );
};
