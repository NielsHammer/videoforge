import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedBg, ParticleField, PremiumCard, springIn, breathe } from "./_shared.jsx";

/**
 * FiverrGig — premium gig listing with continuous motion.
 */
export const FiverrGig = ({ data = {}, clipFrame = 0 }) => {
  const { fps } = useVideoConfig();
  const seller = data.seller_name || "seller";
  const level = data.seller_level || "Level 2";
  const title = data.title || "I will do something great for you";
  const rating = data.rating || "5.0";
  const reviews = data.reviews || "250";
  const price = data.price || "25";

  const priceGlow = breathe(clipFrame, fps, 2.4, 10, 25);

  return (
    <AnimatedBg tint1="#1dbf73" tint2="#15a263" tint3="#0ea55c" baseColor="#030f08">
      <ParticleField count={28} color="rgba(29,191,115,0.25)" />

      {/* Logo bar */}
      <div style={{
        position: "absolute", top: 50, left: 60,
        display: "flex", alignItems: "center", gap: 16,
        opacity: springIn(clipFrame, fps, 0, 0.4),
      }}>
        <div style={{
          fontSize: 34, fontWeight: 800, color: "#1dbf73",
          letterSpacing: "-1px", lineHeight: 1,
          textShadow: `0 0 ${priceGlow}px rgba(29,191,115,0.6)`,
        }}>fiverr<span style={{ color: "#1dbf73" }}>.</span></div>
      </div>

      {/* Main gig card */}
      <div style={{
        position: "absolute", inset: "130px 100px 70px 100px",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <PremiumCard
          accent="#1dbf73"
          style={{
            width: "100%", maxWidth: 900, padding: 0, overflow: "hidden",
            opacity: springIn(clipFrame, fps, 0.1, 0.5),
            transform: `scale(${interpolate(springIn(clipFrame, fps, 0.1, 0.5), [0, 1], [0.95, 1])})`,
          }}
        >
          {/* Gig "image" area with animated gradient */}
          <div style={{
            width: "100%", height: 340,
            background: "linear-gradient(135deg, #1dbf73 0%, #0ea55c 50%, #0d7c47 100%)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Scanning light effect */}
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${((clipFrame / fps * 25) % 140 - 20)}%`,
              width: "25%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
              pointerEvents: "none",
            }} />
            {/* Decorative mark */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(-50%, -50%) rotate(${clipFrame / fps * 20}deg)`,
              fontSize: 120, color: "rgba(255,255,255,0.15)",
              fontWeight: 900,
            }}>✦</div>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px", background: "linear-gradient(180deg, #0a1510 0%, #050a08 100%)" }}>
            {/* Seller row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
              opacity: springIn(clipFrame, fps, 0.3, 0.4),
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "linear-gradient(135deg, #7b68ee, #4834d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, fontWeight: 800,
                boxShadow: "0 4px 12px rgba(123,104,238,0.4)",
              }}>{seller.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{seller}</div>
                <div style={{ fontSize: 12, color: "#1dbf73", fontWeight: 600 }}>{level}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{
              fontSize: 20, color: "#fff", lineHeight: 1.4, marginBottom: 18,
              opacity: springIn(clipFrame, fps, 0.4, 0.4),
            }}>
              <span style={{ color: "#9ca3af" }}>I will </span>{title}
            </div>

            {/* Rating */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 18,
              opacity: springIn(clipFrame, fps, 0.5, 0.4),
            }}>
              <span style={{ color: "#ffb33e", fontSize: 18 }}>★</span>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>{rating}</span>
              <span style={{ color: "#9ca3af", fontSize: 13 }}>({reviews})</span>
            </div>

            {/* Price */}
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 18,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              opacity: springIn(clipFrame, fps, 0.6, 0.5),
            }}>
              <div style={{
                fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700,
              }}>Starting at</div>
              <div style={{
                fontSize: 28, fontWeight: 900, color: "#1dbf73",
                letterSpacing: "-0.5px",
                textShadow: `0 0 ${priceGlow}px rgba(29,191,115,0.6)`,
              }}>${price}</div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </AnimatedBg>
  );
};
