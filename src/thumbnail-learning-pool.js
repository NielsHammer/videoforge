/**
 * Persistent learning pool for thumbnail-v3.
 *
 * Two persistent files in /opt/videoforge/output/learning-pool/:
 *   winners.json — thumbnails Niels (or any reviewer) approved.
 *                  Each entry has: title, niche, html, image_query,
 *                  why, approved_at, optional reason.
 *   losers.json  — thumbnails rejected with a specific reason.
 *
 * The pools are loaded into every planner call as in-context learning.
 * Across runs the system accumulates a real understanding of what good
 * looks like (the winners) and what to avoid (the losers with reasons).
 *
 * Niels: "it needs to be machine learning improving as we go, as it gets
 * feedback on whether or not it likes it, it then learns from it and
 * improves... it needs to know everything we know and why we made those
 * rules, it needs to be smart ai generation."
 *
 * This is in-context learning, not gradient training, but it persists
 * across sessions so the system genuinely remembers feedback.
 */
import fs from 'fs';
import path from 'path';

const POOL_DIR = '/opt/videoforge/output/learning-pool';
const WINNERS_FILE = path.join(POOL_DIR, 'winners.json');
const LOSERS_FILE = path.join(POOL_DIR, 'losers.json');

function ensureDir() {
  if (!fs.existsSync(POOL_DIR)) fs.mkdirSync(POOL_DIR, { recursive: true });
}

function loadJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export function loadWinners() {
  return loadJsonArray(WINNERS_FILE);
}

export function loadLosers() {
  return loadJsonArray(LOSERS_FILE);
}

// Append an entry to the winners pool. The entry should include the html
// (or a path to it), the title and niche, the planner's "why", and the
// rendered thumbnail path so future planner calls can SEE what worked.
export function addWinner(entry) {
  ensureDir();
  const winners = loadWinners();
  winners.push({
    ...entry,
    approved_at: new Date().toISOString(),
  });
  fs.writeFileSync(WINNERS_FILE, JSON.stringify(winners, null, 2));
  return winners.length;
}

// Append an entry to the losers pool. MUST include a `reason` so the planner
// knows what to avoid. Without a reason, the entry is rejected — we don't
// want vague "this is bad" data polluting the learning context.
export function addLoser(entry) {
  if (!entry.reason || typeof entry.reason !== 'string' || entry.reason.trim().length === 0) {
    throw new Error('addLoser() requires a non-empty `reason` string');
  }
  ensureDir();
  const losers = loadLosers();
  losers.push({
    ...entry,
    rejected_at: new Date().toISOString(),
  });
  fs.writeFileSync(LOSERS_FILE, JSON.stringify(losers, null, 2));
  return losers.length;
}

// Build the learning context block injected into the planner prompt.
// Surfaces the winners (with their HTML so Claude can see what worked
// structurally) and losers (with reasons so Claude knows what to avoid).
//
// Picks the most-relevant winners and losers by niche and title overlap.
// Caps total context size to avoid blowing up the prompt.
export function buildLearningContext(title, niche, opts = {}) {
  const maxWinners = opts.maxWinners || 4;
  const maxLosers = opts.maxLosers || 6;
  const winners = loadWinners();
  const losers = loadLosers();
  if (winners.length === 0 && losers.length === 0) return '';

  const titleWords = new Set(title.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const score = (entry) => {
    let s = 0;
    if (entry.niche === niche) s += 5;
    const ew = (entry.title || '').toLowerCase().split(/\W+/);
    for (const w of ew) if (titleWords.has(w)) s += 2;
    return s;
  };

  const topWinners = [...winners].sort((a, b) => score(b) - score(a)).slice(0, maxWinners);
  const topLosers = [...losers].sort((a, b) => score(b) - score(a)).slice(0, maxLosers);

  const lines = ['═══ PERSISTENT LEARNING POOL — APPROVED + REJECTED THUMBNAILS ═══', ''];

  if (topWinners.length > 0) {
    lines.push('### APPROVED THUMBNAILS (Niels has personally said these work — adapt the same THINKING, not the same elements)');
    lines.push('');
    topWinners.forEach((w, i) => {
      lines.push(`Winner ${i + 1}: "${w.title}" (${w.niche || 'unknown'})`);
      if (w.why) lines.push(`  Designer reasoning: ${w.why.substring(0, 400)}`);
      if (w.html) {
        // Include a compact summary of the HTML structure rather than the full code,
        // to teach the planner the COMPOSITIONAL choices without flooding context
        const compact = w.html
          .replace(/\s+/g, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '<style>...</style>')
          .substring(0, 500);
        lines.push(`  Structure: ${compact}`);
      }
      if (w.approved_reason) lines.push(`  Why approved: ${w.approved_reason}`);
      lines.push('');
    });
  }

  if (topLosers.length > 0) {
    lines.push('### REJECTED THUMBNAILS (Niels said these are bad — DO NOT REPEAT THESE MISTAKES)');
    lines.push('');
    topLosers.forEach((l, i) => {
      lines.push(`Loser ${i + 1}: "${l.title}" (${l.niche || 'unknown'})`);
      lines.push(`  WHY REJECTED: ${l.reason}`);
      lines.push('');
    });
  }

  lines.push('═══ END LEARNING POOL ═══');
  lines.push('');
  lines.push('Apply the lessons from APPROVED thumbnails. Avoid every pattern called out in REJECTED thumbnails. These are real human judgments — they override any abstract design principle.');
  lines.push('');
  return lines.join('\n');
}

// CLI helpers — small entry points so Niels (or me) can mark a thumbnail
// from the command line without hand-editing JSON.
export function approveFromCli({ outputDir, reason }) {
  const planFile = path.join(outputDir, 'thumbnail-v3-plan.json');
  const htmlFile = path.join(outputDir, 'thumbnail-v3.html');
  if (!fs.existsSync(planFile)) throw new Error('No plan at ' + planFile);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
  const html = fs.existsSync(htmlFile) ? fs.readFileSync(htmlFile, 'utf-8') : null;
  const count = addWinner({
    title: plan.title,
    niche: plan.niche,
    why: plan.why,
    html,
    png_path: path.join(outputDir, 'thumbnail-v3.png'),
    approved_reason: reason || null,
  });
  return { pool_size: count };
}

export function rejectFromCli({ outputDir, reason }) {
  if (!reason) throw new Error('reject requires --reason');
  const planFile = path.join(outputDir, 'thumbnail-v3-plan.json');
  if (!fs.existsSync(planFile)) throw new Error('No plan at ' + planFile);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
  const count = addLoser({
    title: plan.title,
    niche: plan.niche,
    reason,
    png_path: path.join(outputDir, 'thumbnail-v3.png'),
  });
  return { pool_size: count };
}
