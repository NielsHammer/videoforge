import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn } from "./_shared.jsx";

/**
 * PassportStamp — a location arrival stamp that punches onto a textured page.
 * data: { country: "INDONESIA", city: "Bali", date: "15 MAR 2024", type: "ARRIVED", icon: "🇮🇩" }
 */
export const PassportStamp = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const country = data.country || "DESTINATION";
  const city = data.city || "";
  const date = data.date || "";
  const type = data.type || "ARRIVED";
  const icon = data.icon || "🌍";

  const stampDelay = 0.4;
  const stampScale = interpolate(clipFrame, [fps * stampDelay, fps * (stampDelay + 0.12)], [2.5, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });
  const stampOp = interpolate(clipFrame, [fps * stampDelay, fps * (stampDelay + 0.05)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampRotate = interpolate(clipFrame, [fps * stampDelay, fps * (stampDelay + 0.15)], [8, -3], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Page texture
  const pageScale = springIn(clipFrame, fps, 0.1);

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pageScale})` }}>
        {/* Passport page */}
        <div style={{
          width: 800, height: 600,
          background: "linear-gradient(135deg, #f5f0e8, #ede5d8)",
          borderRadius: 8,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 0 80px rgba(0,0,0,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Faint page lines */}
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ position: "absolute", top: 50 + i * 44, left: 60, right: 60, height: 1, background: "rgba(0,0,0,0.04)" }} />
          ))}

          {/* Stamp */}
          <div style={{
            opacity: stampOp,
            transform: `scale(${stampScale}) rotate(${stampRotate}deg)`,
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "30px 50px",
            border: "4px solid rgba(180,40,40,0.7)",
            borderRadius: 12,
            position: "relative",
          }}>
            {/* Type badge */}
            <div style={{
              fontSize: 16, fontWeight: 800, color: "rgba(180,40,40,0.7)",
              fontFamily: "Inter, sans-serif", letterSpacing: 6, textTransform: "uppercase",
              marginBottom: 8,
            }}>
              {type}
            </div>

            {/* Icon */}
            <div style={{ fontSize: 48, marginBottom: 8 }}>{icon}</div>

            {/* Country */}
            <div style={{
              fontSize: 36, fontWeight: 800, color: "rgba(180,40,40,0.75)",
              fontFamily: "Inter, sans-serif", letterSpacing: 4, textTransform: "uppercase",
            }}>
              {country}
            </div>

            {/* City */}
            {city && (
              <div style={{
                fontSize: 20, fontWeight: 600, color: "rgba(180,40,40,0.5)",
                fontFamily: "Inter, sans-serif", letterSpacing: 2, marginTop: 4,
              }}>
                {city}
              </div>
            )}

            {/* Date */}
            {date && (
              <div style={{
                fontSize: 16, fontWeight: 600, color: "rgba(180,40,40,0.5)",
                fontFamily: "Inter, sans-serif", letterSpacing: 3, marginTop: 12,
                borderTop: "2px solid rgba(180,40,40,0.3)", paddingTop: 8,
              }}>
                {date}
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedBg>
  );
};
