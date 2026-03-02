import React from "react";
import { useVideoConfig, interpolate, Easing } from "remotion";

/**
 * Checklist v24: Items appear one by one with animated checkmarks.
 * Props via data:
 *   items: ["Diversify portfolio", "Reinvest dividends", "Stay consistent"]
 *   title: "Your Action Plan"
 *   checked: true (show checkmarks) or false (numbered list)
 */
export const Checklist = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  if (!data || !data.items || data.items.length === 0) return null;

  const items = data.items.slice(0, 7);
  const title = data.title || "";
  const isChecked = data.checked !== false;
  const color = data.color || "#22c55e";
  const titleOp = interpolate(clipFrame, [fps * 0.05, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 200px" }}>
      {/* Title */}
      {title && (
        <div style={{ fontSize: 34, fontWeight: 700, fontFamily: "Arial Black, Arial, sans-serif", color: "white", opacity: titleOp, textTransform: "uppercase", letterSpacing: 3, marginBottom: 45 }}>
          {title}
        </div>
      )}

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%", maxWidth: 900 }}>
        {items.map((item, i) => {
          const delay = fps * 0.2 + i * fps * 0.25;
          const itemSlide = interpolate(clipFrame, [delay, delay + fps * 0.25], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const itemOp = interpolate(clipFrame, [delay, delay + fps * 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const checkScale = interpolate(clipFrame, [delay + fps * 0.1, delay + fps * 0.2, delay + fps * 0.3], [0, 1.3, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const translateX = interpolate(itemSlide, [0, 1], [-40, 0]);

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 20,
              transform: `translateX(${translateX}px)`, opacity: itemOp,
              padding: "16px 24px", borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              {/* Check / Number */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isChecked ? `${color}15` : "rgba(255,255,255,0.05)",
                border: `2px solid ${isChecked ? `${color}40` : "rgba(255,255,255,0.1)"}`,
                transform: `scale(${checkScale})`,
              }}>
                {isChecked ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffffcc" }}>{i + 1}</span>
                )}
              </div>

              {/* Text */}
              <span style={{ fontSize: 26, fontWeight: 500, fontFamily: "Arial Black, Arial, sans-serif", color: "#ffffff" }}>
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
