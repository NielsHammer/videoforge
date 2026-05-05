import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * NotificationStack — cascading notification cards that slide in from the right.
 * data: { notifications: [{ icon: "💸", title: "Hidden Fee", text: "Temple entry: $15", time: "just now" }] }
 */
export const NotificationStack = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const notifs = (data.notifications || []).slice(0, 5);

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "80px 280px" }}>
        {notifs.map((n, i) => {
          const delay = 0.2 + i * 0.3;
          const slideX = interpolate(clipFrame, [fps * delay, fps * (delay + 0.35)], [300, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const cardOp = interpolate(clipFrame, [fps * delay, fps * (delay + 0.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={i} style={{
              width: "100%", maxWidth: 800,
              display: "flex", alignItems: "center", gap: 20,
              padding: "22px 28px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              opacity: cardOp,
              transform: `translateX(${slideX}px)`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
              {/* Icon */}
              <div style={{ fontSize: 38, flexShrink: 0 }}>{n.icon || "🔔"}</div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>{n.title}</div>
                {n.text && <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif", marginTop: 4 }}>{n.text}</div>}
              </div>

              {/* Time */}
              {n.time && (
                <div style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
                  {n.time}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AnimatedBg>
  );
};
