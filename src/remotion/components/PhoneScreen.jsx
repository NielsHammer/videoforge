import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const PhoneScreen = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#3b82f6";
  if (!data) return null;
  const app = data.app || "instagram"; // instagram|tiktok|twitter|messages|generic
  const stats = data.stats || []; // [{label, value}]
  const notification = data.notification || "";
  const title = data.title || "";

  const slideUp = interpolate(clipFrame, [0, fps * 0.4], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(clipFrame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });
  const notifOp = interpolate(clipFrame, [fps * 0.8, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const notifSlide = interpolate(clipFrame, [fps * 0.8, fps * 1.1], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tilt = Math.sin(clipFrame / fps * 0.5) * 2;

  const appColors = {
    instagram: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
    tiktok: "linear-gradient(135deg, #010101, #69C9D0)",
    twitter: "#1DA1F2",
    messages: "#34c759",
    generic: accent,
  };
  const appBg = appColors[app] || accent;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity, transform: `translateY(${slideUp}px)` }}>
      {title && (
        <div style={{ position: "absolute", top: 60, fontSize: 32, fontWeight: 800, fontFamily: "Arial Black, Arial, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: 3 }}>
          {title}
        </div>
      )}

      {/* Phone frame */}
      <div style={{
        width: 280, height: 560,
        background: "#1a1a2e",
        borderRadius: 40,
        border: "8px solid #2d2d4e",
        boxShadow: `0 30px 80px rgba(0,0,0,0.8), 0 0 40px ${accent}20, inset 0 0 0 1px rgba(255,255,255,0.05)`,
        overflow: "hidden",
        transform: `rotate(${tilt}deg)`,
        position: "relative",
      }}>
        {/* Status bar */}
        <div style={{ height: 40, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
          <div style={{ fontSize: 12, color: "white", fontWeight: 600 }}>9:41</div>
          <div style={{ width: 60, height: 12, background: "black", borderRadius: 8 }} />
          <div style={{ fontSize: 12, color: "white" }}>●●●</div>
        </div>

        {/* App header */}
        <div style={{ height: 60, background: appBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "white", letterSpacing: 1 }}>{app.toUpperCase()}</div>
        </div>

        {/* Stats inside phone */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {stats.map((stat, i) => {
            const statOp = interpolate(clipFrame, [fps * (0.4 + i * 0.2), fps * (0.6 + i * 0.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 16px", opacity: statOp }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Notification popup */}
        {notification && (
          <div style={{
            position: "absolute", top: 50, left: 12, right: 12,
            background: "rgba(30,30,50,0.95)",
            borderRadius: 16, padding: "12px 16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            opacity: notifOp,
            transform: `translateY(${notifSlide}px)`,
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Notification</div>
            <div style={{ fontSize: 13, color: "white", lineHeight: 1.4 }}>{notification}</div>
          </div>
        )}
      </div>
    </div>
  );
};
