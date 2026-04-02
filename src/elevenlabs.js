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
  daniel:           "9fHP3GqJWwJmIbYQwQ1V",
  casey:            "mKoqwDP2laxTdq1gEgU6",
  matt_par:         "yr43K8H5LoTp6S1QFSGg",
  aaron:            "3DR8c2yd30eztg65o4jV",
  charles:          "S9GPGBaMND8XWwwzxQXp",
  ray:              "Uh6UEmMIUnnL0GOOUghh",
  archer:           "oQV06a7Gn8pbCJh5DXcO",
  carters_edge:     "pSfivq1mIHnYTVwluxnz",
  frederick:        "j9jfwdrw7BRfcR43Qohk",
  // Female voices
  christina:        "BuaKXS4Sv1Mccaw3flfU",
  tanya:            "Bwff1jnzl1s94AEcntUq",
  belle:            "cNYrMw9glwJZXR8RwbuR",
  casey_female:     "WzsP0bfiCpSDfNgLrUuN",
  jessica:          "cgSgspJ2msm6clMCkdW9",
  charlotte:        "XB0fDUnXU5powFXDhCwa",
  alice:            "Xb7hH8MSUJpSbSDYk0k2",
  sarah:            "EXAVITQu4vr4xnSDxMaL",
};

// Voice metadata for order form display + auto-selection
export const VOICE_CATALOG = [
  { id: "matt_par",    voiceId: "yr43K8H5LoTp6S1QFSGg", name: "Matt Par",         description: "Bold, natural, high-energy. Best performing voice.",           style: "all",          gender: "male",   accent: "american" },
  { id: "heisenberg",   voiceId: "iEBOK9alpKauGRvBSsFi", name: "Heisenberg",               description: "Polished, clear, cinematic. Deep resonance with authority.",       style: "authority",     gender: "male",   accent: "american" },
  { id: "brian_nguyen",  voiceId: "bP8FJDHmWVEgXJDitdQd", name: "Brian Nguyen",             description: "Balanced, wise, calm. Young American-Asian male.",                style: "calm",          gender: "male",   accent: "american" },
  { id: "drew",          voiceId: "q0IMILNRPxOgtBTS4taI", name: "Drew",                      description: "Casual, curious, fun. Perfect for food, travel, lifestyle.",      style: "casual",        gender: "male",   accent: "american" },
  { id: "frank",         voiceId: "V2bPluzT7MuirpucVAKH", name: "Frank",                     description: "Wise, deep, motivational. Like an experienced mentor.",           style: "motivational",  gender: "male",   accent: "american" },
  { id: "australian",    voiceId: "KmnvDXRA0HU55Q0aqkPG", name: "Australian Baritone",       description: "Soft, slow, calming. Great for meditation & documentaries.",      style: "calm",          gender: "male",   accent: "australian" },
  { id: "daniel",        voiceId: "9fHP3GqJWwJmIbYQwQ1V", name: "Daniel",                    description: "Calm, natural, clear. Instructional narrator for education.",     style: "educational",   gender: "male",   accent: "american" },
  { id: "casey",         voiceId: "mKoqwDP2laxTdq1gEgU6", name: "Countdown Casey",          description: "Vintage radio DJ. Energetic, fun, great for countdowns.",         style: "entertainment", gender: "male",   accent: "american" },
  { id: "aaron",         voiceId: "3DR8c2yd30eztg65o4jV", name: "Aaron",                     description: "Clear, tech-focused, modern. AI & tech news style.",              style: "tech",          gender: "male",   accent: "american" },
  { id: "charles",       voiceId: "S9GPGBaMND8XWwwzxQXp", name: "Charles",                   description: "Bold, charismatic. Social media, TV & commercials.",              style: "social",        gender: "male",   accent: "american" },
  { id: "ray",           voiceId: "Uh6UEmMIUnnL0GOOUghh", name: "Ray",                       description: "Scary stories narrator. Grunge, breathy, horror delivery.",       style: "horror",        gender: "male",   accent: "american" },
  { id: "archer",        voiceId: "oQV06a7Gn8pbCJh5DXcO", name: "Archer",                    description: "Storytelling & narration. Smooth, engaging voice.",               style: "storytelling",  gender: "male",   accent: "american" },
  { id: "carters_edge",  voiceId: "pSfivq1mIHnYTVwluxnz", name: "Carter's Edge",            description: "Rugged, masculine, authoritative. Commands the room.",            style: "authority",     gender: "male",   accent: "american" },
  { id: "frederick",     voiceId: "j9jfwdrw7BRfcR43Qohk", name: "Frederick Surrey",         description: "Professional British narrator. Nature, science, mystery.",         style: "documentary",   gender: "male",   accent: "british" },
  // Female voices
  { id: "christina",     voiceId: "BuaKXS4Sv1Mccaw3flfU", name: "Christina",              description: "Energetic, commercial, upbeat. Lifestyle & business.",            style: "lifestyle",     gender: "female", accent: "american" },
  { id: "tanya",         voiceId: "Bwff1jnzl1s94AEcntUq", name: "Tanya",                  description: "Upbeat, expressive, energetic. Entertainment & social media.",      style: "entertainment", gender: "female", accent: "american" },
  { id: "belle",         voiceId: "cNYrMw9glwJZXR8RwbuR", name: "Belle",                  description: "Warm, empathetic, friendly. Health, wellness, parenting.",           style: "calm",          gender: "female", accent: "american" },
  { id: "casey_female",  voiceId: "WzsP0bfiCpSDfNgLrUuN", name: "Casey (Female)",         description: "Clean, crisp, friendly. Education & general purpose.",               style: "educational",   gender: "female", accent: "american" },
  { id: "jessica",       voiceId: "cgSgspJ2msm6clMCkdW9", name: "Jessica",                   description: "Warm, expressive, conversational. Great for lifestyle & wellness.",  style: "lifestyle",     gender: "female", accent: "american" },
  { id: "charlotte",     voiceId: "XB0fDUnXU5powFXDhCwa", name: "Charlotte",                 description: "Seductive, confident, clear. Luxury, fashion, premium content.",      style: "luxury",        gender: "female", accent: "british" },
  { id: "alice",         voiceId: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice",                     description: "Professional, authoritative, news anchor tone. Finance & business.",  style: "authority",     gender: "female", accent: "british" },
  { id: "sarah",         voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Sarah",                     description: "Soft, friendly, approachable. Health, parenting, education.",         style: "calm",          gender: "female", accent: "american" },
];

// ═══════════════════════════════════════════
// AUTO-SELECTION: theme/mood → voice (primary + backup)
// Used when customer doesn't pick a voice
// ═══════════════════════════════════════════
const STYLE_VOICES = {
  finance:       { primary: "heisenberg",   backup: "daniel" },
  business:      { primary: "heisenberg",   backup: "aaron" },
  tech:          { primary: "aaron",         backup: "daniel" },
  horror:        { primary: "ray",            backup: "archer" },
  true_crime:    { primary: "ray",           backup: "archer" },
  motivational:  { primary: "frank",         backup: "carters_edge" },
  documentary:   { primary: "frederick",     backup: "archer" },
  science:       { primary: "frederick",     backup: "daniel" },
  travel:        { primary: "drew",          backup: "australian" },
  food:          { primary: "drew",          backup: "charles" },
  lifestyle:     { primary: "drew",          backup: "brian_nguyen" },
  entertainment: { primary: "casey",         backup: "charles" },
  celebrity:     { primary: "charles",       backup: "casey" },
  luxury:        { primary: "heisenberg",    backup: "carters_edge" },
  gaming:        { primary: "charles",       backup: "aaron" },
  education:     { primary: "daniel",        backup: "brian_nguyen" },
  health:        { primary: "australian",    backup: "brian_nguyen" },
  calm:          { primary: "australian",    backup: "brian_nguyen" },
  storytelling:  { primary: "archer",        backup: "frank" },
  social_media:  { primary: "charles",       backup: "drew" },
  default:       { primary: "matt_par",      backup: "heisenberg" },
  // Female-specific styles
  wellness:      { primary: "sarah",          backup: "jessica" },
  parenting:     { primary: "sarah",          backup: "jessica" },
  fashion:       { primary: "charlotte",      backup: "jessica" },
  beauty:        { primary: "jessica",        backup: "charlotte" },
  female_finance:{ primary: "alice",          backup: "charlotte" },
  insurance:     { primary: "belle",          backup: "casey_female" },
  female:        { primary: "christina",      backup: "tanya" },
  meditation:    { primary: "sarah",          backup: "australian" },
  creator:       { primary: "jessica",        backup: "charles" },
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
      timeout: 10000, // 10s
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

// ═══════════════════════════════════════════
// PACING: Claude decides per-video voice settings
// ═══════════════════════════════════════════
// Speed: 0.85 (slow) → 1.0 (normal) → 1.15 (fast) — safe range for ElevenLabs v2
// Stability: 0.3 (very expressive) → 0.7 (very consistent)
// Style: 0.1 (flat) → 0.6 (very expressive)

let _currentPacing = null;

export async function analyzePacing(niche, topic, tone, scriptPreview) {
  try {
    const resp = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `You are setting the voiceover pacing for a YouTube video. Decide the optimal speed and delivery style based on this specific video — not generic niche rules.

VIDEO TOPIC: "${topic || "unknown"}"
CHANNEL NICHE: ${niche || "general"}
REQUESTED TONE: ${tone || "not specified"}
SCRIPT PREVIEW: "${(scriptPreview || "").slice(0, 300)}"

Think about what pacing a top YouTube creator would use for THIS specific video:
- A horror story about a haunted house → slow, deliberate, building tension (0.85-0.90)
- A finance news video about a market crash → urgent, punchy, fast-paced (1.05-1.10)
- A retirement planning guide → calm, trustworthy, measured (0.95-1.00)
- A "top 10 craziest moments" → high energy, rapid-fire (1.08-1.12)
- A documentary about ancient Rome → authoritative, steady, cinematic (0.90-0.95)
- A meditation/wellness guide → very slow, calming, peaceful (0.85-0.90)

Return ONLY a JSON object, nothing else:
{"speed": NUMBER, "stability": NUMBER, "style": NUMBER, "label": "2-4 word description"}

speed: 0.85-1.15 (how fast the narrator speaks)
stability: 0.35-0.65 (lower = more expressive, higher = more consistent)
style: 0.15-0.55 (emotional intensity — low for educational, high for entertainment)`
        }]
      },
      {
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        timeout: 10000,
      }
    );

    const text = resp.data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const pacing = {
        speed: Math.max(0.85, Math.min(1.15, parseFloat(parsed.speed) || 1.0)),
        stability: Math.max(0.35, Math.min(0.65, parseFloat(parsed.stability) || 0.50)),
        style: Math.max(0.15, Math.min(0.55, parseFloat(parsed.style) || 0.35)),
        label: parsed.label || "custom pacing",
      };
      console.log(chalk.blue(`🎙️  Pacing (Claude): ${pacing.label} (speed=${pacing.speed}, stability=${pacing.stability}, style=${pacing.style})`));
      _currentPacing = pacing;
      return pacing;
    }
  } catch (err) {
    console.log(chalk.yellow(`  Pacing analysis failed (${err.message}), using defaults`));
  }

  // Fallback — neutral defaults
  const fallback = { speed: 1.0, stability: 0.50, style: 0.35, label: "natural, conversational" };
  console.log(chalk.blue(`🎙️  Pacing (default): ${fallback.label}`));
  _currentPacing = fallback;
  return fallback;
}

