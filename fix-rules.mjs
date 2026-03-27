import fs from 'fs';

const file = '/opt/videoforge/src/pipeline.js';
let code = fs.readFileSync(file, 'utf8');

const old = `Rules:
- Lead with the specific subject from the narration
- Add camera angle (low angle / aerial / close-up / wide establishing / over-shoulder)
- Add lighting (golden hour / harsh shadows / neon glow / candlelight / overcast grey)
- Add emotional subtext (tense / awe-inspiring / lonely / triumphant / haunting)
- Add cinematic style reference when useful
\${styleGuide}
- 35-55 words total
- NO text, watermarks, or UI elements

Return ONLY the prompt, nothing else.`;

const neu = `Rules:
- Show the SPECIFIC action, exercise, object or scene the narrator describes — not a generic version
- REALISTIC documentary-style photography — NOT clickbait, NOT overdone stock photos
- Show ORDINARY RELATABLE people — not fitness models, not overdone bodybuilders
- For exercises: show the exact exercise being performed (squats = squats, pull-ups = pull-ups)
- For history: show real struggle and humanity — not just heroic epic shots
- For finance: real people in real situations — not luxury lifestyle imagery
- Style: photojournalism, candid, documentary. Real lighting. Real people. Real moments.
- Camera: natural eye-level or slight angles — avoid extreme low-angle hero shots
- Avoid: perfect lighting, glamour photography, stock photo aesthetics, clickbait imagery
\${styleGuide}
- 35-55 words total
- NO text, watermarks, or UI elements

Return ONLY the prompt, nothing else.`;

if (code.includes(old)) {
  code = code.replace(old, neu);
  console.log('✅ Fix 3: Image rules updated — realistic, documentary, relatable');
} else {
  console.log('❌ Still not found — dumping context around "Rules:"');
  const idx = code.indexOf('Rules:\n- Lead with');
  if (idx > -1) console.log(JSON.stringify(code.slice(idx, idx+400)));
}

fs.writeFileSync(file, code);
