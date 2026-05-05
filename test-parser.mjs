import fs from 'fs';
import path from 'path';

// Test every scene-boundaries dump to see which ones actually had recoverable JSON
const dumps = fs.readdirSync('/tmp')
  .filter(f => f.startsWith('v2-parse-fail-scene-boundaries-'))
  .map(f => path.join('/tmp', f));

let recoverable = 0, unrecoverable = 0;
const unrecoverableExamples = [];

for (const dumpPath of dumps) {
  const content = fs.readFileSync(dumpPath, 'utf8');
  const rawMatch = content.match(/=== RAW TEXT ===\n([\s\S]*?)\n=== EXTRACTED CANDIDATE ===/);
  if (!rawMatch) continue;
  const text = rawMatch[1];

  // Replicate parseJson
  const fencedGreedy = text.match(/```json\s*([\s\S]*?)```/);
  const arr = text.match(/\[[\s\S]*\]/);
  const obj = text.match(/\{[\s\S]*\}/);
  let candidate;
  if (fencedGreedy) candidate = fencedGreedy[1];
  else if (arr && obj) candidate = arr[0].length >= obj[0].length ? arr[0] : obj[0];
  else candidate = arr ? arr[0] : (obj ? obj[0] : null);
  if (!candidate) continue;

  let ok = false;
  try { JSON.parse(candidate); ok = true; } catch {
    const sanitized = candidate.replace(/,(\s*[}\]])/g, '$1').replace(/\n/g, ' ');
    try { JSON.parse(sanitized); ok = true; } catch {
      const truncated = sanitized.replace(/,\s*\{[^}]*$/, '');
      const wrapped = truncated.startsWith('[') ? truncated + ']' : '[' + truncated + ']';
      try {
        const result = JSON.parse(wrapped);
        if (Array.isArray(result) && result.length > 0) ok = true;
      } catch {}
    }
  }

  if (ok) recoverable++;
  else {
    unrecoverable++;
    if (unrecoverableExamples.length < 3) unrecoverableExamples.push({ path: dumpPath, rawTail: text.slice(-200) });
  }
}

console.log(`Total dumps: ${dumps.length}`);
console.log(`Recoverable with current code: ${recoverable}`);
console.log(`NOT recoverable: ${unrecoverable}`);
console.log();
for (const ex of unrecoverableExamples) {
  console.log('NOT RECOVERABLE:', ex.path);
  console.log('  raw tail:', JSON.stringify(ex.rawTail));
  console.log();
}
