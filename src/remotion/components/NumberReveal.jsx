import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { getTheme } from "../../themes.js";

/**
 * NumberReveal v3: 6 animation variants for visual variety.
 * Director sets data.style to pick which one to use.
 * 
 * Styles:
 *   "counter"     — Classic counting number with glow (default)
 *   "gauge"       — Circular progress ring filling up
 *   "bars"        — Vertical bars growing like equalizer
 *   "spotlight"   — Number drops in with dramatic spotlight
 *   "ticker"      — Stock ticker style, scrolling digits
 *   "impact"      — Giant number slams in with shake effect
 */
export const NumberReveal = ({ data, clipFrame = 0, theme = "grid" }) => {
  const { fps } = useVideoConfig();
  const th = getTheme(theme).number;
  if (!data) return null;

  let value = extractNumber(data.value);
  if (value === null || isNaN(value)) return null;

  const prefix = data.prefix || "";
  const suffix = data.suffix || "";
  const label = data.label || "";
  const style = data.style || "counter";
  const isDecimal = value % 1 !== 0;

  const progress = interpolate(clipFrame, [fps * 0.15, fps * 1.2], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const current = isDecimal
    ? (value * progress).toFixed(1)
    : Math.round(value * progress).toLocaleString();

  const displayValue = `${prefix}${current}${suffix}`;

  switch (style) {
    case "gauge": return <GaugeReveal value={value} displayValue={displayValue} label={label} progress={progress} clipFrame={clipFrame} fps={fps} th={th} />;
    case "bars": return <BarsReveal displayValue={displayValue} label={label} progress={progress} clipFrame={clipFrame} fps={fps} th={th} />;
    case "spotlight": return <SpotlightReveal displayValue={displayValue} label={label} clipFrame={clipFrame} fps={fps} th={th} />;
    case "ticker": return <TickerReveal displayValue={displayValue} label={label} clipFrame={clipFrame} fps={fps} th={th} />;
    case "impact": return <ImpactReveal displayValue={displayValue} label={label} clipFrame={clipFrame} fps={fps} th={th} />;
    default: return <CounterReveal displayValue={displayValue} label={label} clipFrame={clipFrame} fps={fps} th={th} />;
  }
};

// === STYLE 1: Counter (classic with glow) ===
const CounterReveal = ({ displayValue, label, clipFrame, fps, th }) => {
  const scale = interpolate(clipFrame, [fps * 0.1, fps * 0.4], [0.7, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.1)) });
  const opacity = interpolate(clipFrame, [fps * 0.1, fps * 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.8, fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = 0.15 + Math.sin(clipFrame / fps * 2.5) * 0.07;

  return (
    <div style={{ position: "absolute", top: "8%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${scale})`, opacity, zIndex: 10 }}>
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, rgba(${th.glowRgb},${glow}), transparent 55%)`, filter: "blur(40px)", top: -80 }} />
      <div style={{ fontSize: 140, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif", background: th.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -3, zIndex: 1, lineHeight: 1 }}>
        {displayValue}
      </div>
      <div style={{ width: 100, height: 3, borderRadius: 2, marginTop: 12, background: `linear-gradient(90deg, transparent, rgba(${th.glowRgb},0.6), transparent)`, opacity: labelOp }} />
      {label && <div style={{ fontSize: 32, fontWeight: 500, fontFamily: "Helvetica Neue, Arial, sans-serif", color: th.labelColor, opacity: labelOp, textAlign: "center", marginTop: 12, textTransform: "uppercase", letterSpacing: 2 }}>{label}</div>}
    </div>
  );
};

// === STYLE 2: Gauge (circular progress ring) ===
const GaugeReveal = ({ value, displayValue, label, progress, clipFrame, fps }) => {
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(progress, 1);
  const strokeDashoffset = circumference * (1 - pct);
  const labelOp = interpolate(clipFrame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10 }}>
      <div style={{ position: "relative", width: 380, height: 380 }}>
        <svg width="380" height="380" viewBox="0 0 380 380" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="190" cy="190" r={radius} fill="none" stroke="rgba(74,158,255,0.12)" strokeWidth="14" />
          <circle cx="190" cy="190" r={radius} fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
          <defs><linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#4a9eff" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif", color: "white", letterSpacing: -2 }}>{displayValue}</div>
        </div>
      </div>
      {label && <div style={{ fontSize: 28, fontWeight: 600, color: "#99aad0", marginTop: 16, textTransform: "uppercase", letterSpacing: 3, opacity: labelOp }}>{label}</div>}
    </div>
  );
};

// === STYLE 3: Bars (equalizer-style vertical bars) ===
const BarsReveal = ({ displayValue, label, progress, clipFrame, fps }) => {
  const opacity = interpolate(clipFrame, [0, fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barCount = 12;
  const colors = ["#4a9eff", "#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#4a9eff", "#38bdf8", "#22d3ee", "#34d399", "#4ade80", "#a3e635", "#facc15"];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity, zIndex: 10 }}>
      <div style={{ fontSize: 100, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif", color: "white", letterSpacing: -2, marginBottom: 20 }}>{displayValue}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
        {Array.from({ length: barCount }).map((_, i) => {
          const delay = i * 0.05;
          const barH = interpolate(progress, [delay, delay + 0.4], [0, 40 + Math.sin(i * 1.3) * 60 + 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <div key={i} style={{ width: 22, height: barH, borderRadius: 6, background: `linear-gradient(to top, ${colors[i]}88, ${colors[i]})`, boxShadow: `0 0 12px ${colors[i]}40` }} />;
        })}
      </div>
      {label && <div style={{ fontSize: 28, fontWeight: 600, color: "#99aad0", marginTop: 24, textTransform: "uppercase", letterSpacing: 3, opacity: labelOp }}>{label}</div>}
    </div>
  );
};

// === STYLE 4: Spotlight (dramatic drop-in) ===
const SpotlightReveal = ({ displayValue, label, clipFrame, fps }) => {
  const dropY = interpolate(clipFrame, [fps * 0.1, fps * 0.5], [-200, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.bounce) });
  const opacity = interpolate(clipFrame, [fps * 0.1, fps * 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spotSize = interpolate(clipFrame, [fps * 0.3, fps * 0.8], [100, 500], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.7, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
      <div style={{ position: "absolute", width: spotSize, height: spotSize, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)", filter: "blur(30px)" }} />
      <div style={{ fontSize: 160, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif", color: "white", transform: `translateY(${dropY}px)`, opacity, textShadow: "0 10px 40px rgba(74,158,255,0.4), 0 0 80px rgba(74,158,255,0.15)", letterSpacing: -4 }}>
        {displayValue}
      </div>
      <div style={{ width: 200, height: 2, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)", marginTop: 16, opacity: labelOp }} />
      {label && <div style={{ fontSize: 30, fontWeight: 600, color: "#bcc8e0", marginTop: 14, textTransform: "uppercase", letterSpacing: 4, opacity: labelOp }}>{label}</div>}
    </div>
  );
};

// === STYLE 5: Ticker (stock ticker style) ===
const TickerReveal = ({ displayValue, label, clipFrame, fps }) => {
  const slideX = interpolate(clipFrame, [0, fps * 0.4], [300, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(clipFrame, [0, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(clipFrame, [fps * 0.5, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(clipFrame / fps * 3) * 0.02;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
      <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: 16, padding: "30px 60px", backdropFilter: "blur(10px)", transform: `translateX(${slideX}px) scale(${pulse})`, opacity }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#4ade80", textTransform: "uppercase", letterSpacing: 3, marginBottom: 8 }}>▲ LIVE</div>
        <div style={{ fontSize: 110, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif", color: "white", letterSpacing: -2, lineHeight: 1 }}>{displayValue}</div>
        {label && <div style={{ fontSize: 24, fontWeight: 500, color: "#99aad0", marginTop: 12, textTransform: "uppercase", letterSpacing: 2, opacity: labelOp }}>{label}</div>}
      </div>
    </div>
  );
};

// === STYLE 6: Impact (giant slam with shake) ===
const ImpactReveal = ({ displayValue, label, clipFrame, fps }) => {
  const slamScale = interpolate(clipFrame, [fps * 0.05, fps * 0.2, fps * 0.35], [3, 0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(clipFrame, [fps * 0.05, fps * 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = clipFrame < fps * 0.4 ? Math.sin(clipFrame * 2.5) * Math.max(0, 1 - clipFrame / (fps * 0.4)) * 6 : 0;
  const labelOp = interpolate(clipFrame, [fps * 0.6, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringScale = interpolate(clipFrame, [fps * 0.15, fps * 0.6], [0, 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringOp = interpolate(clipFrame, [fps * 0.15, fps * 0.6], [0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: "3px solid rgba(74,158,255,0.4)", transform: `scale(${ringScale})`, opacity: ringOp }} />
      <div style={{ fontSize: 180, fontWeight: 900, fontFamily: "Helvetica Neue, Arial, sans-serif", background: "linear-gradient(180deg, #ffffff, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", transform: `scale(${slamScale}) translateX(${shake}px)`, opacity, letterSpacing: -5, lineHeight: 1 }}>
        {displayValue}
      </div>
      {label && <div style={{ fontSize: 34, fontWeight: 700, color: "#e2e8f0", marginTop: 20, textTransform: "uppercase", letterSpacing: 3, opacity: labelOp }}>{label}</div>}
    </div>
  );
};

function extractNumber(val) {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return null;
  const str = String(val).replace(/,/g, "").trim();
  const direct = parseFloat(str.replace(/[$%]/g, ""));
  if (!isNaN(direct)) {
    if (/m$/i.test(str)) return direct * 1000000;
    if (/k$/i.test(str)) return direct * 1000;
    if (/b$/i.test(str)) return direct * 1000000000;
    return direct;
  }
  const words = { zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
    eleven:11,twelve:12,fifteen:15,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,
    hundred:100,thousand:1000,million:1000000,billion:1000000000 };
  const tokens = str.toLowerCase().replace(/[^a-z0-9. ]/g, " ").split(/\s+/);
  let result = 0, current = 0;
  for (const t of tokens) {
    if (words[t] !== undefined) {
      const w = words[t];
      if (w === 100) current = (current || 1) * 100;
      else if (w >= 1000) { result += (current || 1) * w; current = 0; }
      else current += w;
    } else if (t === "point") {
      result += current; current = 0;
      const ni = tokens.indexOf(t) + 1;
      if (ni < tokens.length && words[tokens[ni]] !== undefined) return result + words[tokens[ni]] / 10;
    } else { const n = parseFloat(t); if (!isNaN(n)) current += n; }
  }
  result += current;
  return result > 0 ? result : null;
}
