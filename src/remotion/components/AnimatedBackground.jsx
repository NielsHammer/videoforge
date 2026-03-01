import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 10 RADICALLY DIFFERENT templates.
 * Each must be INSTANTLY recognizable as a different visual.
 *
 * 1. "grid"        — Green tech grid, finance
 * 2. "particles"   — Floating orbs, connected by lines, AI/tech
 * 3. "topography"  — Topo map contour lines, earth tones
 * 4. "diamond"     — Diagonal diamond lattice, luxury gold
 * 5. "radar"       — Spinning radar sweep, military/data
 * 6. "dna"         — Double helix spiral, health/science
 * 7. "city"        — Skyline silhouette with lit windows, urban
 * 8. "flames"      — Rising ember particles, motivational/fire
 * 9. "ocean"       — Deep underwater caustics + bubbles
 * 10. "stars"      — Starfield warp speed tunnel, space
 */

export const AnimatedBackground = ({ theme = "grid" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  switch (theme) {
    case "particles": return <Particles t={t} />;
    case "topography": return <Topography t={t} />;
    case "diamond": return <Diamond t={t} />;
    case "radar": return <Radar t={t} />;
    case "dna": return <DNA t={t} />;
    case "city": return <City t={t} />;
    case "flames": return <Flames t={t} />;
    case "ocean": return <Ocean t={t} />;
    case "stars": return <Stars t={t} />;
    default: return <Grid t={t} />;
  }
};

// ============================================================
// 1. GRID — Classic tech grid. Green lines, intersection dots.
// ============================================================
const Grid = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "radial-gradient(ellipse at 50% 40%, #061a10 0%, #030d08 50%, #010503 100%)" }} />
    <svg width="1920" height="1080" style={abs}>
      {rng(20).map(i => {
        const y = ((i * 54 + t * 12) % 1200);
        return <line key={`h${i}`} x1="0" y1={y} x2="1920" y2={y} stroke="#22c55e" strokeWidth="1" opacity={0.06 + Math.sin(t * 0.7 + i * 0.4) * 0.03} />;
      })}
      {rng(36).map(i => {
        const x = ((i * 54 + t * 8) % 2000);
        return <line key={`v${i}`} x1={x} y1="0" x2={x} y2="1080" stroke="#22c55e" strokeWidth="1" opacity={0.06 + Math.cos(t * 0.5 + i * 0.3) * 0.03} />;
      })}
      {rng(25).map(i => {
        const x = (i * 77) % 1920, y = (i * 43) % 1080;
        const p = 0.2 + Math.sin(t * 2 + i) * 0.15;
        return <circle key={i} cx={x} cy={y} r={3} fill="#4ade80" opacity={p} />;
      })}
    </svg>
    <Vig />
  </AbsoluteFill>
);

// ============================================================
// 2. PARTICLES — Connected floating nodes. Plexus/neural net.
// ============================================================
const Particles = ({ t }) => {
  const nodes = rng(30).map(i => ({
    x: ((i * 67.3 + Math.sin(t * 0.3 + i * 0.7) * 80) % 1920 + 1920) % 1920,
    y: ((i * 41.7 + Math.cos(t * 0.25 + i * 0.5) * 60) % 1080 + 1080) % 1080,
  }));

  return (
    <AbsoluteFill>
      <div style={{ ...full, background: "radial-gradient(ellipse at 40% 40%, #0a0d1a 0%, #050710 50%, #020308 100%)" }} />
      <svg width="1920" height="1080" style={abs}>
        {nodes.map((a, i) => nodes.slice(i + 1).map((b, j) => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > 250) return null;
          const op = (1 - dist / 250) * 0.15;
          return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#60a5fa" strokeWidth="1" opacity={op} />;
        }))}
        {nodes.map((n, i) => (
          <React.Fragment key={i}>
            <circle cx={n.x} cy={n.y} r={4} fill="#3b82f6" opacity={0.7} />
            <circle cx={n.x} cy={n.y} r={12} fill="#3b82f6" opacity={0.08} />
          </React.Fragment>
        ))}
      </svg>
      <Vig />
    </AbsoluteFill>
  );
};

