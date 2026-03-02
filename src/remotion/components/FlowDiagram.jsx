import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

const defaultColors = ["#4488ff", "#44dd88", "#ff8844", "#dd44aa", "#44dddd", "#ddaa44"];

export const FlowDiagram = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const nodes = data.nodes || [];

  const titleOp = interpolate(clipFrame, [0, fps * 0.12], [0, 1], { extrapolateRight: "clamp" });
  const count = Math.min(nodes.length, 7);

  // Layout: nodes flow left to right with arrows between them
  // For 2-row layouts, alternate top/bottom
  const isWide = count > 4;
  const topRow = isWide ? nodes.slice(0, Math.ceil(count / 2)) : nodes.slice(0, count);
  const bottomRow = isWide ? nodes.slice(Math.ceil(count / 2), count) : [];

  const renderNode = (node, i, rowOffset = 0) => {
    const globalIdx = i + rowOffset;
    const delay = globalIdx * 0.1;
    const nodeScale = interpolate(clipFrame, [fps * (0.15 + delay), fps * (0.35 + delay)], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)),
    });
    const nodeOp = interpolate(clipFrame, [fps * (0.12 + delay), fps * (0.3 + delay)], [0, 1], { extrapolateRight: "clamp" });
    const color = node.color || defaultColors[globalIdx % defaultColors.length];
    const isDecision = node.type === "decision";

    return (
      <div key={globalIdx} style={{
        display: "flex", alignItems: "center", gap: 12,
        transform: `scale(${nodeScale})`, opacity: nodeOp,
      }}>
        <div style={{
          width: isDecision ? 140 : 160, minHeight: isDecision ? 80 : 70,
          borderRadius: isDecision ? 8 : 14,
          transform: isDecision ? "rotate(0deg)" : "none",
          background: `${color}12`, border: `2px solid ${color}55`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "12px 14px", gap: 4,
          boxShadow: `0 0 18px ${color}15`,
        }}>
          {/* Step number */}
          <div style={{
            fontSize: 16, fontWeight: 900, color, textTransform: "uppercase",
            letterSpacing: 1, fontFamily: "'Arial Black', Arial, sans-serif",
          }}>
            {node.step || `Step ${globalIdx + 1}`}
          </div>
          {/* Label */}
          <div style={{
            fontSize: 15, fontWeight: 800, color: "#ffffff", textAlign: "center",
            lineHeight: 1.2, fontFamily: "'Arial Black', Arial, sans-serif",
          }}>
            {node.label || ""}
          </div>
          {/* Subtitle */}
          {node.subtitle && (
            <div style={{ fontSize: 19, color: "#ffffffbb", textAlign: "center", fontFamily: "'Arial Black', Arial, sans-serif" }}>
              {node.subtitle}
            </div>
          )}
        </div>
        {/* Arrow to next */}
        {i < (isWide ? topRow.length : count) - 1 && (
          <div style={{ display: "flex", alignItems: "center", opacity: nodeOp }}>
            <div style={{ width: 30, height: 2, background: `${color}44` }} />
            <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${color}66` }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {title && (
        <div style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30, opacity: titleOp, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </div>
      )}
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "nowrap" }}>
        {topRow.map((node, i) => renderNode(node, i, 0))}
      </div>
      {/* Connector between rows */}
      {bottomRow.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
          <div style={{ width: 2, height: 30, background: "rgba(255,255,255,0.15)" }} />
        </div>
      )}
      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "nowrap" }}>
          {bottomRow.map((node, i) => renderNode(node, i, topRow.length))}
        </div>
      )}
    </div>
  );
};
