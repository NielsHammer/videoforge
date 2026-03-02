/**
 * THEME CONFIGS v30 — 21 visual identities matching background templates.
 * Every component pulls colors from the active theme so everything is synced.
 * 
 * v30 changes:
 * - Brighter text on infographics (opacity 1.0 instead of 0.85)
 * - Stronger borders (3px instead of 1px, higher opacity)
 * - Added infoBg: dark backdrop behind all infographic components
 * - Added infoText: guaranteed white text color for readability
 * - Added infoBorder: visible border color for infographic panels
 * 
 * Each theme provides:
 * - accent: primary bright accent color
 * - accent2: secondary accent color  
 * - accentRgb: RGB for glow effects
 * - highlight: keyword highlight color for subtitles
 * - chartColors: array of 6 colors for infographic elements
 * - textGlow: CSS text-shadow for infographic text glow effect
 * - infoBg: dark semi-transparent backdrop for infographic panels
 * - infoText: guaranteed bright text color
 * - infoBorder: visible border for infographic panels
 * - subtitle, section, number, comparison, textFlash configs
 */

function makeTheme(name, accent, accent2, accentRgb, chartColors) {
  return {
    name,
    accent,
    accent2,
    highlight: accent,
    chartColors,
    textGlow: `0 0 20px ${accent}66, 0 0 40px ${accent}33`,
    // v30: Infographic backdrop and text
    infoBg: "rgba(0, 0, 0, 0.82)",
    infoText: "#ffffff",
    infoBorder: `${accent}55`,
    subtitle: {
      bg: "rgba(0, 0, 0, 0.72)",
      border: `1px solid ${accent}20`,
      color: "#ffffff",
      accent,
      font: "'Arial Black', Arial, sans-serif",
      style: "normal",
      radius: 14,
    },
    section: {
      numberColor: accent,
      titleColor: "#ffffff",
      glowColor: `${accent}30`,
      dividerColor: accent2,
    },
    number: {
      gradient: `linear-gradient(180deg, #ffffff, ${accent})`,
      labelColor: "#ffffff",
      labelGlow: `0 0 15px ${accent}66`,
      glowRgb: accentRgb,
      barColors: chartColors.slice(0, 4),
    },
    comparison: {
      labelColor: "#ffffff",
      barBg: "rgba(255,255,255,0.08)",
      barRadius: 8,
      valueColor: "#ffffff",
    },
    textFlash: {
      gradient: `linear-gradient(180deg, #ffffff, ${accent})`,
      glowRgb: accentRgb,
      color: "#ffffff",
      shadowColor: `rgba(${accentRgb}, 0.4)`,
    },
  };
}