async function ttsChunk(rawText, voiceId) {
  // Strip SSML tags before sending - ElevenLabs multilingual v2 can glitch on them
  const text = rawText.replace(/<break\s[^>]*\/>/g, ' ').replace(/<break\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/  +/g, ' ').trim();
  // Use analyzed pacing or defaults
  const pacing = _currentPacing || NICHE_PACING.default;
  // Retry up to 3 times on rate limit or server error
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await axios.post(
        `${API_BASE}/text-to-speech/${voiceId}/with-timestamps`,
        {
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: pacing.stability,
            similarity_boost: 0.78,     // strong voice character without artifacts
            style: pacing.style,
            use_speaker_boost: true,    // 3D audio enhancement for clarity
          },
          speed: pacing.speed,           // ElevenLabs v2 speed control (0.7-1.3)
        },
        { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" }, timeout: 60000 } // 60s per chunk
      );
      return r.data;
    } catch (err) {
      const status = err?.response?.status;
      if (attempt < 3 && (status === 429 || status >= 500)) {
        const wait = status === 429 ? 10000 : 3000;
        console.log(`  ElevenLabs ${status}, retrying in ${wait/1000}s (attempt ${attempt}/3)...`);
        await new Promise(res => setTimeout(res, wait));
      } else {
        throw err;
      }
    }
  }
}

