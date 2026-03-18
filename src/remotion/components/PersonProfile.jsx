import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const PersonProfile = ({ data = {}, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  const bg = th.subtitle?.bg || "rgba(6,12,36,0.92)";

  const name = data.name || "John Smith";
  const role = data.role || "Self-made millionaire";
  const stats = data.stats || [
    { value: "$0", label: "Started with" },
    { value: "$2.3M", label: "Net worth" },
  ];
  const outcome = data.outcome || "";

  const slideIn = interpolate(clipFrame, [0, fps * 0.3], [-80, 0], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const statsOp = interpolate(clipFrame, [fps * 0.3, fps * 0.55], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const outcomeOp = interpolate(clipFrame, [fps * 0.55, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: bg,
    }}>
      <div style={{
        transform: `translateX(${slideIn}px)`, opacity,
        width: 640,
      }}>
        {/* Profile header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 28,
          padding: "32px 40px",
          background: `${accent}0e`,
          border: `1.5px solid ${accent}33`,
          borderBottom: "none",
          borderRadius: "16px 16px 0 0",
        }}>
          {/* Avatar */}
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: `linear-gradient(135deg, ${accent}88, ${accent}22)`,
            border: `3px solid ${accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, flexShrink: 0,
          }}>👤</div>

          <div>
            <div style={{
              fontFamily: "sans-serif", fontWeight: 900,
              fontSize: 34, color: "#ffffff",
              lineHeight: 1.1,
            }}>{name}</div>
            <div style={{
              fontFamily: "sans-serif", fontWeight: 500,
              fontSize: 18, color: accent,
              marginTop: 6,
            }}>{role}</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: "flex",
          background: "rgba(0,0,0,0.3)",
          border: `1.5px solid ${accent}33`,
          borderTop: `1px solid ${accent}22`,
          borderBottom: "none",
          opacity: statsOp,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "20px 24px",
              textAlign: "center",
              borderRight: i < stats.length - 1 ? `1px solid ${accent}22` : "none",
            }}>
              <div style={{
                fontFamily: "sans-serif", fontWeight: 900,
                fontSize: 30, color: accent,
                textShadow: `0 0 20px ${accent}55`,
              }}>{s.value}</div>
              <div style={{
                fontFamily: "sans-serif", fontSize: 14,
                color: "rgba(255,255,255,0.5)", marginTop: 4,
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Outcome */}
        {outcome && (
          <div style={{
            padding: "20px 32px",
            background: `${accent}08`,
            border: `1.5px solid ${accent}33`,
            borderTop: `1px solid ${accent}22`,
            borderRadius: "0 0 16px 16px",
            opacity: outcomeOp,
          }}>
            <div style={{
              fontFamily: "Georgia, serif", fontStyle: "italic",
              fontSize: 18, color: "rgba(255,255,255,0.75)",
              lineHeight: 1.5,
            }}>"{outcome}"</div>
          </div>
        )}
      </div>
    </div>
  );
};
