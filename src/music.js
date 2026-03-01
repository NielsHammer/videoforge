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
    default/        ← fallback tracks for any mood
  
  Drop .mp3 files into the appropriate folder.
  VideoForge auto-selects based on script mood.
*/

const MOOD_PATTERNS = {
  motivational: /energy|morning|habit|routine|success|improve|better|change|power|strong|transform|wake|boost|achieve|goal|unlock|potential|tip|trick|hack|level up/i,
  calm: /sleep|relax|rest|peace|calm|meditat|breath|wind down|quiet|gentle|slow|ease|comfort|sooth|night|dream|pillow/i,
  dramatic: /danger|risk|kill|destroy|ruin|worst|avoid|never|stop|dead|toxic|warning|scary|fear|dark|mistake|crash|spike/i,
  serious: /money|invest|financ|business|market|economy|trade|stock|tax|budget|profit|loss|debt|career|salary/i,
  curious: /science|brain|research|study|discover|fact|truth|reason|explain|how does|why does|what if|secret|mystery/i,
};

export function detectMood(scriptText) {
  let best = "motivational";
  let bestScore = 0;
  for (const [mood, pattern] of Object.entries(MOOD_PATTERNS)) {
    const matches = scriptText.match(new RegExp(pattern, "gi"));
    const score = matches ? matches.length : 0;
    if (score > bestScore) { bestScore = score; best = mood; }
  }
  return best;
}

export function selectMusicTrack(mood, projectRoot) {
  const musicDir = path.join(projectRoot, "music");
  
  // Try mood-specific folder first, then default, then any folder
  const searchOrder = [mood, "default", "motivational", "calm", "dramatic", "serious", "curious"];
  
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
  // Loop music to fill duration, apply volume ducking and fade
  const fadeOutStart = Math.max(0, duration - 3);
  
  execSync(
    `ffmpeg -y -stream_loop -1 -i "${musicPath}" -i "${voicePath}" ` +
    `-filter_complex "` +
    `[0:a]atrim=0:${duration},asetpts=PTS-STARTPTS,` +
    `afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3,` +
    `volume=0.12[music];` +  // Music at ~12% volume (well under voice)
    `[1:a]asetpts=PTS-STARTPTS[voice];` +
    `[music][voice]amix=inputs=2:duration=longest:dropout_transition=2[out]` +
    `" -map "[out]" -c:a aac -b:a 192k "${outputPath}"`,
    { stdio: "pipe" }
  );
}