export async function generateVoiceoverWithTimestamps(text, voiceId, outputPath) {
  text = text.replace(/\*\*([^*]+)\*\*/g,"$1").replace(/\*([^*]+)\*/g,"$1").replace(/^#{1,6}\s+/gm,"").replace(/^---+$/gm,"").replace(/^\s*[-*+]\s+/gm,"").replace(/\n{3,}/g,"\n\n").trim();
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
    // Use the last character end time for accurate offset (not word-based)
    // Write chunk to temp file immediately so we can probe actual audio duration
    const tmpChunkPath = path.join(path.dirname(outputPath), `_probe_chunk_${i}.mp3`);
    fs.writeFileSync(tmpChunkPath, buf);
    let chunkDuration = 0;
    try {
      const probeOut = execSync(
        `ffprobe -v quiet -print_format json -show_streams "${tmpChunkPath}"`,
        { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
      );
      const probeData = JSON.parse(probeOut);
      const audioStream = probeData.streams.find(s => s.codec_type === 'audio');
      if (audioStream?.duration) {
        chunkDuration = parseFloat(audioStream.duration);
      }
    } catch(probeErr) {
      // Fall back to character timestamps if probe fails
      const lastCharEnd = data.alignment?.character_end_times_seconds;
      chunkDuration = lastCharEnd && lastCharEnd.length > 0
        ? lastCharEnd[lastCharEnd.length - 1]
        : (words.length > 0 ? words[words.length - 1].end - timeOffset : 0);
    }
    try { fs.unlinkSync(tmpChunkPath); } catch(e) {}
    timeOffset += chunkDuration;
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
    // Step 1: Concat raw chunks (no processing yet)
    const rawConcatPath = path.join(tmpDir, '_raw_concat.mp3');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -acodec libmp3lame -b:a 192k "${rawConcatPath}"`, { stdio: 'pipe', timeout: 120000 });

    // Step 2: Two-pass loudnorm — first pass measures the audio, second pass applies correct gain
    // This prevents end-of-file volume spikes that single-pass loudnorm can cause
    const pass1Out = execSync(
      `ffmpeg -y -i "${rawConcatPath}" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -`,
      { stdio: ['pipe','pipe','pipe'], timeout: 120000 }
    ).toString() + execSync(
      `ffmpeg -y -i "${rawConcatPath}" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 || true`,
      { stdio: 'pipe', timeout: 120000, encoding: 'utf8' }
    );

    // Parse measured values from first pass
    let loudnormFilter = 'loudnorm=I=-16:TP=-1.5:LRA=11';
    try {
      const jsonMatch = pass1Out.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
      if (jsonMatch) {
        const m = JSON.parse(jsonMatch[0]);
        // Second pass uses measured values for accurate, consistent normalization
        loudnormFilter = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
      }
    } catch(parseErr) {
      // Fall back to single-pass if JSON parse fails — still better than per-chunk
    }

    // Step 3: Apply normalization with measured values + voice clarity EQ
    // EQ: gentle high-pass at 80Hz (remove rumble), presence boost at 3kHz, air at 8kHz, de-ess at 6kHz
    const voiceEQ = "highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=2.5,equalizer=f=8000:t=q:w=1.5:g=1.5,equalizer=f=6000:t=q:w=2.0:g=-1.5";
    execSync(`ffmpeg -y -i "${rawConcatPath}" -af "${voiceEQ},${loudnormFilter}" -acodec libmp3lame -b:a 192k "${outputPath}"`, { stdio: 'pipe', timeout: 120000 });
    try { fs.unlinkSync(rawConcatPath); } catch(e) {}
  } catch (e) {
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, { stdio: 'pipe', timeout: 120000 });
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

    },
    {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      responseType: "arraybuffer",
      timeout: 60000, // 60s
    }
  );
  fs.writeFileSync(outputPath, r.data);
}

// List all voices on account
export async function listVoices() {
  try {
    const r = await axios.get(`${API_BASE}/voices`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      timeout: 10000,
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
