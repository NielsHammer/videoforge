import axios from "axios";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const API_BASE = "https://api.elevenlabs.io/v1";

// ═══════════════════════════════════════════
// VOICE LIBRARY — 16 voices organized by style
// ═══════════════════════════════════════════
const VOICE_MAP = {
  // Community voices (from My Voices library)
  heisenberg:       "iEBOK9alpKauGRvBSsFi",
  brian_nguyen:     "bP8FJDHmWVEgXJDitdQd",
  drew:             "q0IMILNRPxOgtBTS4taI",
  frank:            "V2bPluzT7MuirpucVAKH",
  australian:       "KmnvDXRA0HU55Q0aqkPG",
  cedric:           "BQOei2tk6QCBMHQWPhbj",
  daniel:           "9fHP3GqJWwJmIbYQwQ1V",
  casey:            "mKoqwDP2laxTdq1gEgU6",
  aaron:            "3DR8c2yd30eztg65o4jV",
  charles:          "S9GPGBaMND8XWwwzxQXp",
  ray:              "Uh6UEmMIUnnL0GOOUghh",
  klaus:            "K3Yt39lYHrB4wyU3kaCG",
  archer:           "oQV06a7Gn8pbCJh5DXcO",
  carters_edge:     "pSfivq1mIHnYTVwluxnz",
  king_chuku:       "XALcFq0WF65uNKzmpcZW",
  frederick:        "j9jfwdrw7BRfcR43Qohk",
};

// Voice metadata for order form display + auto-selection
export const VOICE_CATALOG = [
  { id: "heisenberg",   voiceId: "iEBOK9alpKauGRvBSsFi", name: "Heisenberg",               description: "Polished, clear, cinematic. Deep resonance with authority.",       style: "authority",     gender: "male",   accent: "american" },
  { id: "brian_nguyen",  voiceId: "bP8FJDHmWVEgXJDitdQd", name: "Brian Nguyen",             description: "Balanced, wise, calm. Young American-Asian male.",                style: "calm",          gender: "male",   accent: "american" },
  { id: "drew",          voiceId: "q0IMILNRPxOgtBTS4taI", name: "Drew",                      description: "Casual, curious, fun. Perfect for food, travel, lifestyle.",      style: "casual",        gender: "male",   accent: "american" },
  { id: "frank",         voiceId: "V2bPluzT7MuirpucVAKH", name: "Frank",                     description: "Wise, deep, motivational. Like an experienced mentor.",           style: "motivational",  gender: "male",   accent: "american" },
  { id: "australian",    voiceId: "KmnvDXRA0HU55Q0aqkPG", name: "Australian Baritone",       description: "Soft, slow, calming. Great for meditation & documentaries.",      style: "calm",          gender: "male",   accent: "australian" },
  { id: "cedric",        voiceId: "BQOei2tk6QCBMHQWPhbj", name: "Cedric",                    description: "Slow-burn horror storyteller. Deep, deliberate, eerie.",          style: "horror",        gender: "male",   accent: "american" },
  { id: "daniel",        voiceId: "9fHP3GqJWwJmIbYQwQ1V", name: "Daniel",                    description: "Calm, natural, clear. Instructional narrator for education.",     style: "educational",   gender: "male",   accent: "american" },
  { id: "casey",         voiceId: "mKoqwDP2laxTdq1gEgU6", name: "Countdown Casey",          description: "Vintage radio DJ. Energetic, fun, great for countdowns.",         style: "entertainment", gender: "male",   accent: "american" },
  { id: "aaron",         voiceId: "3DR8c2yd30eztg65o4jV", name: "Aaron",                     description: "Clear, tech-focused, modern. AI & tech news style.",              style: "tech",          gender: "male",   accent: "american" },
  { id: "charles",       voiceId: "S9GPGBaMND8XWwwzxQXp", name: "Charles",                   description: "Bold, charismatic. Social media, TV & commercials.",              style: "social",        gender: "male",   accent: "american" },
  { id: "ray",           voiceId: "Uh6UEmMIUnnL0GOOUghh", name: "Ray",                       description: "Scary stories narrator. Grunge, breathy, horror delivery.",       style: "horror",        gender: "male",   accent: "american" },
  { id: "klaus",         voiceId: "K3Yt39lYHrB4wyU3kaCG", name: "Klaus",                     description: "Versatile male narrator. Clean, neutral delivery.",               style: "neutral",       gender: "male",   accent: "american" },
  { id: "archer",        voiceId: "oQV06a7Gn8pbCJh5DXcO", name: "Archer",                    description: "Storytelling & narration. Smooth, engaging voice.",               style: "storytelling",  gender: "male",   accent: "american" },
  { id: "carters_edge",  voiceId: "pSfivq1mIHnYTVwluxnz", name: "Carter's Edge",            description: "Rugged, masculine, authoritative. Commands the room.",            style: "authority",     gender: "male",   accent: "american" },
  { id: "king_chuku",    voiceId: "XALcFq0WF65uNKzmpcZW", name: "King Chuku",               description: "Deep, powerful, stoic. Perfect for speeches & motivation.",        style: "motivational",  gender: "male",   accent: "american" },
  { id: "frederick",     voiceId: "j9jfwdrw7BRfcR43Qohk", name: "Frederick Surrey",         description: "Professional British narrator. Nature, science, mystery.",         style: "documentary",   gender: "male",   accent: "british" },
];

