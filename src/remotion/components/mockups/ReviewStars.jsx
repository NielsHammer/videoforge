import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { AnimatedBg, springIn, breathe } from "./_shared.jsx";

/**
 * ReviewStars — star rating with optional review text and source.
 * Stars fill in one by one with a satisfying glow.
 * data: { rating: 4.5, max: 5, title: "Bali Hidden Villa", review: "optional review text", source: "TripAdvisor", count: "2,847 reviews" }
 */
export const ReviewStars = ({ data = {}, clipFrame = 0, theme }) => {
  const { fps } = useVideoConfig();
  const rating = Number(data.rating ?? 4);
  const max = Number(data.max ?? 5);
  const title = data.title || "";
  const review = data.review || "";
  const source = data.source || "";
  const count = data.count || "";

  const scale = springIn(clipFrame, fps, 0.1);
  const titleOp = interpolate(clipFrame, [fps * 0.2, fps * 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reviewOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const starColor = "#fbbf24";

  return (
    <AnimatedBg frame={clipFrame} theme={theme}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `scale(${scale})` }}>
        {/* Title */}
        {title && (
          <div style={{ opacity: titleOp, marginBottom: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", fontFamily: "Inter, sans-serif" }}>{title}</div>
          </div>
        )}

        {/* Stars */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {Array.from({ length: max }, (_, i) => {
            const starDelay = 0.3 + i * 0.12;
            const starOp = interpolate(clipFrame, [fps * starDelay, fps * (starDelay + 0.15)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const starScale = interpolate(clipFrame, [fps * starDelay, fps * (starDelay + 0.2)], [0.5, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2)),
            });
            const isFull = i + 1 <= Math.floor(rating);
            const isHalf = !isFull && i < rating;
            const isEmpty = !isFull && !isHalf;

            return (
              <div key={i} style={{ fontSize: 64, opacity: starOp, transform: `scale(${starScale})`, filter: isFull ? `drop-shadow(0 0 12px ${starColor}60)` : "none" }}>
                <span style={{ color: isEmpty ? "rgba(255,255,255,0.15)" : starColor }}>
                  {isEmpty ? "☆" : "★"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rating number */}
        <div style={{ opacity: titleOp, display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: starColor, fontFamily: "Inter, sans-serif" }}>{rating}</span>
          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif" }}>/ {max}</span>
        </div>

        {/* Source + count */}
        {(source || count) && (
          <div style={{ opacity: titleOp, display: "flex", gap: 12, marginBottom: 24 }}>
            {source && <span style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>{source}</span>}
            {count && <span style={{ fontSize: 20, color: "rgba(255,255,255,0.35)", fontFamily: "Inter, sans-serif" }}>· {count}</span>}
          </div>
        )}

        {/* Review text */}
        {review && (
          <div style={{ opacity: reviewOp, maxWidth: 900, textAlign: "center" }}>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)", fontFamily: "Georgia, serif", fontStyle: "italic", lineHeight: 1.5 }}>
              "{review}"
            </div>
          </div>
        )}
      </div>
    </AnimatedBg>
  );
};
