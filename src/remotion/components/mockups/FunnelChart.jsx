import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * FunnelChart — narrowing funnel showing drop-off or conversion stages.
 * data: { title: "optional", stages: [{ label: "Visitors", value: "100K", pct: 100 }, { label: "Signups", value: "12K", pct: 12 }] }
 */
export const FunnelChart = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const title = data.title || "";
  const stages = (data.stages || []).slice(0, 5);
  const accent = "#4a9eff";

  const titleOp = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const maxPct = Math.max(...stages.map(s => s.pct || 100));

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 160px" }}>
        {title && (
          <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", marginBottom: 50, opacity: titleOp, letterSpacing: 1.5, textTransform: "uppercase" }}>
            {title}
          </div>
        )}
        <div style={{ width: "100%", maxWidth: 1000, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {stages.map((stage, i) => {
            const delay = 0.3 + i * 0.25;
            const w = ((stage.pct || 100) / maxPct) * 100;
            const barW = interpolate(clipFrame, [fps * delay, fps * (delay + 0.5)], [0, w], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
            });
            const rowOp = interpolate(clipFrame, [fps * (delay - 0.1), fps * delay], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            // Color gradient from vibrant top to dim bottom
            const hue = 210 + i * 25;
            const sat = 80 - i * 10;
            const light = 60 - i * 5;
            const color = `hsl(${hue}, ${sat}%, ${light}%)`;

            return (
              <div key={i} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", opacity: rowOp }}>
                <div style={{
                  width: `${barW}%`, height: 56, borderRadius: 10,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  boxShadow: i === 0 ? `0 0 30px ${color}40` : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0 24px", minWidth: 200, transition: "width 0.1s",
                }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: "#fff", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>{stage.label}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>{stage.value}</span>
                </div>
                {/* Drop-off arrow between stages */}
                {i < stages.length - 1 && (
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 20, margin: "2px 0" }}>▼</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AnimatedBg>
  );
};