// ═══════════════════════════════════════════
// AUTO-SELECTION: theme/mood → voice (primary + backup)
// Used when customer doesn't pick a voice
// ═══════════════════════════════════════════
const STYLE_VOICES = {
  finance:       { primary: "heisenberg",   backup: "daniel" },
  business:      { primary: "heisenberg",   backup: "aaron" },
  tech:          { primary: "aaron",         backup: "daniel" },
  horror:        { primary: "cedric",        backup: "ray" },
  true_crime:    { primary: "ray",           backup: "cedric" },
  motivational:  { primary: "frank",         backup: "king_chuku" },
  documentary:   { primary: "frederick",     backup: "archer" },
  science:       { primary: "frederick",     backup: "daniel" },
  travel:        { primary: "drew",          backup: "australian" },
  food:          { primary: "drew",          backup: "charles" },
  lifestyle:     { primary: "drew",          backup: "brian_nguyen" },
  entertainment: { primary: "casey",         backup: "charles" },
  celebrity:     { primary: "charles",       backup: "casey" },
  luxury:        { primary: "heisenberg",    backup: "carters_edge" },
  gaming:        { primary: "charles",       backup: "klaus" },
  education:     { primary: "daniel",        backup: "brian_nguyen" },
  health:        { primary: "australian",    backup: "brian_nguyen" },
  calm:          { primary: "australian",    backup: "brian_nguyen" },
  storytelling:  { primary: "archer",        backup: "frank" },
  social_media:  { primary: "charles",       backup: "drew" },
  default:       { primary: "heisenberg",    backup: "daniel" },
};

// Detect best voice style from script content
const STYLE_KEYWORDS = {
  finance:       /invest|stock|dividend|market|portfolio|wealth|compound|retire|s&p|nasdaq|crypto|bitcoin/i,
  horror:        /horror|scary|creepy|haunted|ghost|demon|paranormal|nightmare|terror|curse|evil|possessed/i,
  true_crime:    /murder|serial killer|crime|criminal|investigation|detective|victim|suspect|forensic/i,
  motivational:  /motivat|discipline|grind|hustle|success|mindset|habit|routine|transform|achieve|goal/i,
  documentary:   /history|ancient|century|civilization|war|empire|revolution|documentary/i,
  science:       /science|research|study|brain|neuroscience|physics|chemistry|biology|experiment/i,
  tech:          /ai|artificial intelligence|tech|software|programming|robot|algorithm|machine learning/i,
  travel:        /travel|destination|country|vacation|adventure|explore|tourism|beach|mountain|island/i,
  food:          /recipe|cooking|chef|restaurant|food|cuisine|ingredient|meal|kitchen/i,
  entertainment: /movie|film|celebrity|actor|singer|album|top 10|ranking|best.*ever|worst.*ever/i,
  luxury:        /luxury|million|billion|expensive|rich|yacht|ferrari|rolex|mansion|designer/i,
  health:        /health|nutrition|exercise|diet|sleep|wellness|mental health|anxiety|meditation/i,
  gaming:        /gaming|game|playstation|xbox|nintendo|esports|streamer|twitch/i,
  education:     /learn|education|tutorial|explain|guide|how to|step by step|beginner/i,
};

