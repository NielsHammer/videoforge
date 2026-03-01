import axios from "axios";
import fs from "fs";
import chalk from "chalk";

const API_BASE = "https://api.elevenlabs.io/v1";

const VOICE_MAP = {
  josh: "2EiwWnXFnvU5JabPnv8n", adam: "pNInz6obpgDQGcFmaJgB",
  rachel: "21m00Tcm4TlvDq8ikWAM", antoni: "ErXwobaYiN019PkySvjV",
  sam: "yoZ06aMxZJJ28mfd3POQ", callum: "N2lVS1w4EtoT3dr4eOWO",
  charlie: "IKne3meq5aSn9XLyUdCD", daniel: "onwK4e9ZLuTAKqWW03F9",
  fin: "D38z5RcWu1voky8WS1ja", george: "JBFqnCBsd6RMkjVDRZzb",
  harry: "SOYHLrjzK2X1ezoPC6cr", james: "ZQe5CZNOzWyzPSCn5a3c",
  liam: "TX3LPaxmHKxFdv7VOQHJ", matilda: "XrExE9yKIg1WjnnlVkGX",
  patrick: "ODq5zmih8GrVes37Dizd", will: "bIHbv24MWmeRgasZH58o",
};

export async function getVoiceId(voiceNameOrId) {
  if (voiceNameOrId.length > 15) return voiceNameOrId;
  const lower = voiceNameOrId.toLowerCase();
  if (VOICE_MAP[lower]) return VOICE_MAP[lower];
  try {
    const r = await axios.get(`${API_BASE}/voices`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
    const m = r.data.voices.find((v) => v.name.toLowerCase().includes(lower));
    if (m) return m.voice_id;
  } catch {}
  console.log(chalk.yellow(`Voice "${voiceNameOrId}" not found, using Daniel`));
  return VOICE_MAP["daniel"];
}

/**
 * Generate voiceover for ENTIRE script at once, with word-level timestamps.
 * Returns: { audioPath, words: [{ word, start, end }], duration }
 */
export async function generateVoiceoverWithTimestamps(text, voiceId, outputPath) {
  const response = await axios.post(
    `${API_BASE}/text-to-speech/${voiceId}/with-timestamps`,
    {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.8,
        style: 0.55,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  const data = response.data;

  // Save audio from base64
  const audioBuffer = Buffer.from(data.audio_base64, "base64");
  fs.writeFileSync(outputPath, audioBuffer);

  // Convert character-level timestamps to word-level
  const alignment = data.normalized_alignment || data.alignment;
  const words = charsToWords(alignment);

  // Save timestamps alongside audio
  const tsPath = outputPath.replace(/\.[^.]+$/, "-timestamps.json");
  fs.writeFileSync(tsPath, JSON.stringify({ words, duration: words.length > 0 ? words[words.length - 1].end : 0 }, null, 2));

  return {
    audioPath: outputPath,
    words,
    duration: words.length > 0 ? words[words.length - 1].end : 0,
  };
}

/**
 * Convert character-level alignment to word-level timestamps.
 * Groups characters between spaces into words.
 */
function charsToWords(alignment) {
  if (!alignment || !alignment.characters) return [];

  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;

  const words = [];
  let currentWord = "";
  let wordStart = null;
  let wordEnd = null;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (c === " " || c === "\n") {
      // End of word
      if (currentWord.length > 0) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: wordEnd,
        });
        currentWord = "";
        wordStart = null;
        wordEnd = null;
      }
    } else {
      if (wordStart === null) wordStart = starts[i];
      wordEnd = ends[i];
      currentWord += c;
    }
  }

  // Last word
  if (currentWord.length > 0) {
    words.push({ word: currentWord, start: wordStart, end: wordEnd });
  }

  return words;
}

/**
 * Load cached timestamps from file.
 */
export function loadCachedTimestamps(audioPath) {
  const tsPath = audioPath.replace(/\.[^.]+$/, "-timestamps.json");
  if (fs.existsSync(tsPath)) {
    return JSON.parse(fs.readFileSync(tsPath, "utf-8"));
  }
  return null;
}

// Legacy: per-scene voiceover (kept for backwards compat)
export async function generateVoiceover(text, voiceId, outputPath) {
  const response = await axios.post(
    `${API_BASE}/text-to-speech/${voiceId}`,
    {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
    },
    {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      responseType: "arraybuffer",
    }
  );
  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

export async function listVoices() {
  try {
    const r = await axios.get(`${API_BASE}/voices`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
    console.log(chalk.blue.bold("\nAvailable ElevenLabs Voices:\n"));
    r.data.voices.forEach((v) => {
      const labels = v.labels ? Object.values(v.labels).join(", ") : "";
      console.log(`  ${chalk.white.bold(v.name)} ${chalk.gray(`(${v.voice_id})`)}`);
      if (labels) console.log(`    ${chalk.gray(labels)}`);
    });
  } catch { console.error(chalk.red("Failed to fetch voices.")); }
}
