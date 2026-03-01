import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const ListReveal = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const items = data.items || ["Item 1", "Item 2", "Item 3"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400, width: "100%" }}>
        {title && (
          <div style={{
            fontSize: 52, fontWeight: 800, color: "white", fontFamily: "Helvetica Neue, Arial, sans-serif",
            textTransform: "uppercase", alignSelf: "center", marginBottom: 20,
            opacity: interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [0, fps * 0.4], [-25, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })}px)`,
          }}>{title}</div>
        )}

        {items.map((item, i) => {
          const delay = fps * 0.3 + i * fps * 0.25;
          const itemOp = interpolate(frame, [delay, delay + fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const itemX = interpolate(frame, [delay, delay + fps * 0.25], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const barW = interpolate(frame, [delay, delay + fps * 0.4], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, opacity: itemOp, transform: `translateX(${itemX}px)` }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, #4a9eff, #2563eb)",
                display: "flex", justifyContent: "center", alignItems: "center",
                fontSize: 26, fontWeight: 800, color: "white", fontFamily: "Helvetica Neue, Arial, sans-serif",
                boxShadow: "0 4px 25px rgba(74,158,255,0.3)",
              }}>{i + 1}</div>

              <div style={{
                flex: 1, borderRadius: 14, padding: "18px 26px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,158,255,0.08)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${barW}%`, background: "linear-gradient(90deg, rgba(74,158,255,0.07), transparent)" }} />
                <div style={{ fontSize: 34, fontWeight: 500, color: "#d8e2f0", fontFamily: "Helvetica Neue, Arial, sans-serif", position: "relative", zIndex: 1 }}>{item}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