export function detectVoiceStyle(scriptText) {
  let best = "default";
  let bestScore = 0;
  for (const [style, pattern] of Object.entries(STYLE_KEYWORDS)) {
    const matches = scriptText.match(new RegExp(pattern, "gi"));
    const score = matches ? matches.length : 0;
    if (score > bestScore) { bestScore = score; best = style; }
  }
  return best;
}

export function getAutoVoice(scriptText) {
  const style = detectVoiceStyle(scriptText);
  const voices = STYLE_VOICES[style] || STYLE_VOICES.default;
  return {
    style,
    primary: { id: voices.primary, voiceId: VOICE_MAP[voices.primary] },
    backup:  { id: voices.backup,  voiceId: VOICE_MAP[voices.backup] },
  };
}

// ═══════════════════════════════════════════
// VOICE RESOLUTION
// ═══════════════════════════════════════════
export async function getVoiceId(voiceNameOrId) {
  // If it's already a voice ID (long string), use directly
  if (voiceNameOrId && voiceNameOrId.length > 15) return voiceNameOrId;

  const lower = (voiceNameOrId || "").toLowerCase().replace(/['\s-]/g, "_");

  // Check our local map first
  if (VOICE_MAP[lower]) return VOICE_MAP[lower];

  // Try partial match on catalog
  const match = VOICE_CATALOG.find(v =>
    v.id.includes(lower) || v.name.toLowerCase().includes(lower.replace(/_/g, " "))
  );
  if (match) return match.voiceId;

  // Try ElevenLabs API lookup
  try {
    const r = await axios.get(`${API_BASE}/voices`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });
    const m = r.data.voices.find((v) =>
      v.name.toLowerCase().includes((voiceNameOrId || "").toLowerCase())
    );
    if (m) return m.voice_id;
  } catch {}

  console.log(chalk.yellow(`Voice "${voiceNameOrId}" not found, using Heisenberg`));
  return VOICE_MAP["heisenberg"];
}

// ═══════════════════════════════════════════
// VOICEOVER GENERATION
// ═══════════════════════════════════════════

/**
 * Generate voiceover for ENTIRE script at once, with word-level timestamps.
 * Uses ElevenLabs /with-timestamps endpoint for precise word sync.
 */
// Split text into chunks at paragraph boundaries, max ~4500 chars each
function chunkText(text, maxChars = 4500) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + para;
  }
  if (current.trim()) chunks.push(current.trim());
  const final = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) { final.push(chunk); continue; }
    const sentences = chunk.split(/(?<=[.!?])\s+/);
    let sub = "";
    for (const s of sentences) {
      if (sub.length + s.length + 1 > maxChars && sub.length > 0) {
        final.push(sub.trim());
        sub = "";
      }
      sub += (sub ? " " : "") + s;
    }
    if (sub.trim()) final.push(sub.trim());
  }
  return final;
}

function parseWordsFromAlignment(data, timeOffset = 0) {
  const chars = data.alignment?.characters || [];
  const starts = data.alignment?.character_start_times_seconds || [];
  const ends = data.alignment?.character_end_times_seconds || [];
  const words = [];
  let currentWord = "";
  let wordStart = 0;
  let wordEnd = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === " " || ch === "\n") {
      if (currentWord.length > 0) {
        words.push({ word: currentWord, start: wordStart + timeOffset, end: wordEnd + timeOffset });
        currentWord = "";
      }
    } else {
      if (currentWord.length === 0) wordStart = starts[i] || 0;
      currentWord += ch;
      wordEnd = ends[i] || wordEnd;
    }
  }
  if (currentWord.length > 0) {
    words.push({ word: currentWord, start: wordStart + timeOffset, end: wordEnd + timeOffset });
  }
  return words;
}