export const THEMES = {
  blue_grid:      makeTheme("Blue Grid",      "#4488ff", "#6644ff", "68,136,255",  ["#4488ff","#44dd88","#ff6644","#ddaa44","#dd44aa","#44dddd"]),
  green_matrix:   makeTheme("Green Matrix",   "#44dd88", "#22ffaa", "68,221,136",  ["#44dd88","#22ffaa","#88ff44","#44aaff","#dddd44","#44dddd"]),
  gold_luxury:    makeTheme("Gold Luxury",    "#ffcc44", "#ffaa22", "255,204,68",  ["#ffcc44","#ffaa22","#ff8844","#ddaa66","#eedd44","#ffbb88"]),
  red_energy:     makeTheme("Red Energy",     "#ff4466", "#ff6633", "255,68,102",  ["#ff4466","#ff8844","#ffaa44","#ff6688","#dd4488","#ff6644"]),
  purple_cosmic:  makeTheme("Purple Cosmic",  "#aa66ff", "#ff44cc", "170,102,255", ["#aa66ff","#ff44cc","#44aaff","#dd66ff","#8844ff","#cc88ff"]),
  teal_ocean:     makeTheme("Teal Ocean",     "#44ddee", "#22ffdd", "68,221,238",  ["#44ddee","#22ffdd","#44aaff","#88eeff","#44ddaa","#66ccff"]),
  orange_fire:    makeTheme("Orange Fire",    "#ff8833", "#ffaa22", "255,136,51",  ["#ff8833","#ffaa22","#ffcc44","#ff6644","#ddaa44","#ff9966"]),
  pink_neon:      makeTheme("Pink Neon",      "#ff44bb", "#ff22ff", "255,68,187",  ["#ff44bb","#ff66dd","#ff88ee","#dd44ff","#ff44aa","#ff88cc"]),
  ice_blue:       makeTheme("Ice Blue",       "#66ccff", "#44bbff", "102,204,255", ["#66ccff","#44bbff","#88ddff","#44aadd","#aaeeff","#44ccee"]),
  forest_green:   makeTheme("Forest Green",   "#44cc66", "#22ee88", "68,204,102",  ["#44cc66","#22ee88","#88ee44","#44aa44","#66dd88","#44cc88"]),
  sunset_warm:    makeTheme("Sunset Warm",    "#ff7744", "#ff5522", "255,119,68",  ["#ff7744","#ff9966","#ffbb44","#ff5544","#ffaa66","#ff8855"]),
  midnight_blue:  makeTheme("Midnight Blue",  "#4488dd", "#4466aa", "68,136,221",  ["#4488dd","#6699ee","#4466cc","#88aadd","#5577cc","#4488bb"]),
  electric_cyan:  makeTheme("Electric Cyan",  "#00eeff", "#22ffdd", "0,238,255",   ["#00eeff","#22ffdd","#44ddff","#00ddee","#66ffff","#44eeff"]),
  earth_brown:    makeTheme("Earth Brown",    "#ddaa66", "#cc8844", "221,170,102", ["#ddaa66","#cc8844","#bb7733","#eebb77","#ccaa55","#ddbb88"]),
  blood_red:      makeTheme("Blood Red",      "#dd3344", "#aa2233", "221,51,68",   ["#dd3344","#cc2233","#aa1122","#ee4455","#bb3344","#dd4466"]),
  royal_purple:   makeTheme("Royal Purple",   "#9955ee", "#bb77ff", "153,85,238",  ["#9955ee","#bb77ff","#7744cc","#cc88ff","#aa66dd","#dd99ff"]),
  neon_green:     makeTheme("Neon Green",     "#44ff66", "#00ff44", "68,255,102",  ["#44ff66","#00ff44","#88ff44","#22ff88","#66ff00","#44ff88"]),
  rose_gold:      makeTheme("Rose Gold",      "#ee99aa", "#ddaa88", "238,153,170", ["#ee99aa","#ffbbcc","#ddaa88","#ffccdd","#eebb99","#ffaacc"]),
  steel_grey:     makeTheme("Steel Grey",     "#99aacc", "#8899bb", "153,170,204", ["#99aacc","#8899bb","#aabbdd","#7788aa","#bbccee","#99aabb"]),
  dark_horror:    makeTheme("Dark Horror",    "#cc2222", "#881111", "200,30,30",   ["#cc2222","#881111","#660000","#aa0000","#993333","#bb1111"]),
  aurora:         makeTheme("Aurora",         "#44ddaa", "#6644ff", "68,221,170",  ["#44ddaa","#6644ff","#ff44aa","#44aaff","#dddd44","#ff8844"]),
};

// Map old theme names
const legacyMap = {
  grid: "blue_grid", particles: "ice_blue", topography: "earth_brown",
  diamond: "gold_luxury", radar: "electric_cyan", dna: "teal_ocean",
  city: "blue_grid", flames: "orange_fire", ocean: "teal_ocean", stars: "purple_cosmic",
  blue: "blue_grid", green: "green_matrix", purple: "purple_cosmic",
  red: "red_energy", gold: "gold_luxury", teal: "teal_ocean",
};

export function getTheme(name) {
  const resolved = legacyMap[name] || name;
  return THEMES[resolved] || THEMES.blue_grid;
}
