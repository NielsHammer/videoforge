import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { lines: ["$ initializing...", "> Loading model weights", "> Processing 1.8T parameters"], title: "AI TRAINING" }
export const CodeTerminal = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data?.lines?.length) return null;

  const lines = data.lines.slice(0, 8);
  const title = (data.title || "TERMINAL").toUpperCase();
  const green = "#22c55e";

  const linesShown = Math.floor(interpolate(clipFrame, [fps * 0.2, fps * 1.5], [0, lines.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const cursorBlink = Math.floor(clipFrame / 8) % 2 === 0;
  const containerOp = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 60px" }}>
      <div style={{ width: "100%", maxWidth: 700, opacity: containerOp }}>
        {/* Terminal window */}
        <div style={{ background: "rgba(0,0,0,0.9)", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
          {/* Title bar */}
          <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
            </div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: 2 }}>{title}</div>
          </div>
          {/* Terminal content */}
          <div style={{ padding: "16px 20px", fontFamily: "monospace", fontSize: 15, lineHeight: 1.8 }}>
            {lines.slice(0, linesShown).map((line, i) => {
              const isCommand = line.startsWith("$") || line.startsWith(">");
              return (
                <div key={i} style={{ color: isCommand ? green : "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {line}
                </div>
              );
            })}
            {linesShown <= lines.length && (
              <span style={{ color: green, opacity: cursorBlink ? 1 : 0 }}>█</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// DataStream — Matrix-style data flow animation. AI, surveillance, big data.
// data: { label: "PROCESSING", value: "1.8T PARAMETERS", sublabel: "neural network active" }
