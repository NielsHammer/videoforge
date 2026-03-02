import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * AnimatedBackground v26: 20 vibrant animated grid themes.
 * All share the same wavy grid + particles structure with different color palettes.
 * Grid lines are BRIGHT and VISIBLE — this is a key visual element of every video.
 */
export const AnimatedBackground = ({ theme = "blue_grid" }) => {
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
    steel_grey:     { bg: "#0e1014", bg2: "#1c2028", line: "#7788aa", lineB: "#99aacc", dot: "#aabbdd", particle: "#bbccee", glow1: "#8899bb", glow2: "#6677aa" },
    dark_horror:    { bg: "#140204", bg2: "#280408", line: "#881111", lineB: "#aa2222", dot: "#cc3333", particle: "#dd4444", glow1: "#aa0000", glow2: "#660000" },
    aurora:         { bg: "#060c1a", bg2: "#0c1833", line: "#44aa88", lineB: "#66ccaa", dot: "#88eebb", particle: "#aaffdd", glow1: "#22ddaa", glow2: "#6644ff" },
  };

  // Map old theme names to new ones
  const themeMap = {
    blue: "blue_grid", green: "green_matrix", purple: "purple_cosmic", red: "red_energy",
    gold: "gold_luxury", teal: "teal_ocean", city: "blue_grid", grid: "green_matrix",
    particles: "ice_blue", topography: "earth_brown", diamond: "gold_luxury",
    radar: "electric_cyan", dna: "teal_ocean", flames: "orange_fire",
    ocean: "teal_ocean", stars: "purple_cosmic",
  };

  const resolvedTheme = themeMap[theme] || theme;
  const c = palettes[resolvedTheme] || palettes.blue_grid;

  // Grid config — unique per theme
  const gridStyles = {
    blue_grid:      { spacing: 105, waveAmp: 12, waveSpeed: 0.6, particles: 50, majorW: 1.8, minorW: 0.8 },
    green_matrix:   { spacing: 70,  waveAmp: 8,  waveSpeed: 1.2, particles: 70, majorW: 1.2, minorW: 0.5 },
    gold_luxury:    { spacing: 140, waveAmp: 15, waveSpeed: 0.3, particles: 30, majorW: 2.2, minorW: 1.0 },
    red_energy:     { spacing: 90,  waveAmp: 18, waveSpeed: 0.9, particles: 60, majorW: 1.6, minorW: 0.7 },
    purple_cosmic:  { spacing: 120, waveAmp: 14, waveSpeed: 0.45,particles: 55, majorW: 1.5, minorW: 0.6 },
    teal_ocean:     { spacing: 110, waveAmp: 20, waveSpeed: 0.35,particles: 45, majorW: 1.8, minorW: 0.8 },
    orange_fire:    { spacing: 85,  waveAmp: 16, waveSpeed: 1.0, particles: 65, majorW: 1.4, minorW: 0.6 },
    pink_neon:      { spacing: 80,  waveAmp: 10, waveSpeed: 0.8, particles: 60, majorW: 1.3, minorW: 0.5 },
    ice_blue:       { spacing: 60,  waveAmp: 6,  waveSpeed: 0.5, particles: 80, majorW: 1.0, minorW: 0.4 },
    forest_green:   { spacing: 130, waveAmp: 18, waveSpeed: 0.4, particles: 40, majorW: 2.0, minorW: 0.9 },
    sunset_warm:    { spacing: 95,  waveAmp: 14, waveSpeed: 0.7, particles: 50, majorW: 1.6, minorW: 0.7 },
    midnight_blue:  { spacing: 120, waveAmp: 10, waveSpeed: 0.3, particles: 35, majorW: 1.4, minorW: 0.6 },
    electric_cyan:  { spacing: 55,  waveAmp: 5,  waveSpeed: 0.9, particles: 90, majorW: 0.8, minorW: 0.3 },
    earth_brown:    { spacing: 115, waveAmp: 12, waveSpeed: 0.35,particles: 35, majorW: 2.0, minorW: 0.9 },
    blood_red:      { spacing: 100, waveAmp: 22, waveSpeed: 1.1, particles: 55, majorW: 1.5, minorW: 0.6 },
    royal_purple:   { spacing: 125, waveAmp: 10, waveSpeed: 0.3, particles: 40, majorW: 1.8, minorW: 0.8 },
    neon_green:     { spacing: 65,  waveAmp: 7,  waveSpeed: 1.3, particles: 75, majorW: 1.0, minorW: 0.4 },
    rose_gold:      { spacing: 135, waveAmp: 12, waveSpeed: 0.3, particles: 30, majorW: 2.0, minorW: 0.9 },
    steel_grey:     { spacing: 100, waveAmp: 8,  waveSpeed: 0.4, particles: 40, majorW: 1.6, minorW: 0.7 },
    aurora:         { spacing: 110, waveAmp: 16, waveSpeed: 0.5, particles: 55, majorW: 1.6, minorW: 0.7 },
  };

  const gs = gridStyles[resolvedTheme] || gridStyles.blue_grid;
  const spacing = gs.spacing;
  const cols = Math.ceil(1920 / spacing) + 1;
  const rows = Math.ceil(1080 / spacing) + 1;
  const waveAmp = gs.waveAmp;
  const waveSpeed = gs.waveSpeed;

  // Aurora special: shift line colors over time
  const isAurora = resolvedTheme === "aurora";
  const auroraHue = (t * 15) % 360;

  // Build wavy vertical lines
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

  // Build wavy horizontal lines
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

  // Particles — per-theme density
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

  const glowPulse = 0.35 + Math.sin(t * 0.35) * 0.15;

  // For aurora: generate shifting gradient
  const auroraStroke = isAurora
    ? `hsl(${auroraHue}, 70%, 55%)`
    : c.line;
  const auroraStrokeB = isAurora
    ? `hsl(${(auroraHue + 60) % 360}, 70%, 65%)`
    : c.lineB;

  return (
    <AbsoluteFill>
      {/* Deep background gradient */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 35% 40%, ${c.bg2} 0%, ${c.bg} 70%)` }} />

      {/* Grid SVG */}
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        {/* Vertical lines */}
        {vPaths.map((d, i) => {
          const isMajor = i % 3 === 0;
          return (
            <path key={`v${i}`} d={d} fill="none"
              stroke={isMajor ? (isAurora ? auroraStrokeB : c.lineB) : (isAurora ? auroraStroke : c.line)}
              strokeWidth={isMajor ? gs.majorW : gs.minorW}
              opacity={isMajor ? 0.55 : 0.28} />
          );
        })}

        {/* Horizontal lines */}
        {hPaths.map((d, i) => {
          const isMajor = i % 3 === 0;
          return (
            <path key={`h${i}`} d={d} fill="none"
              stroke={isMajor ? (isAurora ? auroraStrokeB : c.lineB) : (isAurora ? auroraStroke : c.line)}
              strokeWidth={isMajor ? gs.majorW : gs.minorW}
              opacity={isMajor ? 0.55 : 0.28} />
          );
        })}

        {/* Intersection dots */}
        {Array.from({ length: (cols + 1) * (rows + 1) }, (_, idx) => {
          const col = idx % (cols + 1);
          const row = Math.floor(idx / (cols + 1));
          const bx = col * spacing + Math.sin(row * spacing * 0.013 + t * waveSpeed + col * 0.55) * waveAmp;
          const by = row * spacing + Math.sin(col * spacing * 0.013 + t * waveSpeed * 1.15 + row * 0.55) * waveAmp;
          const isMajor = col % 3 === 0 && row % 3 === 0;
          return (
            <circle key={`d${idx}`} cx={bx} cy={by}
              r={isMajor ? 3.5 : 1.8}
              fill={isAurora ? `hsl(${(auroraHue + idx * 3) % 360}, 70%, 70%)` : c.dot}
              opacity={isMajor ? 0.65 : 0.35} />
          );
        })}

        {/* Floating particles */}
        {particles.map((pt, i) => (
          <circle key={`p${i}`} cx={pt.x} cy={pt.y} r={pt.r}
            fill={isAurora ? `hsl(${(auroraHue + i * 8) % 360}, 80%, 75%)` : c.particle}
            opacity={pt.opacity} />
        ))}
      </svg>

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

      {/* Third accent glow — center-ish for more energy */}
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
