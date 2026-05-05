/**
 * Transition SFX — subtle whoosh on every scene change.
 *
 * Uses 3 real whoosh recordings (CC0, BigSoundBank.com) rotated so
 * adjacent scenes don't repeat the same sound. That's it. No fancy
 * role-based selection, no synthesized garbage. Just a clean swish.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SFX_DIR = '/opt/videoforge/assets/sfx';
const WHOOSHES = ['whoosh_1', 'whoosh_2', 'whoosh_3'];
const SFX_VOLUME = 0.4; // subtle — audible but not distracting

/**
 * Plan whooshes on ~every 2nd-3rd scene change. Not every cut needs one —
 * just enough to add rhythm. Skip scene 0 and short clips (<2s).
 */
export function planSfxInsertions(clips) {
  const insertions = [];
  let sfxIdx = 0;
  for (let i = 1; i < clips.length; i++) {
    const clip = clips[i];
    const dur = (clip.end_time || 0) - (clip.start_time || 0);
    // Skip very short clips and every other scene to avoid overuse
    if (dur < 2) continue;
    if (i % 2 === 0 && i > 2) continue; // roughly every other scene after the first few
    const sfx = WHOOSHES[sfxIdx % WHOOSHES.length];
    sfxIdx++;
    const sfxPath = path.join(SFX_DIR, `${sfx}.wav`);
    if (!fs.existsSync(sfxPath)) continue;
    insertions.push({ sfx_name: sfx, timestamp: clip.start_time });
  }
  return insertions;
}

/**
 * Mix whooshes into the voiceover track.
 * Two-step: build one SFX bed, then overlay onto voice.
 */
export async function mixSfxIntoAudio(audioIn, audioOut, insertions) {
  if (!insertions || insertions.length === 0) {
    fs.copyFileSync(audioIn, audioOut);
    return { inserted: 0 };
  }

  const sfxBedPath = audioOut.replace(/\.[^.]+$/, '_sfx_bed.wav');

  // Step 1: combine all delayed whooshes into one track
  const sfxInputs = insertions.map(ins => path.join(SFX_DIR, `${ins.sfx_name}.wav`));
  const inputArgs = sfxInputs.map(p => `-i "${p}"`).join(' ');
  const sfxFilters = insertions.map((ins, i) => {
    const delayMs = Math.max(0, Math.round(ins.timestamp * 1000));
    return `[${i}:a]adelay=${delayMs}|${delayMs},volume=${SFX_VOLUME}[s${i}]`;
  });
  const mixLabels = insertions.map((_, i) => `[s${i}]`).join('');
  const filter = [
    ...sfxFilters,
    `${mixLabels}amix=inputs=${insertions.length}:duration=longest:normalize=0[sfxbed]`,
  ].join(';');

  const bedCmd = `ffmpeg -y ${inputArgs} -filter_complex "${filter}" -map "[sfxbed]" -c:a pcm_s16le -ac 2 -ar 48000 "${sfxBedPath}"`;

  // Step 2: overlay SFX bed onto voice at equal weight
  const overlayCmd = `ffmpeg -y -i "${audioIn}" -i "${sfxBedPath}" -filter_complex "[0:a]aformat=channel_layouts=stereo[v];[1:a]aformat=channel_layouts=stereo,apad[s];[v][s]amix=inputs=2:duration=first:weights=1 1:normalize=0[aout]" -map "[aout]" -c:a aac -b:a 192k -ac 2 "${audioOut}"`;

  try {
    execSync(bedCmd, { stdio: 'pipe', timeout: 300000 });
    execSync(overlayCmd, { stdio: 'pipe', timeout: 300000 });
    try { fs.unlinkSync(sfxBedPath); } catch {}
    return { inserted: insertions.length };
  } catch (err) {
    console.log(`  ⚠️  SFX mix failed: ${err.message?.slice(0, 200) || err}`);
    try { fs.copyFileSync(audioIn, audioOut); } catch {}
    try { fs.unlinkSync(sfxBedPath); } catch {}
    return { inserted: 0, error: err.message };
  }
}

/**
 * One-call convenience: plan + mix.
 */
export async function insertTransitionSfx(audioIn, audioOut, clips) {
  const insertions = planSfxInsertions(clips);
  console.log(`  🎵 inserting ${insertions.length} whoosh SFX into audio...`);
  return await mixSfxIntoAudio(audioIn, audioOut, insertions);
}
