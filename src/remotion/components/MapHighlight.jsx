import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

/**
 * MapHighlight: Simplified world map outline with highlighted regions and stat callouts.
 * Data: { title, highlights: [{ region, value, suffix, label, x, y }] }
 * x,y are percentages (0-100) for pin placement on the map area.
 */
export const MapHighlight = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const highlights = data.highlights || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const mapOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 20, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ position: "relative", width: 1200, height: 600, opacity: mapOp }}>
        {/* Simplified world map — dotted grid pattern */}
        <svg width="1200" height="600" viewBox="0 0 1200 600" style={{ position: "absolute", inset: 0 }}>
          {/* Dot grid representing the world */}
          {Array.from({ length: 40 * 20 }, (_, idx) => {
            const col = idx % 40;
            const row = Math.floor(idx / 40);
            const x = col * 30 + 15;
            const y = row * 30 + 15;
            return <circle key={idx} cx={x} cy={y} r="2" fill="#ffffff" opacity="0.08" />;
          })}
          {/* Continental outlines — simplified rectangles/shapes */}
          <ellipse cx="280" cy="220" rx="180" ry="120" fill="none" stroke="#ffffff22" strokeWidth="1" />
          <ellipse cx="600" cy="200" rx="220" ry="140" fill="none" stroke="#ffffff22" strokeWidth="1" />
          <ellipse cx="900" cy="250" rx="180" ry="130" fill="none" stroke="#ffffff22" strokeWidth="1" />
          <ellipse cx="550" cy="400" rx="100" ry="80" fill="none" stroke="#ffffff22" strokeWidth="1" />
          <ellipse cx="1050" cy="420" rx="100" ry="70" fill="none" stroke="#ffffff22" strokeWidth="1" />
        </svg>

        {/* Highlight pins */}
        {highlights.slice(0, 6).map((h, i) => {
          const delay = i * 0.12;
          const pinScale = interpolate(clipFrame, [fps * (0.3 + delay), fps * (0.45 + delay)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)),
          });
          const px = (h.x || 50) * 12; // 0-100 → 0-1200
          const py = (h.y || 50) * 6;  // 0-100 → 0-600
          const colors = ["#ff4466", "#44aaff", "#44dd88", "#ffaa44", "#dd44ff", "#44dddd"];
          const color = colors[i % colors.length];
          const pulse = 1 + Math.sin(clipFrame / (fps * 0.5) + i) * 0.08;

          return (
            <div key={i} style={{
              position: "absolute", left: px - 60, top: py - 70,
              transform: `scale(${pinScale * pulse})`, transformOrigin: "center bottom",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{
                background: "rgba(0,0,0,0.8)", border: `2px solid ${color}`, borderRadius: 12,
                padding: "8px 16px", display: "flex", flexDirection: "column", alignItems: "center",
                boxShadow: `0 0 20px ${color}40`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: color, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {h.value}{h.suffix || ""}
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#ffffffdd", fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {h.label || h.region || ""}
                </div>
              </div>
              {/* Pin dot */}
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, marginTop: 4, boxShadow: `0 0 15px ${color}` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
