#!/usr/bin/env node
/**
 * Generate 10 transition SFX using ffmpeg synthesis — v2.
 * Richer, fuller sounds with layered harmonics, longer tails, stereo width,
 * and enough presence to be heard over a voiceover at 0.7 volume.
 *
 * Run: node scripts/generate-transition-sfx.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT = '/opt/videoforge/assets/sfx';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Helper: generate a file then normalize it to -3 dBFS peak so all SFX
// are at a consistent level before the mixer applies its own volume.
function gen(name, cmd, out) {
  const tmp = out.replace('.wav', '_raw.wav');
  execSync(cmd(tmp), { stdio: 'pipe', timeout: 15000 });
  // Normalize to -3 dBFS peak
  execSync(`ffmpeg -y -i "${tmp}" -af "loudnorm=I=-14:TP=-3:LRA=7,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`, { stdio: 'pipe', timeout: 15000 });
  try { fs.unlinkSync(tmp); } catch {}
}

const SFX = {
  // ─── Whooshes — directional motion cues ────────────────────────────
  whoosh_soft: {
    description: 'Soft warm whoosh — gentle scene change',
    cmd: (out) => `ffmpeg -y -f lavfi -i "anoisesrc=d=0.65:c=brown:a=0.9" -f lavfi -i "sine=f=180:d=0.65" -filter_complex "[0:a]highpass=f=120,lowpass=f=2200,volume=1.2[n];[1:a]volume=0.2[s];[n][s]amix=inputs=2:weights=1 0.3,afade=t=in:st=0:d=0.18:curve=qsin,afade=t=out:st=0.30:d=0.35:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },
  whoosh_sharp: {
    description: 'Sharp bright whoosh — energetic scene change',
    cmd: (out) => `ffmpeg -y -f lavfi -i "anoisesrc=d=0.45:c=pink:a=0.9" -f lavfi -i "sine=f=800:d=0.45" -filter_complex "[0:a]highpass=f=400,lowpass=f=8000,volume=1.0[n];[1:a]volume=0.25,afade=t=in:st=0:d=0.05,afade=t=out:st=0.15:d=0.30[s];[n][s]amix=inputs=2:weights=1 0.4,afade=t=in:st=0:d=0.06:curve=qsin,afade=t=out:st=0.20:d=0.25:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },
  whoosh_reverse: {
    description: 'Reverse build whoosh — tension before a reveal',
    cmd: (out) => `ffmpeg -y -f lavfi -i "anoisesrc=d=0.80:c=pink:a=0.9" -f lavfi -i "sine=f=140:d=0.80" -filter_complex "[0:a]highpass=f=200,lowpass=f=4000,volume=1.0[n];[1:a]volume=0.25[s];[n][s]amix=inputs=2:weights=1 0.3,afade=t=in:st=0:d=0.60:curve=exp,afade=t=out:st=0.65:d=0.15:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },

  // ─── Clicks — UI cues, opens animations (longer tail + body) ───────
  click_soft: {
    description: 'Soft click with body — gentle UI cue',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=1000:d=0.18" -f lavfi -i "sine=f=2500:d=0.18" -f lavfi -i "anoisesrc=d=0.08:c=white:a=0.4" -filter_complex "[0:a]volume=0.6[a];[1:a]volume=0.25[b];[2:a]volume=0.2,highpass=f=2000[c];[a][b][c]amix=inputs=3:weights='1 0.5 0.3',afade=t=in:st=0:d=0.005,afade=t=out:st=0.04:d=0.14:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },
  click_sharp: {
    description: 'Sharp tactile click — commits an action',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=1800:d=0.15" -f lavfi -i "sine=f=3600:d=0.15" -f lavfi -i "anoisesrc=d=0.06:c=white:a=0.5" -filter_complex "[0:a]volume=0.7[a];[1:a]volume=0.3[b];[2:a]volume=0.25,highpass=f=3000[c];[a][b][c]amix=inputs=3:weights='1 0.5 0.4',afade=t=in:st=0:d=0.003,afade=t=out:st=0.03:d=0.12:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },

  // ─── Swells — atmospheric builds for important moments ─────────────
  swell_warm: {
    description: 'Warm harmonic swell — builds into a moment of weight',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=110:d=1.2" -f lavfi -i "sine=f=165:d=1.2" -f lavfi -i "sine=f=220:d=1.2" -f lavfi -i "sine=f=330:d=1.2" -filter_complex "[0:a]volume=1.0[a];[1:a]volume=0.7[b];[2:a]volume=0.5[c];[3:a]volume=0.25[d];[a][b][c][d]amix=inputs=4:weights='1 0.7 0.5 0.25',volume=0.6,afade=t=in:st=0:d=0.80:curve=qsin,afade=t=out:st=0.90:d=0.30:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },
  swell_tense: {
    description: 'Low tense swell — dread, stakes rising',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=55:d=1.2" -f lavfi -i "sine=f=82.5:d=1.2" -f lavfi -i "sine=f=110:d=1.2" -filter_complex "[0:a]volume=1.2[a];[1:a]volume=0.8[b];[2:a]volume=0.4[c];[a][b][c]amix=inputs=3:weights='1.2 0.8 0.4',volume=0.55,afade=t=in:st=0:d=0.85:curve=exp,afade=t=out:st=0.95:d=0.25:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },

  // ─── Impacts — punctuation for key beats ───────────────────────────
  impact_deep: {
    description: 'Deep sub impact — reveals, turning points',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=50:d=0.40" -f lavfi -i "sine=f=100:d=0.40" -f lavfi -i "anoisesrc=d=0.15:c=brown:a=1.0" -filter_complex "[0:a]volume=1.0,afade=t=out:st=0:d=0.40:curve=exp[a];[1:a]volume=0.5,afade=t=out:st=0:d=0.35:curve=exp[b];[2:a]volume=0.4,highpass=f=60,lowpass=f=400[c];[a][b][c]amix=inputs=3:weights='1 0.5 0.4',aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },
  impact_tap: {
    description: 'Light tap — clean scene punctuation',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=180:d=0.20" -f lavfi -i "sine=f=450:d=0.20" -f lavfi -i "anoisesrc=d=0.08:c=pink:a=0.5" -filter_complex "[0:a]volume=0.7,afade=t=out:st=0:d=0.20:curve=exp[a];[1:a]volume=0.3,afade=t=out:st=0:d=0.15:curve=exp[b];[2:a]volume=0.2,highpass=f=200[c];[a][b][c]amix=inputs=3:weights='1 0.4 0.3',aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },

  // ─── Tick — metronome for data/number scenes ──────────────────────
  tick_metallic: {
    description: 'Metallic tick with resonance — data cues, counters',
    cmd: (out) => `ffmpeg -y -f lavfi -i "sine=f=2800:d=0.15" -f lavfi -i "sine=f=4200:d=0.15" -f lavfi -i "sine=f=1400:d=0.15" -filter_complex "[0:a]volume=0.6[a];[1:a]volume=0.3[b];[2:a]volume=0.2[c];[a][b][c]amix=inputs=3:weights='1 0.5 0.3',afade=t=in:st=0:d=0.003,afade=t=out:st=0.03:d=0.12:curve=qsin,aresample=48000" -c:a pcm_s16le -ac 2 "${out}"`,
  },
};

console.log(`Generating ${Object.keys(SFX).length} SFX files into ${OUT}...\n`);
let ok = 0, fail = 0;
for (const [name, def] of Object.entries(SFX)) {
  const out = path.join(OUT, `${name}.wav`);
  try {
    gen(name, def.cmd, out);
    const size = fs.existsSync(out) ? fs.statSync(out).size : 0;
    if (size > 1000) {
      const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`, { encoding: 'utf8' }).trim();
      console.log(`  ✓ ${name.padEnd(20)} ${(size/1024).toFixed(0).padStart(5)}KB  ${dur}s — ${def.description}`);
      ok++;
    } else {
      console.log(`  ✗ ${name.padEnd(20)} (empty/missing)`);
      fail++;
    }
  } catch (err) {
    console.log(`  ✗ ${name.padEnd(20)} ${err.message?.slice(0, 120)}`);
    fail++;
  }
}
console.log(`\ndone: ${ok} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
