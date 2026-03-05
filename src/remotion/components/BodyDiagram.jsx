import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

/**
 * BodyDiagram: Human silhouette with labeled zones and stat callouts.
 * Data: { title, zones: [{ label, value, suffix, position }] }
 * position: "head", "chest", "arms", "core", "legs" or {x, y} percentages
 */
export const BodyDiagram = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const zones = data.zones || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateRight: "clamp" });
  const bodyOp = interpolate(clipFrame, [fps * 0.1, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });

  const posMap = {
    head: { x: 50, y: 8 }, brain: { x: 50, y: 5 },
    chest: { x: 50, y: 28 }, heart: { x: 45, y: 28 }, lungs: { x: 55, y: 26 },
    arms: { x: 25, y: 32 }, shoulders: { x: 35, y: 22 },
    core: { x: 50, y: 42 }, stomach: { x: 50, y: 40 }, liver: { x: 42, y: 38 },
    legs: { x: 45, y: 65 }, knees: { x: 45, y: 70 }, feet: { x: 45, y: 88 },
    back: { x: 55, y: 35 }, hips: { x: 50, y: 52 },
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      <div style={{ position: "relative", width: 600, height: 750, opacity: bodyOp }}>
        {/* Human silhouette SVG */}
        <svg width="600" height="750" viewBox="0 0 200 250" style={{ position: "absolute", inset: 0 }}>
          {/* Head */}
          <circle cx="100" cy="30" r="18" fill="none" stroke="#ffffff30" strokeWidth="1.5" />
          {/* Neck */}
          <line x1="100" y1="48" x2="100" y2="58" stroke="#ffffff30" strokeWidth="1.5" />
          {/* Torso */}
          <path d="M 70 58 Q 68 90 72 130 L 85 130 Q 100 135 115 130 L 128 130 Q 132 90 130 58 Z" fill="none" stroke="#ffffff30" strokeWidth="1.5" />
          {/* Arms */}
          <path d="M 70 62 Q 45 80 35 110 Q 30 125 32 130" fill="none" stroke="#ffffff30" strokeWidth="1.5" />
          <path d="M 130 62 Q 155 80 165 110 Q 170 125 168 130" fill="none" stroke="#ffffff30" strokeWidth="1.5" />
          {/* Legs */}
          <path d="M 85 130 Q 80 170 78 210 L 72 240" fill="none" stroke="#ffffff30" strokeWidth="1.5" />
          <path d="M 115 130 Q 120 170 122 210 L 128 240" fill="none" stroke="#ffffff30" strokeWidth="1.5" />
        </svg>

        {/* Zone callouts */}
        {zones.slice(0, 6).map((zone, i) => {
          const delay = i * 0.1;
          const calloutScale = interpolate(clipFrame, [fps * (0.3 + delay), fps * (0.45 + delay)], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)),
          });
          const pos = posMap[zone.position] || zone.position || { x: 50, y: 50 };
          const isLeft = i % 2 === 0;
          const px = (pos.x / 100) * 600;
          const py = (pos.y / 100) * 750;
          const colors = ["#ff4466", "#44aaff", "#44dd88", "#ffaa44", "#dd44ff", "#44dddd"];
          const color = colors[i % colors.length];

          return (
            <div key={i} style={{
              position: "absolute",
              left: isLeft ? px - 250 : px + 20,
              top: py - 20,
              transform: `scale(${calloutScale})`,
              transformOrigin: isLeft ? "right center" : "left center",
              display: "flex", alignItems: "center", gap: 8,
              flexDirection: isLeft ? "row" : "row",
            }}>
              <div style={{
                background: "rgba(0,0,0,0.8)", border: `2px solid ${color}`, borderRadius: 12,
                padding: "8px 16px", boxShadow: `0 0 15px ${color}30`,
                display: "flex", flexDirection: "column", alignItems: isLeft ? "flex-end" : "flex-start",
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {zone.value}{zone.suffix || ""}
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {zone.label}
                </div>
              </div>
              {/* Connector line */}
              <div style={{ width: 30, height: 2, background: `${color}66` }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
