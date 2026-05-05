import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * PyramidStack — hierarchical pyramid with layers building from bottom up.
 * data: { title: "optional", layers: [{ label: "Foundation", detail: "optional" }] }
 * Layers render bottom-up: first item = bottom (widest), last = top (narrowest).
 */
export const PyramidStack = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const layers = (data.layers || []).slice(0, 5);
  const n = layers.length;

  const titleOp = interpolate(clipFrame, [fps * 0.1, fps * 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const baseW = 1000;
  const layerH = 80;
  const gap = 8;
  const totalH = n * (layerH + gap);

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {title && (
          <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", marginBottom: 40, opacity: titleOp, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {title}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap }}>
          {/* Render reversed: bottom of array = bottom of pyramid = widest */}
          {[...layers].reverse().map((layer, visualIdx) => {
            const dataIdx = n - 1 - visualIdx; // original array index
            // Bottom (visualIdx=0) is widest, top (visualIdx=n-1) is narrowest
            const widthPct = ((n - visualIdx) / n);
            const w = baseW * widthPct;

            // Animate bottom-up: bottom appears first
            const delay = 0.3 + (n - 1 - visualIdx) * 0.25;
            const layerOp = interpolate(clipFrame, [fps * delay, fps * (delay + 0.3)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const layerY = interpolate(clipFrame, [fps * delay, fps * (delay + 0.4)], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

            // Color: bottom is deep, top is bright
            const hue = 220;
            const light = 30 + visualIdx * 10;
            const sat = 60 + visualIdx * 8;

            return (
              <div key={dataIdx} style={{
                width: w, height: layerH,
                background: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${light}%), hsl(${hue + 20}, ${sat}%, ${light + 5}%))`,
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: layerOp, transform: `translateY(${layerY}px)`,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: visualIdx === n - 1 ? "0 0 30px rgba(100,160,255,0.3)" : "none",
                gap: 16,
              }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>{layer.label}</span>
                {layer.detail && <span style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif" }}>— {layer.detail}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedBg>
  );
};