async function ttsChunk(text, voiceId) {
  const r = await axios.post(
    `${API_BASE}/text-to-speech/${voiceId}/with-timestamps`,
    {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
    },
    { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" } }
  );
  return r.data;
}

export async function generateVoiceoverWithTimestamps(text, voiceId, outputPath) {
  const chunks = chunkText(text);

  if (chunks.length === 1) {
    const data = await ttsChunk(chunks[0], voiceId);
    const audioBuf = Buffer.from(data.audio_base64, "base64");
    fs.writeFileSync(outputPath, audioBuf);
    const words = parseWordsFromAlignment(data);
    const cleanWords = words.filter(w => !w.word.match(/<|>|break|time=|\/>/)).filter(w => w.word.trim().length > 0);
    const duration = cleanWords.length > 0 ? cleanWords[cleanWords.length - 1].end : 0;
    return { words: cleanWords, duration, audioPath: outputPath };
  }

  console.log(chalk.gray(`  Splitting voiceover into ${chunks.length} chunks (${text.length} chars total)`));
  const audioBuffers = [];
  const allWords = [];
  let timeOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(chalk.gray(`  Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`));
    const data = await ttsChunk(chunks[i], voiceId);
    const buf = Buffer.from(data.audio_base64, "base64");
    audioBuffers.push(buf);
    const words = parseWordsFromAlignment(data, timeOffset);
    allWords.push(...words);
    const chunkDuration = words.length > 0 ? words[words.length - 1].end - timeOffset : 0;
    timeOffset += chunkDuration + 0.3;
  }

  // Write each chunk to temp file, then use FFmpeg to concat properly
  const tmpDir = path.dirname(outputPath);
  const chunkPaths = [];
  for (let i = 0; i < audioBuffers.length; i++) {
    const chunkPath = path.join(tmpDir, `_chunk_${i}.mp3`);
    fs.writeFileSync(chunkPath, audioBuffers[i]);
    chunkPaths.push(chunkPath);
  }
  // Create FFmpeg concat list
  const listPath = path.join(tmpDir, '_concat_list.txt');
  fs.writeFileSync(listPath, chunkPaths.map(p => `file '${p}'`).join('\n'));
  try {
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, { stdio: 'pipe' });
  } catch (e) {
    // Fallback: re-encode if copy fails
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -acodec libmp3lame -b:a 192k "${outputPath}"`, { stdio: 'pipe' });
  }
  // Clean up temp files
  chunkPaths.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
  try { fs.unlinkSync(listPath); } catch(e) {}
  const cleanWords = allWords.filter(w => !w.word.match(/<|>|break|time=|\/>/)).filter(w => w.word.trim().length > 0);
  const duration = cleanWords.length > 0 ? cleanWords[cleanWords.length - 1].end : 0;
  console.log(chalk.gray(`  Combined: ${cleanWords.length} words, ${duration.toFixed(1)}s`));
  return { words: cleanWords, duration, audioPath: outputPath };
}

/**
 * Generate voiceover with automatic fallback.
 * Tries primary voice, falls back to backup if it fails.
 */
export async function generateWithFallback(text, primaryVoiceId, backupVoiceId, outputPath) {
  try {
    return await generateVoiceoverWithTimestamps(text, primaryVoiceId, outputPath);
  } catch (err) {
    console.log(chalk.yellow(`⚠️  Primary voice failed (${err.message}), trying backup...`));
    if (backupVoiceId) {
      return await generateVoiceoverWithTimestamps(text, backupVoiceId, outputPath);
    }
    throw err;
  }
}

// Legacy: per-scene voiceover (kept for backwards compat)
export async function generateVoiceover(text, voiceId, outputPath) {
  const r = await axios.post(
    `${API_BASE}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
    },
    {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      responseType: "arraybuffer",
    }
  );
  fs.writeFileSync(outputPath, r.data);
}

// List all voices on account
export async function listVoices() {
  try {
    const r = await axios.get(`${API_BASE}/voices`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
    });
    console.log(chalk.blue.bold("\nAvailable ElevenLabs Voices:\n"));
    r.data.voices.forEach((v) => {
      const cat = v.category || "";
      console.log(`  ${chalk.white.bold(v.name)} ${chalk.gray(`(${v.voice_id})`)} ${chalk.dim(cat)}`);
    });
  } catch {
    console.error(chalk.red("Failed to fetch voices."));
  }
}
