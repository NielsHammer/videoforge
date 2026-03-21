import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { items: [{label: "VICTIM", detail: "John Doe"}, ...], title: "CASE FILE #47" }
export const EvidenceBoard = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.items?.length) return null;

  const items = data.items.slice(0, 4);
  const title = (data.title || "CASE FILE").toUpperCase();

  const titleOp = interpolate(clipFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Positions for 1-4 items
  const positions = [
    [{ x: 25, y: 35 }],
    [{ x: 20, y: 35 }, { x: 60, y: 35 }],
    [{ x: 15, y: 30 }, { x: 50, y: 30 }, { x: 72, y: 55 }],
    [{ x: 15, y: 28 }, { x: 55, y: 28 }, { x: 18, y: 62 }, { x: 60, y: 62 }],
  ][items.length - 1];

  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(139,100,50,0.15), transparent 70%)" }}>
      {/* Title */}
      <div style={{ position: "absolute", top: 32, left: 0, right: 0, textAlign: "center", fontSize: 13, fontWeight: 800, letterSpacing: 6, color: "rgba(255,255,255,0.35)", fontFamily: "Arial, sans-serif", textTransform: "uppercase", opacity: titleOp }}>
        {title}
      </div>

      {/* Cards */}
      {items.map((item, i) => {
        const delay = fps * (0.3 + i * 0.25);
        const op = interpolate(clipFrame, [delay, delay + fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const y = interpolate(clipFrame, [delay, delay + fps * 0.3], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
        const pos = positions[i];
        const rotation = [-3, 4, -5, 3][i];

        return (
          <div key={i} style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`, opacity: op, transform: `translateY(${y}px) rotate(${rotation}deg)` }}>
            {/* Polaroid */}
            <div style={{ background: "#f5f0e8", padding: "12px 12px 32px", borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)", width: 130 }}>
              {/* Photo area */}
              <div style={{ width: "100%", height: 80, background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 28, opacity: 0.5 }}>📋</div>
              </div>
              {/* Label */}
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#2a1a0a", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: 2, marginBottom: 2 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#2a1a0a", fontFamily: "Georgia, serif" }}>
                  {item.detail}
                </div>
              </div>
            </div>
            {/* Pin */}
            <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 14, height: 14, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #fca5a5, #dc2626)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }} />
          </div>
        );
      })}

      {/* Red strings connecting items (simplified as lines) */}
      {items.length > 1 && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {items.slice(0, -1).map((_, i) => {
            const from = positions[i];
            const to = positions[i + 1];
            const stringOp = interpolate(clipFrame, [fps * (0.6 + i * 0.25), fps * (0.9 + i * 0.25)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <line key={i} x1={`${from.x + 6.5}%`} y1={`${from.y + 8}%`} x2={`${to.x + 6.5}%`} y2={`${to.y + 8}%`} stroke="rgba(220,38,38,0.5)" strokeWidth="1.5" strokeDasharray="4,3" opacity={stringOp} />
            );
          })}
        </svg>
      )}
    </div>
  );
};

// RedactedReveal — Black censorship bars slide away revealing hidden text
// CENTERED. High drama. "What they didn't want you to know."
// data: { lines: ["The suspect was a", "senior government official"], revealed: [1] (which lines reveal) }
