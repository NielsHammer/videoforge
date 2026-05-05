/**
 * Fingerprint reader — the taste substrate for v2.
 *
 * Loads and queries the 169 structural fingerprints extracted from top-performing
 * reference scripts. Used by title-gen, script-gen, video-bible, and critic to
 * reason about patterns without needing to embed rules.
 *
 * All fingerprints load once on first access and stay in memory. 169 small JSON
 * objects is ~200KB — nothing to worry about.
 */
import fs from 'fs';
import path from 'path';

const FINGERPRINT_DIR = '/opt/videoforge/reference-scripts-fingerprints';
const CLEAN_DIR = '/opt/videoforge/reference-scripts-clean';

let _cache = null;

function loadAll() {
  if (_cache) return _cache;
  const files = fs.readdirSync(FINGERPRINT_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  const fingerprints = [];
  for (const f of files) {
    try {
      const fp = JSON.parse(fs.readFileSync(path.join(FINGERPRINT_DIR, f), 'utf8'));
      fp._file = f;
      fingerprints.push(fp);
    } catch {
      // Skip unreadable files silently — logged elsewhere if critical.
    }
  }
  _cache = fingerprints;
  return fingerprints;
}

/** Return all fingerprints. */
export function getAllFingerprints() {
  return loadAll();
}

/** Return fingerprints matching a primary or secondary style. */
export function getFingerprintsByStyle(style) {
  return loadAll().filter(
    fp => fp.primary_style === style || fp.secondary_style === style
  );
}

/** Return fingerprints at a given density tier or higher. */
export function getFingerprintsByMinDensity(minTier) {
  const order = ['sparse', 'medium', 'dense', 'very_dense'];
  const minIdx = order.indexOf(minTier);
  if (minIdx === -1) return [];
  return loadAll().filter(fp => order.indexOf(fp.density_tier) >= minIdx);
}

/** Count distribution of values for any top-level string field. */
export function getFieldDistribution(field) {
  const all = loadAll();
  const counts = {};
  for (const fp of all) {
    const v = fp[field];
    if (v == null) continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1])
  );
}

/** Full distributions report — useful for debugging and for the planner prompt. */
export function getDistributions() {
  return {
    total: loadAll().length,
    primary_style: getFieldDistribution('primary_style'),
    density_tier: getFieldDistribution('density_tier'),
    reveal_timing: getFieldDistribution('reveal_timing'),
    opening_gambit_type: getFieldDistribution('opening_gambit_type'),
    audience_address: getFieldDistribution('audience_address'),
    callback_present: getFieldDistribution('callback_present'),
  };
}

/** Top N most common devices across all references, with counts. */
export function getTopDevices(limit = 20) {
  const counts = {};
  for (const fp of loadAll()) {
    for (const d of fp.devices_used || []) {
      counts[d] = (counts[d] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([device, count]) => ({ device, count }));
}

/** All unique voice markers across the set, with frequency. */
export function getVoiceMarkerPool(limit = 50) {
  const counts = {};
  for (const fp of loadAll()) {
    for (const v of fp.voice_markers || []) {
      const key = v.toLowerCase().trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([marker, count]) => ({ marker, count }));
}

/** Return N random hook examples from the set (for showing the planner). */
export function sampleHooks(n = 10, { style } = {}) {
  let pool = loadAll();
  if (style) pool = pool.filter(fp => fp.primary_style === style);
  pool = pool.filter(fp => fp.hook_transcript);
  return shuffle(pool).slice(0, n).map(fp => ({
    title: fp._meta?.title,
    style: fp.primary_style,
    gambit: fp.opening_gambit_type,
    hook: fp.hook_transcript,
    works_because: fp.hook_works_because,
  }));
}

/** Return N random callback examples (for teaching the critic/planner). */
export function sampleCallbacks(n = 10) {
  const pool = loadAll().filter(fp => fp.callback_present && fp.callback_description);
  return shuffle(pool).slice(0, n).map(fp => ({
    title: fp._meta?.title,
    description: fp.callback_description,
  }));
}

/** Return N "what_makes_this_work" taste insights — the craft-level learning pool. */
export function sampleTasteInsights(n = 15, { style } = {}) {
  let pool = loadAll().filter(fp => fp.what_makes_this_work);
  if (style) pool = pool.filter(fp => fp.primary_style === style);
  return shuffle(pool).slice(0, n).map(fp => ({
    title: fp._meta?.title,
    style: fp.primary_style,
    density: fp.density_tier,
    insight: fp.what_makes_this_work,
    strength: fp.biggest_strength,
    weakness: fp.biggest_weakness,
  }));
}

/** Return all reference titles (for the title generator). */
export function getAllTitles() {
  return loadAll()
    .map(fp => fp._meta?.title)
    .filter(Boolean);
}

/** Return full text of a reference script by fingerprint file name. */
export function getScriptText(fingerprintFile) {
  const txtName = fingerprintFile.replace('.json', '.txt');
  const p = path.join(CLEAN_DIR, txtName);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

/** Compact summary string usable in prompts. */
export function getSummaryForPrompt() {
  const d = getDistributions();
  const top = getTopDevices(10);
  return [
    `Reference set: ${d.total} top-performing scripts.`,
    `Primary styles: ${fmtDist(d.primary_style)}.`,
    `Density: ${fmtDist(d.density_tier)}.`,
    `Reveal timing: ${fmtDist(d.reveal_timing)}.`,
    `Opening gambits: ${fmtDist(d.opening_gambit_type)}.`,
    `Audience: ${fmtDist(d.audience_address)}.`,
    `Callbacks present in ${d.callback_present.true || 0}/${d.total} (${Math.round((d.callback_present.true || 0) / d.total * 100)}%).`,
    `Top devices: ${top.map(t => `${t.device}(${t.count})`).join(', ')}.`,
  ].join('\n');
}

function fmtDist(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join(', ');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
