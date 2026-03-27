import fs from 'fs';

const pipelineFile = '/opt/videoforge/src/pipeline.js';
let code = fs.readFileSync(pipelineFile, 'utf8');

// ── FIX A: isHistorical detection — don't rely solely on video bible ──────────
// If video bible fails (returns empty era), fall back to topic-based detection
// This prevents Roman imagery on gym videos when the bible fails silently

const oldIsHistorical = `  const isHistorical = eraContext && eraContext !== "modern" && eraContext !== "";`;
const newIsHistorical = `  // Robust historical detection — video bible + topic string backup
  const historicalTopicWords = /roman|greek|ancient|medieval|empire|century|dynasty|viking|pharaoh|war|revolution|battle|kingdom|civilization|historical|history|renaissance|colonial|ottoman|mongol|feudal|babylon|egypt|persia|sparta/i;
  const modernTopicWords = /gym|workout|fitness|exercise|diet|nutrition|finance|invest|stock|crypto|business|startup|youtube|social media|instagram|tiktok|health|wellness|coding|tech|ai|entrepreneur|marketing|weight loss|muscle|bodybuilding/i;
  const topicIsModern = modernTopicWords.test(basicPrompt);
  const topicIsHistorical = !topicIsModern && historicalTopicWords.test(basicPrompt);
  const isHistorical = (eraContext && eraContext !== "modern" && eraContext !== "" && !topicIsModern) || topicIsHistorical;`;

if (code.includes(oldIsHistorical)) {
  code = code.replace(oldIsHistorical, newIsHistorical);
  console.log('✅ Fix A: isHistorical detection now uses topic string as backup');
} else {
  console.log('❌ Fix A: isHistorical line not found');
}

// ── FIX B: Modern setting guard — make it niche-aware, not blanket ────────────
// "Modern day" is wrong for horror, true crime, atmospheric content
// Fix: detect niche from basicPrompt and give appropriate setting guidance

const oldSettingLine = `\${isHistorical ? \`ERA: \${eraContext} — period-accurate visuals ONLY. Zero modern elements.\` : \`SETTING: Modern day contemporary imagery. Do NOT generate ancient, medieval, Roman, Greek, or warrior imagery unless the narrator explicitly describes those things.\`}`;
const newSettingLine = `\${isHistorical ? \`ERA: \${eraContext} — period-accurate visuals ONLY. Zero modern elements whatsoever.\` : topicIsModern ? \`SETTING: Modern day. Use contemporary realistic imagery matching the topic. No ancient, medieval, Roman, Greek, or warrior imagery.\` : /horror|scary|dark|paranormal|haunted|murder|crime|thriller/i.test(basicPrompt) ? \`SETTING: Dark atmospheric modern world. Eerie, suspenseful, cinematic horror style. No ancient warrior imagery.\` : \`SETTING: Match the visual world of the topic. Contemporary unless the script explicitly describes a historical setting.\`}`;

if (code.includes(oldSettingLine)) {
  code = code.replace(oldSettingLine, newSettingLine);
  console.log('✅ Fix B: Setting guard is now niche-aware (horror/modern/historical)');
} else {
  console.log('❌ Fix B: setting line not found');
}

// ── FIX C: Subtitle phrase grouping — respect sentence boundaries ─────────────
// Current: groups every 5 words regardless of sentences
// Problem: "...he died. The next" could be one phrase — bad
// Fix: split at sentence boundaries first, then group within sentences

const oldPhraseGroup = `  // Group into phrases of 5 words — each phrase = one on-screen line
  const PHRASE_SIZE = 5;
  const phrases = [];
  for (let i = 0; i < wordTimestamps.length; i += PHRASE_SIZE) {
    const group = wordTimestamps.slice(i, i + PHRASE_SIZE);
    if (!group.length) break;
    phrases.push({ words: group, start: group[0].start, end: group[group.length-1].end + 0.15 });
  }`;

const newPhraseGroup = `  // Group into phrases of 4-5 words, respecting sentence boundaries
  // Never split a phrase across a sentence-ending punctuation
  const PHRASE_SIZE = 5;
  const phrases = [];
  let phraseBuffer = [];
  
  for (let i = 0; i < wordTimestamps.length; i++) {
    const w = wordTimestamps[i];
    phraseBuffer.push(w);
    
    // Check if this word ends a sentence or phrase is full
    const endsPhrase = phraseBuffer.length >= PHRASE_SIZE;
    const endsSentence = /[.!?]$/.test(w.word.trim());
    const isLast = i === wordTimestamps.length - 1;
    
    if (endsPhrase || endsSentence || isLast) {
      if (phraseBuffer.length > 0) {
        phrases.push({
          words: [...phraseBuffer],
          start: phraseBuffer[0].start,
          end: phraseBuffer[phraseBuffer.length - 1].end + 0.15
        });
        phraseBuffer = [];
      }
    }
  }`;

if (code.includes(oldPhraseGroup)) {
  code = code.replace(oldPhraseGroup, newPhraseGroup);
  console.log('✅ Fix C: Subtitle phrases now respect sentence boundaries');
} else {
  console.log('❌ Fix C: phrase group not found');
}

fs.writeFileSync(pipelineFile, code);
console.log('\n✅ Done — pipeline.js saved');
