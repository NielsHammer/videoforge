import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

export const NewsBreaking = ({ data, clipFrame = 0, theme = "blue_grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme);
  const accent = th.subtitle?.accent || "#ef4444";
  if (!data) return null;
  const headline = data.headline || "";
  const ticker = data.ticker || "";
  const source = data.source || "BREAKING NEWS";

  const slideUp = interpolate(clipFrame, [0, fps * 0.3], [80, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateRight: "clamp" });
  const tickerOffset = (clipFrame * 2) % (ticker.length * 14 + 200);
  const blink = Math.floor(clipFrame / 15) % 2 === 0;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", opacity }}>
      {/* Main headline bar */}
      <div style={{ transform: `translateY(${slideUp}px)` }}>
        {/* Breaking news label */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", background: accent }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "white", opacity: blink ? 1 : 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 900, color: "white", letterSpacing: 4, textTransform: "uppercase", fontFamily: "Arial Black, Arial, sans-serif" }}>
            {source}
          </div>
        </div>

        {/* Headline */}
        <div style={{ background: "rgba(0,0,0,0.92)", padding: "18px 24px" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "white", fontFamily: "Arial Black, Arial, sans-serif", lineHeight: 1.3 }}>
            {headline}
          </div>
        </div>

        {/* Ticker */}
        {ticker && (
          <div style={{ background: accent, padding: "8px 0", overflow: "hidden" }}>
            <div style={{ display: "flex", transform: `translateX(-${tickerOffset}px)`, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "white", fontFamily: "Arial, sans-serif", letterSpacing: 1, paddingRight: 60 }}>
                {ticker} ⬩ {ticker} ⬩ {ticker}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