// ============================================================
// 3. TOPOGRAPHY — Contour map lines. Earth/brown/tan tones.
// ============================================================
const Topography = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "radial-gradient(ellipse at 50% 50%, #1a1510 0%, #0e0c08 50%, #060504 100%)" }} />
    <svg width="1920" height="1080" style={abs}>
      {rng(14).map(i => {
        const baseY = 80 + i * 70;
        const pts = rng(97).map(x => {
          const px = x * 20;
          const py = baseY + Math.sin(px * 0.004 + i * 1.2 + t * 0.15) * (30 + i * 4) + Math.sin(px * 0.007 + i * 0.5) * 15;
          return `${px},${py}`;
        }).join(" ");
        const op = 0.05 + (i % 3 === 0 ? 0.04 : 0);
        return <polyline key={i} points={pts} fill="none" stroke="#b8860b" strokeWidth={i % 3 === 0 ? "1.5" : "0.8"} opacity={op} />;
      })}
      {rng(8).map(i => {
        const cx = 200 + (i * 223) % 1600, cy = 150 + (i * 167) % 800;
        return rng(4).map(r => (
          <ellipse key={`${i}-${r}`} cx={cx} cy={cy} rx={30 + r * 25} ry={20 + r * 18}
            fill="none" stroke="#d4a040" strokeWidth="0.7" opacity={0.04 + Math.sin(t * 0.5 + i + r) * 0.02}
            transform={`rotate(${15 + i * 10}, ${cx}, ${cy})`} />
        ));
      })}
    </svg>
    <Vig />
  </AbsoluteFill>
);

