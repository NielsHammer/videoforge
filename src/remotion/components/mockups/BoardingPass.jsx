import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * BoardingPass — travel ticket / boarding pass style card.
 * Works universally for "journey" metaphors beyond just travel.
 * data: { from: "SFO", from_city: "San Francisco", to: "DPS", to_city: "Denpasar, Bali", date: "Mar 15, 2024", passenger: "optional", flight: "GA 881", class: "Economy", gate: "B12" }
 */
export const BoardingPass = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const from = data.from || "NYC";
  const fromCity = data.from_city || "";
  const to = data.to || "???";
  const toCity = data.to_city || "";
  const date = data.date || "";
  const passenger = data.passenger || "";
  const flight = data.flight || "";
  const cls = data.class || "";
  const gate = data.gate || "";

  const scale = springIn(clipFrame, fps, 0.12);
  const contentOp = interpolate(clipFrame, [fps * 0.3, fps * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampOp = interpolate(clipFrame, [fps * 0.8, fps * 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stampScale = interpolate(clipFrame, [fps * 0.8, fps * 1.1], [1.4, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)),
  });

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        <div style={{
          width: 1100, display: "flex",
          background: "rgba(255,255,255,0.95)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
        }}>
          {/* Main section */}
          <div style={{ flex: 1, padding: "40px 50px", position: "relative" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30, opacity: contentOp }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#666", fontFamily: "Inter, sans-serif", letterSpacing: 3, textTransform: "uppercase" }}>BOARDING PASS</div>
              {flight && <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", fontFamily: "Inter, sans-serif" }}>{flight}</div>}
            </div>

            {/* Route */}
            <div style={{ display: "flex", alignItems: "center", gap: 40, opacity: contentOp }}>
              <div>
                <div style={{ fontSize: 56, fontWeight: 800, color: "#1a1a2e", fontFamily: "Inter, sans-serif", letterSpacing: 2 }}>{from}</div>
                {fromCity && <div style={{ fontSize: 16, color: "#888", fontFamily: "Inter, sans-serif" }}>{fromCity}</div>}
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: "#ddd" }} />
                <div style={{ fontSize: 24, color: "#aaa" }}>✈</div>
                <div style={{ flex: 1, height: 2, background: "#ddd" }} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 56, fontWeight: 800, color: "#1a1a2e", fontFamily: "Inter, sans-serif", letterSpacing: 2 }}>{to}</div>
                {toCity && <div style={{ fontSize: 16, color: "#888", fontFamily: "Inter, sans-serif" }}>{toCity}</div>}
              </div>
            </div>

            {/* Details row */}
            <div style={{ display: "flex", gap: 40, marginTop: 30, opacity: contentOp }}>
              {date && (
                <div>
                  <div style={{ fontSize: 12, color: "#aaa", fontFamily: "Inter, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>DATE</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", fontFamily: "Inter, sans-serif", marginTop: 4 }}>{date}</div>
                </div>
              )}
              {cls && (
                <div>
                  <div style={{ fontSize: 12, color: "#aaa", fontFamily: "Inter, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>CLASS</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", fontFamily: "Inter, sans-serif", marginTop: 4 }}>{cls}</div>
                </div>
              )}
              {gate && (
                <div>
                  <div style={{ fontSize: 12, color: "#aaa", fontFamily: "Inter, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>GATE</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", fontFamily: "Inter, sans-serif", marginTop: 4 }}>{gate}</div>
                </div>
              )}
              {passenger && (
                <div>
                  <div style={{ fontSize: 12, color: "#aaa", fontFamily: "Inter, sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>PASSENGER</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", fontFamily: "Inter, sans-serif", marginTop: 4 }}>{passenger}</div>
                </div>
              )}
            </div>
          </div>

          {/* Tear line + stub */}
          <div style={{ width: 1, background: "transparent", borderLeft: "2px dashed #ccc", position: "relative" }}>
            <div style={{ position: "absolute", top: -12, left: -13, width: 24, height: 24, borderRadius: "50%", background: "#0a0e18" }} />
            <div style={{ position: "absolute", bottom: -12, left: -13, width: 24, height: 24, borderRadius: "50%", background: "#0a0e18" }} />
          </div>
          <div style={{ width: 200, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: stampOp, transform: `scale(${stampScale})` }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#1a1a2e", fontFamily: "Inter, sans-serif", letterSpacing: 2 }}>{to}</div>
            {gate && <div style={{ fontSize: 14, color: "#888", fontFamily: "Inter, sans-serif", marginTop: 8, letterSpacing: 2 }}>GATE {gate}</div>}
          </div>
        </div>
      </div>
    </AnimatedBg>
  );
};
