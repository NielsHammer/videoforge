/**
 * THEME CONFIGS — Complete visual identity per template.
 * Controls: background, subtitles, section breaks, numbers, comparisons, text flash, overlays.
 * 
 * Every component reads from the active theme to style itself.
 */

export const THEMES = {
  // ── FINANCE ─────────────────────────────────────
  grid: {
    name: "Tech Grid",
    subtitle: {
      bg: "rgba(8, 20, 12, 0.92)",
      border: "1px solid rgba(52, 211, 153, 0.2)",
      color: "#ffffff",
      accent: "#4ade80",
      font: "Helvetica Neue, Arial, sans-serif",
      style: "italic",
      radius: 10,
    },
    section: {
      numberColor: "#4ade80",
      titleColor: "#ffffff",
      glowColor: "rgba(52, 211, 153, 0.15)",
      dividerColor: "#34d399",
    },
    number: {
      gradient: "linear-gradient(180deg, #ffffff, #4ade80)",
      labelColor: "#7dd3a0",
      glowRgb: "52,211,153",
    },
    comparison: {
      barColors: ["#4ade80", "#3b82f6", "#f59e0b", "#ef4444"],
      labelColor: "#e2e8f0",
      trackColor: "rgba(52, 211, 153, 0.08)",
    },
    textFlash: {
      color: "#ffffff",
      shadowColor: "rgba(52, 211, 153, 0.15)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.55)",
      topBar: "rgba(52, 211, 153, 0.15)",
    },
  },

  // ── AI / TECH ──────────────────────────────────
  particles: {
    name: "Neural Net",
    subtitle: {
      bg: "rgba(10, 10, 30, 0.9)",
      border: "1px solid rgba(96, 165, 250, 0.15)",
      color: "#e0e7ff",
      accent: "#60a5fa",
      font: "'SF Mono', 'Fira Code', monospace",
      style: "normal",
      radius: 4,
    },
    section: {
      numberColor: "#60a5fa",
      titleColor: "#c7d2fe",
      glowColor: "rgba(96, 165, 250, 0.12)",
      dividerColor: "#3b82f6",
    },
    number: {
      gradient: "linear-gradient(180deg, #c7d2fe, #3b82f6)",
      labelColor: "#93a4cc",
      glowRgb: "96,165,250",
    },
    comparison: {
      barColors: ["#60a5fa", "#a78bfa", "#34d399", "#f472b6"],
      labelColor: "#c7d2fe",
      trackColor: "rgba(96, 165, 250, 0.08)",
    },
    textFlash: {
      color: "#c7d2fe",
      shadowColor: "rgba(96, 165, 250, 0.2)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.6)",
      topBar: "rgba(96, 165, 250, 0.12)",
    },
  },

  // ── NATURE / TRAVEL ────────────────────────────
  topography: {
    name: "Terrain Map",
    subtitle: {
      bg: "rgba(20, 16, 10, 0.92)",
      border: "1px solid rgba(180, 130, 50, 0.2)",
      color: "#fef3c7",
      accent: "#d4a040",
      font: "Georgia, 'Times New Roman', serif",
      style: "normal",
      radius: 2,
    },
    section: {
      numberColor: "#d4a040",
      titleColor: "#fef3c7",
      glowColor: "rgba(180, 130, 50, 0.12)",
      dividerColor: "#b8860b",
    },
    number: {
      gradient: "linear-gradient(180deg, #fef3c7, #b8860b)",
      labelColor: "#c8a860",
      glowRgb: "180,130,50",
    },
    comparison: {
      barColors: ["#d4a040", "#a3723a", "#7c5832", "#b8860b"],
      labelColor: "#fef3c7",
      trackColor: "rgba(180, 130, 50, 0.1)",
    },
    textFlash: {
      color: "#fef3c7",
      shadowColor: "rgba(180, 130, 50, 0.15)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.5)",
      topBar: "rgba(180, 130, 50, 0.1)",
    },
  },

  // ── LUXURY / WEALTH ────────────────────────────
  diamond: {
    name: "Gold Luxury",
    subtitle: {
      bg: "rgba(15, 12, 5, 0.95)",
      border: "1px solid rgba(212, 175, 55, 0.25)",
      color: "#fef9ef",
      accent: "#d4af37",
      font: "'Didot', 'Bodoni MT', 'Times New Roman', serif",
      style: "normal",
      radius: 0,
    },
    section: {
      numberColor: "#d4af37",
      titleColor: "#fef9ef",
      glowColor: "rgba(212, 175, 55, 0.15)",
      dividerColor: "#d4af37",
    },
    number: {
      gradient: "linear-gradient(180deg, #fef9ef, #d4af37)",
      labelColor: "#c4a850",
      glowRgb: "212,175,55",
    },
    comparison: {
      barColors: ["#d4af37", "#c9a227", "#b8931f", "#a68417"],
      labelColor: "#fef9ef",
      trackColor: "rgba(212, 175, 55, 0.08)",
    },
    textFlash: {
      color: "#fef9ef",
      shadowColor: "rgba(212, 175, 55, 0.2)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.5)",
      topBar: "rgba(212, 175, 55, 0.15)",
    },
  },

  // ── CRYPTO / DATA ──────────────────────────────
  radar: {
    name: "Radar Sweep",
    subtitle: {
      bg: "rgba(5, 15, 8, 0.92)",
      border: "1px solid rgba(74, 222, 128, 0.2)",
      color: "#bbf7d0",
      accent: "#4ade80",
      font: "'Courier New', 'SF Mono', monospace",
      style: "normal",
      radius: 0,
    },
    section: {
      numberColor: "#4ade80",
      titleColor: "#bbf7d0",
      glowColor: "rgba(74, 222, 128, 0.12)",
      dividerColor: "#22c55e",
    },
    number: {
      gradient: "linear-gradient(180deg, #bbf7d0, #22c55e)",
      labelColor: "#6ee7a0",
      glowRgb: "74,222,128",
    },
    comparison: {
      barColors: ["#4ade80", "#22c55e", "#16a34a", "#15803d"],
      labelColor: "#bbf7d0",
      trackColor: "rgba(74, 222, 128, 0.06)",
    },
    textFlash: {
      color: "#bbf7d0",
      shadowColor: "rgba(74, 222, 128, 0.15)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.5)",
      topBar: "rgba(74, 222, 128, 0.1)",
    },
  },

  // ── HEALTH / SCIENCE ───────────────────────────
  dna: {
    name: "DNA Helix",
    subtitle: {
      bg: "rgba(12, 8, 25, 0.92)",
      border: "1px solid rgba(167, 139, 250, 0.2)",
      color: "#e0e0ff",
      accent: "#a78bfa",
      font: "Helvetica Neue, Arial, sans-serif",
      style: "normal",
      radius: 16,
    },
    section: {
      numberColor: "#a78bfa",
      titleColor: "#e0e0ff",
      glowColor: "rgba(167, 139, 250, 0.15)",
      dividerColor: "#8b5cf6",
    },
    number: {
      gradient: "linear-gradient(180deg, #e0e0ff, #8b5cf6)",
      labelColor: "#b4a0dc",
      glowRgb: "167,139,250",
    },
    comparison: {
      barColors: ["#a78bfa", "#c084fc", "#f472b6", "#818cf8"],
      labelColor: "#e0e0ff",
      trackColor: "rgba(167, 139, 250, 0.08)",
    },
    textFlash: {
      color: "#e0e0ff",
      shadowColor: "rgba(167, 139, 250, 0.2)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.55)",
      topBar: "rgba(167, 139, 250, 0.12)",
    },
  },

  // ── URBAN / REAL ESTATE ────────────────────────
  city: {
    name: "City Skyline",
    subtitle: {
      bg: "rgba(10, 12, 25, 0.9)",
      border: "1px solid rgba(251, 191, 36, 0.15)",
      color: "#fef3c7",
      accent: "#fbbf24",
      font: "Helvetica Neue, Arial, sans-serif",
      style: "italic",
      radius: 6,
    },
    section: {
      numberColor: "#fbbf24",
      titleColor: "#fef3c7",
      glowColor: "rgba(251, 191, 36, 0.12)",
      dividerColor: "#f59e0b",
    },
    number: {
      gradient: "linear-gradient(180deg, #fef3c7, #f59e0b)",
      labelColor: "#d4a44a",
      glowRgb: "251,191,36",
    },
    comparison: {
      barColors: ["#fbbf24", "#f59e0b", "#3b82f6", "#ef4444"],
      labelColor: "#fef3c7",
      trackColor: "rgba(251, 191, 36, 0.06)",
    },
    textFlash: {
      color: "#fef3c7",
      shadowColor: "rgba(251, 191, 36, 0.15)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.5)",
      topBar: "rgba(251, 191, 36, 0.1)",
    },
  },

  // ── MOTIVATIONAL ───────────────────────────────
  flames: {
    name: "Fire Embers",
    subtitle: {
      bg: "rgba(25, 8, 5, 0.92)",
      border: "1px solid rgba(239, 68, 68, 0.2)",
      color: "#fef2f2",
      accent: "#ef4444",
      font: "Impact, 'Arial Black', sans-serif",
      style: "normal",
      radius: 2,
    },
    section: {
      numberColor: "#ef4444",
      titleColor: "#fef2f2",
      glowColor: "rgba(239, 68, 68, 0.15)",
      dividerColor: "#dc2626",
    },
    number: {
      gradient: "linear-gradient(180deg, #fef2f2, #ef4444)",
      labelColor: "#f87171",
      glowRgb: "239,68,68",
    },
    comparison: {
      barColors: ["#ef4444", "#f97316", "#eab308", "#f43f5e"],
      labelColor: "#fef2f2",
      trackColor: "rgba(239, 68, 68, 0.08)",
    },
    textFlash: {
      color: "#fef2f2",
      shadowColor: "rgba(239, 68, 68, 0.25)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.5)",
      topBar: "rgba(239, 68, 68, 0.12)",
    },
  },

  // ── OCEAN / CALM ───────────────────────────────
  ocean: {
    name: "Deep Ocean",
    subtitle: {
      bg: "rgba(4, 15, 25, 0.92)",
      border: "1px solid rgba(56, 189, 248, 0.15)",
      color: "#e0f2fe",
      accent: "#38bdf8",
      font: "Helvetica Neue, Arial, sans-serif",
      style: "normal",
      radius: 20,
    },
    section: {
      numberColor: "#38bdf8",
      titleColor: "#e0f2fe",
      glowColor: "rgba(56, 189, 248, 0.12)",
      dividerColor: "#0ea5e9",
    },
    number: {
      gradient: "linear-gradient(180deg, #e0f2fe, #0ea5e9)",
      labelColor: "#7dd3fc",
      glowRgb: "56,189,248",
    },
    comparison: {
      barColors: ["#38bdf8", "#22d3ee", "#34d399", "#0ea5e9"],
      labelColor: "#e0f2fe",
      trackColor: "rgba(56, 189, 248, 0.06)",
    },
    textFlash: {
      color: "#e0f2fe",
      shadowColor: "rgba(56, 189, 248, 0.15)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.5)",
      topBar: "rgba(56, 189, 248, 0.1)",
    },
  },

  // ── SPACE / SCIENCE ────────────────────────────
  stars: {
    name: "Starfield",
    subtitle: {
      bg: "rgba(10, 6, 20, 0.92)",
      border: "1px solid rgba(167, 139, 250, 0.15)",
      color: "#ede9fe",
      accent: "#a78bfa",
      font: "Helvetica Neue, Arial, sans-serif",
      style: "italic",
      radius: 8,
    },
    section: {
      numberColor: "#c4b5fd",
      titleColor: "#ede9fe",
      glowColor: "rgba(167, 139, 250, 0.12)",
      dividerColor: "#8b5cf6",
    },
    number: {
      gradient: "linear-gradient(180deg, #ede9fe, #8b5cf6)",
      labelColor: "#a78bfa",
      glowRgb: "167,139,250",
    },
    comparison: {
      barColors: ["#a78bfa", "#818cf8", "#6366f1", "#c084fc"],
      labelColor: "#ede9fe",
      trackColor: "rgba(167, 139, 250, 0.08)",
    },
    textFlash: {
      color: "#ede9fe",
      shadowColor: "rgba(167, 139, 250, 0.2)",
    },
    overlay: {
      vignette: "rgba(0,0,0,0.55)",
      topBar: "rgba(167, 139, 250, 0.1)",
    },
  },
};

export function getTheme(name) {
  return THEMES[name] || THEMES.grid;
}
