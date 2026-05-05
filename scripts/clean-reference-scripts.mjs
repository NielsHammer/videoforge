#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const SRC = '/opt/videoforge/reference-scripts/171 scripts';
const DST = '/opt/videoforge/reference-scripts-clean';

if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.txt')).sort((a, b) => {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  return na - nb;
});

const report = {
  total: files.length,
  cleaned: 0,
  empty: [],
  veryShort: [],
  hadTimestamps: 0,
  hadBrackets: 0,
  hadChapterHeaders: 0,
};

function normalizeTypography(s) {
  return s
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\u00AD/g, '');
}

function cleanBody(rawLines, stats) {
  const out = [];
  for (let line of rawLines) {
    // Strip YouTube chapter headers
    if (/^Chapter \d+:/i.test(line.trim())) {
      stats.hadChapterHeaders = true;
      continue;
    }
    // Strip lone-timestamp lines: "0:02", "1:23", "12:34"
    if (/^\d{1,2}:\d{2}$/.test(line.trim())) {
      stats.hadTimestamps = true;
      continue;
    }
    // Strip glued-timestamp prefix: "0:1313 seconds...", "1:061 minute, 6 seconds..."
    const glued = line.match(
      /^(\d+:\d+)\d+ (?:second|minute)s?(?:, \d+ (?:second|minute)s?)?\s*/
    );
    if (glued) {
      stats.hadTimestamps = true;
      line = line.slice(glued[0].length);
    }
    // Strip leading speaker dash
    line = line.replace(/^-\s+/, '');
    // Strip bracketed stage directions: [music], [clears throat], [ __ ], [applause]
    const before = line;
    line = line.replace(/\[[^\]]*\]/g, ' ');
    if (before !== line) stats.hadBrackets = true;
    // Collapse internal whitespace
    line = line.replace(/\s+/g, ' ').trim();
    if (line) out.push(line);
  }
  // Reflow into single paragraph
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

for (const f of files) {
  const src = path.join(SRC, f);
  const raw = fs.readFileSync(src, 'utf8');

  if (!raw.trim()) {
    report.empty.push(f);
    continue;
  }

  const normalized = normalizeTypography(raw);
  const lines = normalized.split('\n');

  // Title = first non-empty line
  let titleIdx = lines.findIndex(l => l.trim().length > 0);
  if (titleIdx === -1) {
    report.empty.push(f);
    continue;
  }
  const title = lines[titleIdx].trim().replace(/\s+/g, ' ');
  const bodyLines = lines.slice(titleIdx + 1);

  const stats = { hadTimestamps: false, hadBrackets: false, hadChapterHeaders: false };
  const body = cleanBody(bodyLines, stats);

  if (stats.hadTimestamps) report.hadTimestamps++;
  if (stats.hadBrackets) report.hadBrackets++;
  if (stats.hadChapterHeaders) report.hadChapterHeaders++;

  if (body.length < 200) {
    report.veryShort.push({ file: f, title, bodyLen: body.length });
  }

  const num = String(parseInt(f, 10)).padStart(3, '0');
  const outName = `${num}.txt`;
  const outPath = path.join(DST, outName);
  fs.writeFileSync(outPath, `${title}\n\n${body}\n`);
  report.cleaned++;
}

console.log('=== CLEANER REPORT ===');
console.log(`Total input files:    ${report.total}`);
console.log(`Cleaned successfully: ${report.cleaned}`);
console.log(`Empty/skipped:        ${report.empty.length}`);
if (report.empty.length) console.log(`  Files: ${report.empty.join(', ')}`);
console.log(`Had timestamps:       ${report.hadTimestamps}`);
console.log(`Had brackets:         ${report.hadBrackets}`);
console.log(`Had chapter headers:  ${report.hadChapterHeaders}`);
console.log(`Very short (<200ch):  ${report.veryShort.length}`);
if (report.veryShort.length) {
  for (const s of report.veryShort) {
    console.log(`  ${s.file} (${s.bodyLen}ch) — ${s.title.slice(0, 60)}`);
  }
}
console.log(`\nOutput: ${DST}`);
