import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, random } from "remotion";

/**
 * AnimatedBackground v31: 4 VISUAL STYLES × 21 color themes = massive variety.
 * 
 * Styles (auto-selected per video, deterministic from theme+seed):
 *   1. "grid"    — Wavy grid lines + intersection dots + floating particles (original)
 *   2. "hex"     — Honeycomb hexagon grid with pulsing glow nodes
 *   3. "circuit" — Circuit board traces with right-angle paths + data nodes
 *   4. "orbs"    — Large floating gradient orbs + tiny star particles
 * 
 * All styles use the same color palette per theme, so theme identity stays consistent.
 * The style changes so videos don't all look the same.
 */
export const AnimatedBackground = ({ theme = "blue_grid", bgStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const palettes = {
    blue_grid:      { bg: "#060c24", bg2: "#0c1845", line: "#3366dd", lineB: "#5588ff", dot: "#77aaff", particle: "#99ccff", glow1: "#3366ff", glow2: "#6644ff" },
    green_matrix:   { bg: "#041a0a", bg2: "#083316", line: "#22cc55", lineB: "#44ee77", dot: "#66ff99", particle: "#88ffbb", glow1: "#22dd66", glow2: "#00ff88" },
    gold_luxury:    { bg: "#1a1408", bg2: "#33280d", line: "#ccaa33", lineB: "#eedd55", dot: "#ffee77", particle: "#ffdd88", glow1: "#ddbb33", glow2: "#ffcc00" },
    red_energy:     { bg: "#1a0608", bg2: "#330c10", line: "#dd3344", lineB: "#ff5566", dot: "#ff7788", particle: "#ff9999", glow1: "#ff3344", glow2: "#ff6633" },
    purple_cosmic:  { bg: "#120622", bg2: "#220c44", line: "#8844dd", lineB: "#aa66ff", dot: "#cc88ff", particle: "#dd99ff", glow1: "#9944ff", glow2: "#ff44cc" },
    teal_ocean:     { bg: "#041a1a", bg2: "#083333", line: "#22bbcc", lineB: "#44ddee", dot: "#66eeff", particle: "#88ffff", glow1: "#22dddd", glow2: "#00eedd" },
    orange_fire:    { bg: "#1a0e04", bg2: "#331c08", line: "#dd7722", lineB: "#ff9944", dot: "#ffbb66", particle: "#ffcc88", glow1: "#ff8833", glow2: "#ff6600" },
    pink_neon:      { bg: "#1a0418", bg2: "#330830", line: "#dd44aa", lineB: "#ff66cc", dot: "#ff88dd", particle: "#ffaaee", glow1: "#ff44bb", glow2: "#ff22ff" },
    ice_blue:       { bg: "#081822", bg2: "#0c2840", line: "#44aadd", lineB: "#66ccff", dot: "#88ddff", particle: "#aaeeff", glow1: "#44bbff", glow2: "#22ddff" },
    forest_green:   { bg: "#0a1a0a", bg2: "#143314", line: "#33aa44", lineB: "#55cc66", dot: "#77ee88", particle: "#99ffaa", glow1: "#44cc55", glow2: "#22ee88" },
    sunset_warm:    { bg: "#1a0c06", bg2: "#33180c", line: "#dd6633", lineB: "#ff8855", dot: "#ffaa77", particle: "#ffcc99", glow1: "#ff7744", glow2: "#ff4422" },
    midnight_blue:  { bg: "#040810", bg2: "#081020", line: "#2244aa", lineB: "#3366cc", dot: "#4488dd", particle: "#6699ee", glow1: "#2255cc", glow2: "#4444aa" },
    electric_cyan:  { bg: "#041818", bg2: "#083030", line: "#00ddee", lineB: "#22ffff", dot: "#66ffff", particle: "#99ffff", glow1: "#00eeff", glow2: "#00ffdd" },
    earth_brown:    { bg: "#14100a", bg2: "#28200f", line: "#aa7733", lineB: "#cc9955", dot: "#ddaa66", particle: "#eebb88", glow1: "#bb8844", glow2: "#cc6622" },
    blood_red:      { bg: "#140406", bg2: "#28080c", line: "#aa2233", lineB: "#cc3344", dot: "#dd4455", particle: "#ee6677", glow1: "#cc2233", glow2: "#aa0022" },
    royal_purple:   { bg: "#100820", bg2: "#201040", line: "#7733cc", lineB: "#9955ee", dot: "#bb77ff", particle: "#cc99ff", glow1: "#8844dd", glow2: "#aa33ff" },
    neon_green:     { bg: "#040a04", bg2: "#081408", line: "#00ff44", lineB: "#33ff66", dot: "#66ff88", particle: "#88ffaa", glow1: "#00ff55", glow2: "#44ff00" },
    rose_gold:      { bg: "#1a1012", bg2: "#332024", line: "#cc7788", lineB: "#ee99aa", dot: "#ffaabb", particle: "#ffccdd", glow1: "#dd8899", glow2: "#eeaa88" },
    steel_grey:     { bg: "#0e1014", bg2: "#1c2028", line: "#7788aa", lineB: "#99aacc", dot: "#aabbdd", particle: "#bbccee", glow1: "#ccddff", glow2: "#6677aa" },
    dark_horror:    { bg: "#140204", bg2: "#280408", line: "#881111", lineB: "#aa2222", dot: "#cc3333", particle: "#dd4444", glow1: "#aa0000", glow2: "#660000" },
    aurora:         { bg: "#060c1a", bg2: "#0c1833", line: "#44aa88", lineB: "#66ccaa", dot: "#88eebb", particle: "#aaffdd", glow1: "#22ddaa", glow2: "#6644ff" },
  };

  const themeMap = {
    blue: "blue_grid", green: "green_matrix", purple: "purple_cosmic", red: "red_energy",
    gold: "gold_luxury", teal: "teal_ocean", city: "blue_grid", grid: "green_matrix",
    particles: "ice_blue", topography: "earth_brown", diamond: "gold_luxury",
    radar: "electric_cyan", dna: "teal_ocean", flames: "orange_fire",
    ocean: "teal_ocean", stars: "purple_cosmic",
  };

  const resolvedTheme = themeMap[theme] || theme;
  const c = palettes[resolvedTheme] || palettes.blue_grid;

  // Pick visual style — deterministic per video (based on theme string hash)
  const styles = ["grid", "hex", "circuit", "orbs"];
  const selectedStyle = bgStyle || styles[Math.abs(hashStr(resolvedTheme + frame.toString().slice(0, 1))) % 4];
  // Use random seed from Remotion for consistent style per render
  const styleIdx = bgStyle
    ? styles.indexOf(bgStyle)
    : Math.floor(random("bg-style-" + resolvedTheme) * 4);
  const style = styles[styleIdx >= 0 ? styleIdx : 0];

  const isAurora = resolvedTheme === "aurora";
  const auroraHue = (t * 15) % 360;
  const glowPulse = 0.35 + Math.sin(t * 0.35) * 0.15;

  return (
    <AbsoluteFill>
      {/* Deep background gradient */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 35% 40%, ${c.bg2} 0%, ${c.bg} 70%)` }} />

      {/* Render chosen style */}
      {style === "grid" && <WavyGrid c={c} t={t} resolvedTheme={resolvedTheme} isAurora={isAurora} auroraHue={auroraHue} />}
      {style === "hex" && <HexGrid c={c} t={t} isAurora={isAurora} auroraHue={auroraHue} />}
      {style === "circuit" && <CircuitBoard c={c} t={t} isAurora={isAurora} auroraHue={auroraHue} />}
      {style === "orbs" && <FloatingOrbs c={c} t={t} isAurora={isAurora} auroraHue={auroraHue} />}

      {/* Corner glow accents */}
      <div style={{
        position: "absolute", top: -180, right: -100,
        width: 550, height: 550, borderRadius: "50%",
        background: `radial-gradient(circle, ${c.glow1}55 0%, transparent 65%)`,
        opacity: glowPulse,
      }} />
      <div style={{
        position: "absolute", bottom: -180, left: -100,
        width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${c.glow2}44 0%, transparent 65%)`,
        opacity: glowPulse * 0.85,
      }} />
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${c.glow1}15 0%, transparent 60%)`,
        opacity: glowPulse * 0.5,
      }} />

      {/* Soft vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(3,5,15,0.55) 100%)",
      }} />
    </AbsoluteFill>
  );
};

// Simple string hash for deterministic style selection
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ═══════════════════════════════════════════
// STYLE 1: WAVY GRID (original v26 style)
// ═══════════════════════════════════════════
const gridStyles = {
  blue_grid: { spacing: 105, waveAmp: 12, waveSpeed: 0.6, particles: 50, majorW: 1.8, minorW: 0.8 },
  green_matrix: { spacing: 70, waveAmp: 8, waveSpeed: 1.2, particles: 70, majorW: 1.2, minorW: 0.5 },
  gold_luxury: { spacing: 140, waveAmp: 15, waveSpeed: 0.3, particles: 30, majorW: 2.2, minorW: 1.0 },
  red_energy: { spacing: 90, waveAmp: 18, waveSpeed: 0.9, particles: 60, majorW: 1.6, minorW: 0.7 },
  purple_cosmic: { spacing: 120, waveAmp: 14, waveSpeed: 0.45, particles: 55, majorW: 1.5, minorW: 0.6 },
  teal_ocean: { spacing: 110, waveAmp: 20, waveSpeed: 0.35, particles: 45, majorW: 1.8, minorW: 0.8 },
  orange_fire: { spacing: 85, waveAmp: 16, waveSpeed: 1.0, particles: 65, majorW: 1.4, minorW: 0.6 },
  pink_neon: { spacing: 80, waveAmp: 10, waveSpeed: 0.8, particles: 60, majorW: 1.3, minorW: 0.5 },
  ice_blue: { spacing: 60, waveAmp: 6, waveSpeed: 0.5, particles: 80, majorW: 1.0, minorW: 0.4 },
  forest_green: { spacing: 130, waveAmp: 18, waveSpeed: 0.4, particles: 40, majorW: 2.0, minorW: 0.9 },
  sunset_warm: { spacing: 95, waveAmp: 14, waveSpeed: 0.7, particles: 50, majorW: 1.6, minorW: 0.7 },
  midnight_blue: { spacing: 120, waveAmp: 10, waveSpeed: 0.3, particles: 35, majorW: 1.4, minorW: 0.6 },
  electric_cyan: { spacing: 55, waveAmp: 5, waveSpeed: 0.9, particles: 90, majorW: 0.8, minorW: 0.3 },
  earth_brown: { spacing: 115, waveAmp: 12, waveSpeed: 0.35, particles: 35, majorW: 2.0, minorW: 0.9 },
  blood_red: { spacing: 100, waveAmp: 22, waveSpeed: 1.1, particles: 55, majorW: 1.5, minorW: 0.6 },
  royal_purple: { spacing: 125, waveAmp: 10, waveSpeed: 0.3, particles: 40, majorW: 1.8, minorW: 0.8 },
  neon_green: { spacing: 65, waveAmp: 7, waveSpeed: 1.3, particles: 75, majorW: 1.0, minorW: 0.4 },
  rose_gold: { spacing: 135, waveAmp: 12, waveSpeed: 0.3, particles: 30, majorW: 2.0, minorW: 0.9 },
  steel_grey: { spacing: 100, waveAmp: 8, waveSpeed: 0.4, particles: 40, majorW: 1.6, minorW: 0.7 },
  dark_horror: { spacing: 100, waveAmp: 22, waveSpeed: 0.8, particles: 40, majorW: 1.5, minorW: 0.6 },
  aurora: { spacing: 110, waveAmp: 16, waveSpeed: 0.5, particles: 55, majorW: 1.6, minorW: 0.7 },
};

const WavyGrid = ({ c, t, resolvedTheme, isAurora, auroraHue }) => {
  const gs = gridStyles[resolvedTheme] || gridStyles.blue_grid;
  const { spacing, waveAmp, waveSpeed, majorW, minorW } = gs;
  const cols = Math.ceil(1920 / spacing) + 1;
  const rows = Math.ceil(1080 / spacing) + 1;

  const vPaths = [];
  for (let col = 0; col <= cols; col++) {
    const baseX = col * spacing;
    let d = "";
    for (let y = 0; y <= 1100; y += 12) {
      const wx = baseX + Math.sin(y * 0.013 + t * waveSpeed + col * 0.55) * waveAmp;
      d += y === 0 ? `M ${wx} ${y}` : ` L ${wx} ${y}`;
    }
    vPaths.push(d);
  }

  const hPaths = [];
  for (let row = 0; row <= rows; row++) {
    const baseY = row * spacing;
    let d = "";
    for (let x = 0; x <= 2000; x += 12) {
      const wy = baseY + Math.sin(x * 0.013 + t * waveSpeed * 1.15 + row * 0.55) * waveAmp;
      d += x === 0 ? `M ${x} ${wy}` : ` L ${x} ${wy}`;
    }
    hPaths.push(d);
  }

  const particles = [];
  for (let i = 0; i < gs.particles; i++) {
    const seed = i * 137.508;
    const bx = (seed * 7.3) % 1920;
    const by = (seed * 11.7) % 1080;
    const spd = 0.25 + (i % 6) * 0.1;
    const sz = 1.5 + (i % 5) * 0.8;
    const px = (bx + t * spd * 20 + Math.sin(t * 0.4 + i) * 30) % 2020 - 50;
    const py = (by + Math.cos(t * 0.25 + i * 0.7) * 25 + t * spd * 8) % 1180 - 50;
    const op = 0.35 + Math.sin(t * 1.2 + i * 2) * 0.25;
    particles.push({ x: px, y: py, r: sz, opacity: Math.max(0.1, op) });
  }

  const auroraStroke = isAurora ? `hsl(${auroraHue}, 70%, 55%)` : c.line;
  const auroraStrokeB = isAurora ? `hsl(${(auroraHue + 60) % 360}, 70%, 65%)` : c.lineB;

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {vPaths.map((d, i) => {
        const isMajor = i % 3 === 0;
        return <path key={`v${i}`} d={d} fill="none" stroke={isMajor ? auroraStrokeB : auroraStroke} strokeWidth={isMajor ? majorW : minorW} opacity={isMajor ? 0.55 : 0.28} />;
      })}
      {hPaths.map((d, i) => {
        const isMajor = i % 3 === 0;
        return <path key={`h${i}`} d={d} fill="none" stroke={isMajor ? auroraStrokeB : auroraStroke} strokeWidth={isMajor ? majorW : minorW} opacity={isMajor ? 0.55 : 0.28} />;
      })}
      {Array.from({ length: (cols + 1) * (rows + 1) }, (_, idx) => {
        const col2 = idx % (cols + 1);
        const row2 = Math.floor(idx / (cols + 1));
        const bx = col2 * spacing + Math.sin(row2 * spacing * 0.013 + t * waveSpeed + col2 * 0.55) * waveAmp;
        const by = row2 * spacing + Math.sin(col2 * spacing * 0.013 + t * waveSpeed * 1.15 + row2 * 0.55) * waveAmp;
        const isMajor = col2 % 3 === 0 && row2 % 3 === 0;
        return <circle key={`d${idx}`} cx={bx} cy={by} r={isMajor ? 3.5 : 1.8} fill={isAurora ? `hsl(${(auroraHue + idx * 3) % 360}, 70%, 70%)` : c.dot} opacity={isMajor ? 0.65 : 0.35} />;
      })}
      {particles.map((pt, i) => (
        <circle key={`p${i}`} cx={pt.x} cy={pt.y} r={pt.r} fill={isAurora ? `hsl(${(auroraHue + i * 8) % 360}, 80%, 75%)` : c.particle} opacity={pt.opacity} />
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════
// STYLE 2: HEX GRID — honeycomb pattern
// ═══════════════════════════════════════════
const HexGrid = ({ c, t, isAurora, auroraHue }) => {
  const hexSize = 65;
  const hexH = hexSize * Math.sqrt(3);
  const cols = Math.ceil(1920 / (hexSize * 1.5)) + 2;
  const rows = Math.ceil(1080 / hexH) + 2;

  const hexes = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * hexSize * 1.5;
      const cy = row * hexH + (col % 2 === 1 ? hexH / 2 : 0);
      const pulse = Math.sin(t * 0.5 + col * 0.3 + row * 0.4) * 0.3;
      const opacity = 0.15 + Math.max(0, pulse) * 0.35;
      hexes.push({ cx, cy, opacity });
    }
  }

  // Floating particles
  const particles = [];
  for (let i = 0; i < 45; i++) {
    const seed = i * 173.13;
    const bx = (seed * 5.7) % 1920;
    const by = (seed * 9.3) % 1080;
    const px = (bx + t * 12 + Math.sin(t * 0.3 + i) * 40) % 2020 - 50;
    const py = (by + Math.cos(t * 0.2 + i * 0.5) * 30 + t * 6) % 1180 - 50;
    const op = 0.3 + Math.sin(t * 0.8 + i * 1.5) * 0.2;
    particles.push({ x: px, y: py, r: 2 + (i % 4) * 0.6, opacity: Math.max(0.1, op) });
  }

  const hexPath = (cx, cy, size) => {
    const pts = [];
    for (let a = 0; a < 6; a++) {
      const angle = (Math.PI / 3) * a - Math.PI / 6;
      pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
    }
    return `M ${pts.join(" L ")} Z`;
  };

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {hexes.map((h, i) => (
        <path key={`hex${i}`} d={hexPath(h.cx, h.cy, hexSize * 0.92)}
          fill="none"
          stroke={isAurora ? `hsl(${(auroraHue + i * 2) % 360}, 70%, 55%)` : c.lineB}
          strokeWidth={h.opacity > 0.35 ? 1.8 : 1.0}
          opacity={h.opacity} />
      ))}
      {/* Glowing nodes at bright hexes */}
      {hexes.filter(h => h.opacity > 0.35).map((h, i) => (
        <circle key={`gn${i}`} cx={h.cx} cy={h.cy} r={4}
          fill={isAurora ? `hsl(${(auroraHue + i * 5) % 360}, 80%, 70%)` : c.dot}
          opacity={h.opacity * 1.2} />
      ))}
      {particles.map((pt, i) => (
        <circle key={`p${i}`} cx={pt.x} cy={pt.y} r={pt.r}
          fill={isAurora ? `hsl(${(auroraHue + i * 8) % 360}, 80%, 75%)` : c.particle}
          opacity={pt.opacity} />
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════
// STYLE 3: CIRCUIT BOARD — tech traces
// ═══════════════════════════════════════════
const CircuitBoard = ({ c, t, isAurora, auroraHue }) => {
  // Generate deterministic circuit traces
  const traces = [];
  const nodeCount = 35;
  for (let i = 0; i < nodeCount; i++) {
    const seed = i * 197.37;
    const x1 = (seed * 3.7) % 1920;
    const y1 = (seed * 7.1) % 1080;
    // Right-angle path to next node
    const x2 = (x1 + 80 + (i % 5) * 60) % 1920;
    const y2 = y1;
    const x3 = x2;
    const y3 = (y1 + 60 + (i % 4) * 50) % 1080;
    const pulsePos = (t * 0.3 + i * 0.15) % 1;
    traces.push({ x1, y1, x2, y2, x3, y3, pulsePos });
  }

  // Data flow particles traveling along traces
  const dataParticles = [];
  for (let i = 0; i < 20; i++) {
    const trace = traces[i % traces.length];
    const progress = (t * 0.15 + i * 0.08) % 1;
    let px, py;
    if (progress < 0.5) {
      const p = progress * 2;
      px = trace.x1 + (trace.x2 - trace.x1) * p;
      py = trace.y1 + (trace.y2 - trace.y1) * p;
    } else {
      const p = (progress - 0.5) * 2;
      px = trace.x2 + (trace.x3 - trace.x2) * p;
      py = trace.y2 + (trace.y3 - trace.y2) * p;
    }
    dataParticles.push({ x: px, y: py });
  }

  // Extra floating particles
  const particles = [];
  for (let i = 0; i < 50; i++) {
    const seed = i * 157.29;
    const px = (seed * 4.3 + t * 8) % 2020 - 50;
    const py = (seed * 8.1 + Math.sin(t * 0.3 + i) * 20) % 1180 - 50;
    const op = 0.2 + Math.sin(t * 0.6 + i) * 0.15;
    particles.push({ x: px, y: py, r: 1.2 + (i % 3) * 0.5, opacity: Math.max(0.08, op) });
  }

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {/* Trace paths */}
      {traces.map((tr, i) => {
        const opacity = 0.2 + Math.sin(t * 0.4 + i * 0.5) * 0.15;
        return (
          <g key={`tr${i}`}>
            <path d={`M ${tr.x1} ${tr.y1} L ${tr.x2} ${tr.y2} L ${tr.x3} ${tr.y3}`}
              fill="none"
              stroke={isAurora ? `hsl(${(auroraHue + i * 4) % 360}, 60%, 50%)` : c.line}
              strokeWidth={1.2}
              opacity={opacity} />
            {/* Node circles at endpoints */}
            <circle cx={tr.x1} cy={tr.y1} r={3} fill={c.dot} opacity={opacity * 1.5} />
            <circle cx={tr.x3} cy={tr.y3} r={2.5} fill={c.dot} opacity={opacity * 1.2} />
          </g>
        );
      })}
      {/* Data flow dots */}
      {dataParticles.map((dp, i) => (
        <circle key={`dp${i}`} cx={dp.x} cy={dp.y} r={3.5}
          fill={isAurora ? `hsl(${(auroraHue + i * 10) % 360}, 80%, 70%)` : c.lineB}
          opacity={0.7} />
      ))}
      {/* Ambient particles */}
      {particles.map((pt, i) => (
        <circle key={`p${i}`} cx={pt.x} cy={pt.y} r={pt.r}
          fill={c.particle} opacity={pt.opacity} />
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════
// STYLE 4: FLOATING ORBS — dreamy gradient blobs
// ═══════════════════════════════════════════
const FloatingOrbs = ({ c, t, isAurora, auroraHue }) => {
  const orbs = [];
  for (let i = 0; i < 8; i++) {
    const seed = i * 211.7;
    const baseX = (seed * 3.1) % 1920;
    const baseY = (seed * 5.9) % 1080;
    const size = 180 + (i % 4) * 80;
    const x = baseX + Math.sin(t * 0.15 + i * 1.2) * 120;
    const y = baseY + Math.cos(t * 0.12 + i * 0.8) * 80;
    const opacity = 0.12 + Math.sin(t * 0.25 + i * 0.9) * 0.08;
    orbs.push({ x, y, size, opacity: Math.max(0.05, opacity), color: i % 2 === 0 ? c.glow1 : c.glow2 });
  }

  // Tiny star particles
  const stars = [];
  for (let i = 0; i < 70; i++) {
    const seed = i * 131.07;
    const bx = (seed * 6.3) % 1920;
    const by = (seed * 10.1) % 1080;
    const px = (bx + Math.sin(t * 0.2 + i * 0.4) * 15) % 1920;
    const py = (by + Math.cos(t * 0.15 + i * 0.6) * 12) % 1080;
    const twinkle = 0.15 + Math.sin(t * 2.0 + i * 3.7) * 0.35;
    stars.push({ x: px, y: py, r: 1.0 + (i % 3) * 0.6, opacity: Math.max(0.05, twinkle) });
  }

  // Connecting lines between nearby orbs
  const connections = [];
  for (let i = 0; i < orbs.length; i++) {
    for (let j = i + 1; j < orbs.length; j++) {
      const dx = orbs[i].x - orbs[j].x;
      const dy = orbs[i].y - orbs[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 500) {
        connections.push({ x1: orbs[i].x, y1: orbs[i].y, x2: orbs[j].x, y2: orbs[j].y, opacity: (1 - dist / 500) * 0.15 });
      }
    }
  }

  return (
    <>
      {/* Gradient orbs as divs for blur effect */}
      {orbs.map((orb, i) => (
        <div key={`orb${i}`} style={{
          position: "absolute",
          left: orb.x - orb.size / 2,
          top: orb.y - orb.size / 2,
          width: orb.size,
          height: orb.size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${isAurora ? `hsl(${(auroraHue + i * 40) % 360}, 70%, 50%)` : orb.color}88 0%, transparent 65%)`,
          opacity: orb.opacity,
          filter: "blur(30px)",
        }} />
      ))}
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        {/* Connecting lines */}
        {connections.map((cn, i) => (
          <line key={`cn${i}`} x1={cn.x1} y1={cn.y1} x2={cn.x2} y2={cn.y2}
            stroke={c.line} strokeWidth={0.8} opacity={cn.opacity} />
        ))}
        {/* Star particles */}
        {stars.map((st, i) => (
          <circle key={`s${i}`} cx={st.x} cy={st.y} r={st.r}
            fill={isAurora ? `hsl(${(auroraHue + i * 6) % 360}, 80%, 80%)` : c.particle}
            opacity={st.opacity} />
        ))}
      </svg>
    </>
  );
};