// ============================================================
// 4. DIAMOND — Diagonal lattice pattern. Gold on dark. Luxury.
// ============================================================
const Diamond = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "radial-gradient(ellipse at 50% 40%, #141008 0%, #0a0804 50%, #040302 100%)" }} />
    <svg width="1920" height="1080" style={abs}>
      {rng(15).map(i => rng(12).map(j => {
        const cx = i * 140 - 60 + Math.sin(t * 0.3) * 5;
        const cy = j * 100 - 40 + Math.cos(t * 0.25) * 5;
        const size = 35;
        const pts = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`;
        const op = 0.04 + Math.sin(t * 0.8 + i * 0.5 + j * 0.3) * 0.02;
        return <polygon key={`${i}-${j}`} points={pts} fill="none" stroke="#d4a020" strokeWidth="0.8" opacity={op} />;
      }))}
      {rng(6).map(i => {
        const x = 200 + (i * 301) % 1600, y = 150 + (i * 197) % 800;
        const glow = 0.04 + Math.sin(t * 1.2 + i * 2) * 0.02;
        return <circle key={i} cx={x} cy={y} r={60} fill={`rgba(212,160,32,${glow})`} />;
      })}
    </svg>
    <div style={{ ...full, position: "absolute", background: "linear-gradient(135deg, rgba(212,160,32,0.02), transparent 50%, rgba(212,160,32,0.015))" }} />
    <Vig />
  </AbsoluteFill>
);

// ============================================================
// 5. RADAR — Spinning sweep line + concentric rings. Data/military.
// ============================================================
const Radar = ({ t }) => {
  const angle = (t * 40) % 360;
  const rad = angle * Math.PI / 180;
  const cx = 960, cy = 540;
  return (
    <AbsoluteFill>
      <div style={{ ...full, background: "radial-gradient(ellipse at 50% 50%, #060d08 0%, #030804 50%, #010302 100%)" }} />
      <svg width="1920" height="1080" style={abs}>
        {[150, 250, 380, 520].map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="1" opacity={0.08} />
        ))}
        <line x1={cx} y1={cy} x2={cx + Math.cos(rad) * 550} y2={cy + Math.sin(rad) * 550}
          stroke="#4ade80" strokeWidth="2" opacity={0.5} />
        {/* Sweep trail */}
        {rng(20).map(i => {
          const a = (angle - i * 2) * Math.PI / 180;
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * 550} y2={cy + Math.sin(a) * 550}
            stroke="#22c55e" strokeWidth="1" opacity={0.3 - i * 0.015} />;
        })}
        {/* Blips */}
        {rng(8).map(i => {
          const bAngle = (i * 45 + 20) * Math.PI / 180;
          const bDist = 150 + (i * 47) % 350;
          const bx = cx + Math.cos(bAngle) * bDist, by = cy + Math.sin(bAngle) * bDist;
          const angleDiff = ((angle - i * 45 - 20) % 360 + 360) % 360;
          const visible = angleDiff < 90 ? (1 - angleDiff / 90) * 0.7 : 0;
          return <circle key={i} cx={bx} cy={by} r={4} fill="#4ade80" opacity={visible} />;
        })}
        <line x1={0} y1={cy} x2={1920} y2={cy} stroke="#22c55e" strokeWidth="0.5" opacity={0.05} />
        <line x1={cx} y1={0} x2={cx} y2={1080} stroke="#22c55e" strokeWidth="0.5" opacity={0.05} />
      </svg>
      <Vig />
    </AbsoluteFill>
  );
};

// ============================================================
// 6. DNA — Double helix spiral. Health/science/biotech.
// ============================================================
const DNA = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "radial-gradient(ellipse at 50% 50%, #0a0818 0%, #060410 50%, #020208 100%)" }} />
    <svg width="1920" height="1080" style={abs}>
      {rng(30).map(i => {
        const y = ((i * 40 - t * 40) % 1200 + 1200) % 1200 - 60;
        const phase = y * 0.008 + t * 2;
        const x1 = 960 + Math.sin(phase) * 200;
        const x2 = 960 - Math.sin(phase) * 200;
        const depth = Math.cos(phase);
        const op = 0.15 + depth * 0.1;
        return (
          <React.Fragment key={i}>
            <circle cx={x1} cy={y} r={5} fill="#a78bfa" opacity={op} />
            <circle cx={x2} cy={y} r={5} fill="#f472b6" opacity={op} />
            {i % 3 === 0 && <line x1={x1} y1={y} x2={x2} y2={y} stroke="#818cf8" strokeWidth="1" opacity={op * 0.4} />}
          </React.Fragment>
        );
      })}
      {/* Second helix offset */}
      {rng(30).map(i => {
        const y = ((i * 40 - t * 40 + 20) % 1200 + 1200) % 1200 - 60;
        const phase = y * 0.008 + t * 2 + Math.PI;
        const x1 = 400 + Math.sin(phase) * 120;
        const x2 = 400 - Math.sin(phase) * 120;
        const op = 0.08;
        return (
          <React.Fragment key={`b${i}`}>
            <circle cx={x1} cy={y} r={3} fill="#c084fc" opacity={op} />
            <circle cx={x2} cy={y} r={3} fill="#e879f9" opacity={op} />
          </React.Fragment>
        );
      })}
    </svg>
    <Vig />
  </AbsoluteFill>
);

// ============================================================
// 7. CITY — Skyline silhouette with animated lit windows.
// ============================================================
const City = ({ t }) => {
  const buildings = [
    { x: 0, w: 120, h: 400 }, { x: 110, w: 80, h: 550 }, { x: 180, w: 100, h: 350 },
    { x: 270, w: 60, h: 480 }, { x: 320, w: 140, h: 620 }, { x: 450, w: 90, h: 380 },
    { x: 530, w: 110, h: 500 }, { x: 630, w: 70, h: 440 }, { x: 690, w: 130, h: 580 },
    { x: 810, w: 80, h: 350 }, { x: 880, w: 150, h: 650 }, { x: 1020, w: 90, h: 420 },
    { x: 1100, w: 120, h: 520 }, { x: 1210, w: 70, h: 380 }, { x: 1270, w: 140, h: 600 },
    { x: 1400, w: 100, h: 450 }, { x: 1490, w: 80, h: 560 }, { x: 1560, w: 130, h: 400 },
    { x: 1680, w: 90, h: 480 }, { x: 1760, w: 160, h: 530 },
  ];
  return (
    <AbsoluteFill>
      <div style={{ ...full, background: "linear-gradient(180deg, #06080f 0%, #0c1020 60%, #0f1428 100%)" }} />
      <svg width="1920" height="1080" style={abs}>
        {buildings.map((b, i) => (
          <React.Fragment key={i}>
            <rect x={b.x} y={1080 - b.h} width={b.w} height={b.h} fill="#0a0e18" stroke="#1a2040" strokeWidth="1" />
            {rng(Math.floor(b.h / 30)).map(r => rng(Math.floor(b.w / 20)).map(c => {
              const on = Math.sin(t * 0.5 + i * 3 + r * 7 + c * 11) > 0.2;
              return on ? <rect key={`${r}-${c}`} x={b.x + 6 + c * 20} y={1080 - b.h + 8 + r * 30}
                width="10" height="16" fill="#fbbf24" opacity={0.15 + Math.sin(t * 2 + i + r + c) * 0.08} /> : null;
            }))}
          </React.Fragment>
        ))}
        {/* Moon */}
        <circle cx={1600} cy={120} r={40} fill="#fef3c7" opacity={0.15} />
        <circle cx={1600} cy={120} r={80} fill="#fef3c7" opacity={0.02} />
      </svg>
      <div style={{ ...full, position: "absolute", background: "linear-gradient(180deg, transparent 70%, rgba(15,20,40,0.5) 100%)" }} />
    </AbsoluteFill>
  );
};

// ============================================================
// 8. FLAMES — Rising embers/sparks. Motivational/fire.
// ============================================================
const Flames = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "linear-gradient(180deg, #0a0404 0%, #120606 40%, #1a0808 70%, #200a04 100%)" }} />
    {/* Bottom fire glow */}
    <div style={{ position: "absolute", bottom: 0, left: "10%", width: "80%", height: "40%",
      background: "radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.08), rgba(249,115,22,0.04) 40%, transparent 70%)",
      filter: "blur(40px)" }} />
    <svg width="1920" height="1080" style={abs}>
      {/* Embers rising */}
      {rng(50).map(i => {
        const baseX = (i * 41.3) % 1920;
        const speed = 30 + (i * 7) % 60;
        const y = ((1100 - t * speed - i * 29) % 1300 + 1300) % 1300 - 100;
        const x = baseX + Math.sin(t * 1.5 + i * 0.8) * (20 + i % 15);
        const size = 1.5 + (i % 4) * 0.8;
        const life = Math.max(0, Math.min(1, (1100 - y) / 900));
        const colors = ["#ef4444", "#f97316", "#eab308", "#fbbf24", "#fde68a"];
        return <circle key={i} cx={x} cy={y} r={size * life} fill={colors[i % 5]} opacity={life * 0.6} />;
      })}
      {/* Heat shimmer lines */}
      {rng(5).map(i => {
        const pts = rng(97).map(x => {
          const px = x * 20;
          const py = 900 - i * 60 + Math.sin(px * 0.01 + t * 3 + i) * 8;
          return `${px},${py}`;
        }).join(" ");
        return <polyline key={i} points={pts} fill="none" stroke="#ef4444" strokeWidth="0.5" opacity={0.03} />;
      })}
    </svg>
    <Vig />
  </AbsoluteFill>
);

// ============================================================
// 9. OCEAN — Deep underwater. Caustic light patterns + bubbles.
// ============================================================
const Ocean = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "linear-gradient(180deg, #020a14 0%, #041220 30%, #061828 60%, #082030 100%)" }} />
    {/* Caustic light patterns */}
    <svg width="1920" height="1080" style={abs}>
      {rng(8).map(i => {
        const cx = 200 + (i * 247) % 1600;
        const cy = 100 + (i * 139) % 600;
        const r = 150 + (i % 3) * 80;
        const op = 0.025 + Math.sin(t * 1.5 + i * 1.3) * 0.015;
        return (
          <React.Fragment key={`c${i}`}>
            <ellipse cx={cx + Math.sin(t * 0.4 + i) * 30} cy={cy} rx={r} ry={r * 0.6}
              fill={`rgba(56,189,248,${op})`} />
            <ellipse cx={cx + Math.sin(t * 0.5 + i + 1) * 25} cy={cy + 20} rx={r * 0.7} ry={r * 0.4}
              fill={`rgba(34,211,238,${op * 0.7})`} />
          </React.Fragment>
        );
      })}
      {/* Bubbles rising */}
      {rng(25).map(i => {
        const baseX = (i * 79.3) % 1920;
        const speed = 20 + (i * 5) % 30;
        const y = ((1100 - t * speed - i * 50) % 1300 + 1300) % 1300 - 100;
        const x = baseX + Math.sin(t * 0.8 + i * 0.6) * 15;
        const size = 2 + (i % 5) * 1.5;
        return (
          <React.Fragment key={i}>
            <circle cx={x} cy={y} r={size} fill="none" stroke="rgba(147,197,253,0.15)" strokeWidth="1" />
            <circle cx={x - size * 0.3} cy={y - size * 0.3} r={size * 0.25} fill="rgba(255,255,255,0.1)" />
          </React.Fragment>
        );
      })}
      {/* Light rays from top */}
      {rng(4).map(i => {
        const x = 300 + i * 400;
        const op = 0.015 + Math.sin(t * 0.6 + i * 1.5) * 0.008;
        return <polygon key={`r${i}`} points={`${x},0 ${x - 80},1080 ${x + 80},1080`} fill={`rgba(56,189,248,${op})`} />;
      })}
    </svg>
    <Vig />
  </AbsoluteFill>
);

// ============================================================
// 10. STARS — Warp speed starfield tunnel.
// ============================================================
const Stars = ({ t }) => (
  <AbsoluteFill>
    <div style={{ ...full, background: "radial-gradient(ellipse at 50% 50%, #08060f 0%, #040310 50%, #010108 100%)" }} />
    <svg width="1920" height="1080" style={abs}>
      {rng(80).map(i => {
        const seed = i * 137.508;
        const angle = (seed * 2.4) % (Math.PI * 2);
        const baseSpeed = 0.3 + (i * 0.01);
        const dist = ((t * baseSpeed * 200 + seed * 3) % 1000);
        const x = 960 + Math.cos(angle) * dist;
        const y = 540 + Math.sin(angle) * dist;
        if (x < -20 || x > 1940 || y < -20 || y > 1100) return null;
        const size = Math.min(3, dist / 200);
        const op = Math.min(0.8, dist / 300);
        const streakLen = Math.min(20, dist / 40);
        const dx = Math.cos(angle) * streakLen;
        const dy = Math.sin(angle) * streakLen;
        return (
          <React.Fragment key={i}>
            <line x1={x} y1={y} x2={x - dx} y2={y - dy} stroke="white" strokeWidth={size} opacity={op * 0.6} />
            <circle cx={x} cy={y} r={size * 0.8} fill="white" opacity={op} />
          </React.Fragment>
        );
      })}
      {/* Center glow */}
      <circle cx="960" cy="540" r="60" fill="rgba(167,139,250,0.04)" />
      <circle cx="960" cy="540" r="150" fill="rgba(167,139,250,0.015)" />
    </svg>
    <Vig />
  </AbsoluteFill>
);

// Helpers
const rng = (n) => Array.from({ length: n }, (_, i) => i);
const full = { position: "absolute", width: "100%", height: "100%" };
const abs = { position: "absolute" };
const Vig = () => (
  <div style={{ position: "absolute", width: "100%", height: "100%", background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%)" }} />
);
