import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ora from "ora";

/*
  Music folder structure (in project root):
  music/
    motivational/   ← uplifting, energetic tracks
    calm/           ← ambient, relaxing tracks  
    dramatic/       ← dark, tense tracks
    serious/        ← corporate, professional tracks
    curious/        ← documentary, explorative tracks
    horror/         ← eerie, suspenseful, creepy tracks
    luxury/         ← elegant, sophisticated tracks
    adventure/      ← epic, travel, upbeat tracks
    upbeat/         ← fun, social media, trendy tracks
    default/        ← fallback tracks for any mood
  
  Drop .mp3 files into the appropriate folder.
  VideoForge auto-selects based on script mood + theme.
*/

const MOOD_PATTERNS = {
  motivational: /energy|morning|habit|routine|success|improve|better|change|power|strong|transform|wake|boost|achieve|goal|unlock|potential|tip|trick|hack|level up|grind|hustle|discipline/i,
  calm: /sleep|relax|rest|peace|calm|meditat|breath|wind down|quiet|gentle|slow|ease|comfort|sooth|night|dream|pillow|yoga|mindful/i,
  dramatic: /danger|risk|kill|destroy|ruin|worst|avoid|never|stop|dead|toxic|warning|crash|spike|collapse|catastroph/i,
  serious: /money|invest|financ|business|market|economy|trade|stock|tax|budget|profit|loss|debt|career|salary|billion|million|percent|revenue/i,
  curious: /science|brain|research|study|discover|fact|truth|reason|explain|how does|why does|what if|secret|mystery|hidden|unknown/i,
  horror: /horror|scary|creepy|haunted|ghost|demon|paranormal|murder|serial killer|nightmare|terror|curse|dark|evil|possessed|asylum|scream|blood|disturbing/i,
  luxury: /luxury|rich|wealth|expensive|million|billion|rolex|ferrari|mansion|yacht|designer|premium|exclusive|elite|diamond|gold|champagne|private jet/i,
  adventure: /travel|adventure|explore|destination|country|journey|road trip|hiking|mountain|ocean|beach|island|backpack|safari|discover|nature|wild/i,
  upbeat: /celebrity|entertainment|movie|film|music|tiktok|trend|viral|pop culture|influencer|gaming|anime|social media|youtube|content creator|rapper|singer/i,
};

// Theme-to-mood mapping for when script mood is ambiguous
const THEME_MOOD_HINTS = {
  dark_horror: "horror",
  blood_red: "horror",
  gold_luxury: "luxury",
  rose_gold: "luxury",
  sunset_warm: "adventure",
  forest_green: "adventure",
  earth_brown: "adventure",
  orange_fire: "motivational",
  red_energy: "dramatic",
  neon_green: "upbeat",
  pink_neon: "upbeat",
  electric_cyan: "curious",
  purple_cosmic: "curious",
  midnight_blue: "dramatic",
  steel_grey: "serious",
  blue_grid: "serious",
};

export function detectMood(scriptText, theme) {
  let best = "motivational";
  let bestScore = 0;
  
  for (const [mood, pattern] of Object.entries(MOOD_PATTERNS)) {
    const matches = scriptText.match(new RegExp(pattern, "gi"));
    const score = matches ? matches.length : 0;
    if (score > bestScore) { bestScore = score; best = mood; }
  }
  
  // If no strong match (< 3 hits), use theme hint
  if (bestScore < 3 && theme && THEME_MOOD_HINTS[theme]) {
    best = THEME_MOOD_HINTS[theme];
  }
  
  return best;
}

export function selectMusicTrack(mood, projectRoot) {
  const musicDir = path.join(projectRoot, "music");
  
  // Try mood-specific folder first, then related moods, then default, then any
  const fallbackChains = {
    horror:      ["horror", "dramatic", "default"],
    luxury:      ["luxury", "calm", "serious", "default"],
    adventure:   ["adventure", "motivational", "upbeat", "default"],
    upbeat:      ["upbeat", "motivational", "default"],
    motivational:["motivational", "upbeat", "default"],
    calm:        ["calm", "default"],
    dramatic:    ["dramatic", "horror", "serious", "default"],
    serious:     ["serious", "calm", "default"],
    curious:     ["curious", "calm", "serious", "default"],
  };
  
  const searchOrder = fallbackChains[mood] || [mood, "default", "motivational"];
  
  for (const folder of searchOrder) {
    const dir = path.join(musicDir, folder);
    if (!fs.existsSync(dir)) continue;
    
    const tracks = fs.readdirSync(dir).filter(f => f.endsWith(".mp3") || f.endsWith(".wav"));
    if (tracks.length > 0) {
      const pick = tracks[Math.floor(Math.random() * tracks.length)];
      return { path: path.join(dir, pick), mood: folder, name: pick };
    }
  }
  
  // Also check root music/ folder
  if (fs.existsSync(musicDir)) {
    const tracks = fs.readdirSync(musicDir).filter(f => f.endsWith(".mp3") || f.endsWith(".wav"));
    if (tracks.length > 0) {
      const pick = tracks[Math.floor(Math.random() * tracks.length)];
      return { path: path.join(musicDir, pick), mood: "default", name: pick };
    }
  }
  
  return null;
}

/**
 * Mix background music with voiceover.
 * - Loops music to match video duration
 * - Ducks music volume (music at -18dB, voice at 0dB)
 * - Fades music in at start (2s) and out at end (3s)
 */
export function mixMusicWithVoice(musicPath, voicePath, outputPath, duration) {
  const fadeOutStart = Math.max(0, duration - 3);
  
  execSync(
    `ffmpeg -y -stream_loop -1 -i "${musicPath}" -i "${voicePath}" ` +
    `-filter_complex "` +
    `[0:a]atrim=0:${duration},asetpts=PTS-STARTPTS,` +
    `afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3,` +
    `volume=0.30[music];` +
    `[1:a]asetpts=PTS-STARTPTS[voice];` +
    `[music][voice]amix=inputs=2:duration=longest:dropout_transition=2[out]` +
    `" -map "[out]" -c:a aac -b:a 192k "${outputPath}"`,
    { stdio: "pipe" }
  );
}
