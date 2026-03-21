import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

// data: { status: "MISSING"|"WANTED", name: "JULIUS CAESAR", description: "Last seen March 15th", reward: "1,000 Gold Denarii" }
export const MissingPoster = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  if (!data?.name) return null;

  const status = (data.status || "MISSING").toUpperCase();
  const name = (data.name || "").toUpperCase();
  const description = data.description || "";
  const reward = data.reward || "";
  const isWanted = status === "WANTED";

  const op = interpolate(clipFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const scale = interpolate(clipFrame, [0, fps * 0.5], [0.9, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
  const rotation = -2;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 80px" }}>
      <div style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, opacity: op, width: "100%", maxWidth: 480 }}>
        <div style={{ background: "linear-gradient(160deg, #f5ead0, #ecdcc0)", border: "6px solid #6b4226", borderRadius: 4, padding: "24px 28px", boxShadow: "0 8px 40px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "Arial Black, Arial, sans-serif", color: isWanted ? "#7f1d1d" : "#1a2744", letterSpacing: 6, textTransform: "uppercase", borderBottom: "3px solid currentColor", paddingBottom: 10, marginBottom: 14 }}>
              {status}
            </div>
            {/* Silhouette placeholder */}
            <div style={{ width: 100, height: 110, background: "rgba(0,0,0,0.1)", borderRadius: 4, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.15)" }}>
              <span style={{ fontSize: 48, opacity: 0.3 }}>👤</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, fontFamily: "Georgia, serif", color: "#1a1a1a", letterSpacing: 3, marginBottom: 10 }}>
              {name}
            </div>
            {description && (
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "rgba(0,0,0,0.5)", lineHeight: 1.5, marginBottom: 12 }}>
                {description}
              </div>
            )}
            {reward && (
              <div style={{ background: isWanted ? "#7f1d1d" : "#1a2744", color: "#f5ead0", padding: "8px 16px", borderRadius: 2, fontSize: 14, fontWeight: 800, fontFamily: "Arial Black, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>
                REWARD: {reward}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
