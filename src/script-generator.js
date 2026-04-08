import axios from "axios";
import { reviewAndPolishScript } from "./script-review.js";
import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";

// ─── REFERENCE LIBRARY LEARNING ─────────────────────────────────────────────
// Load top-performing real videos from /opt/videoforge/video-library so the
// scriptwriter can learn from titles + descriptions of videos that actually
// got millions of views. Per Niels: scripts from top performers should
// inform new scripts. (Transcripts aren't yet downloaded — falls back to
// title + description, which is still strong signal for hook patterns.)
const VIDEO_LIBRARY_DIR = '/opt/videoforge/video-library';
let _topRefsCache = null;

function loadTopReferences() {
  if (_topRefsCache) return _topRefsCache;
  _topRefsCache = [];
  if (!fs.existsSync(VIDEO_LIBRARY_DIR)) return _topRefsCache;
  try {
    for (const id of fs.readdirSync(VIDEO_LIBRARY_DIR)) {
      const metaPath = path.join(VIDEO_LIBRARY_DIR, id, 'metadata.json');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const m = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (!m.title || !m.viewCount) continue;
        _topRefsCache.push({
          id,
          title: m.title,
          channel: m.channel,
          views: m.viewCount,
          description: (m.description || '').substring(0, 800),
          transcript: m.transcript || null,
        });
      } catch (e) {}
    }
    _topRefsCache.sort((a, b) => b.views - a.views);
  } catch (e) {
    /* directory missing or unreadable */
  }
  return _topRefsCache;
}

// Build a few-shot block of top-performing references for the scriptwriter prompt.
// Picks the top N by view count, optionally filtered by topic keyword overlap.
function buildReferenceBlock(topic, niche, n = 5) {
  const refs = loadTopReferences();
  if (refs.length === 0) return '';

  // Score references by topic keyword overlap so the scriptwriter sees
  // semantically relevant examples, not just the highest-view ones.
  const topicWords = new Set(topic.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const nicheWords = new Set((niche || '').toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const scored = refs.map(r => {
    const titleWords = new Set(r.title.toLowerCase().split(/\W+/));
    let overlap = 0;
    for (const w of topicWords) if (titleWords.has(w)) overlap += 3;
    for (const w of nicheWords) if (titleWords.has(w)) overlap += 1;
    return { ...r, relevance: overlap, viewBonus: Math.log10(Math.max(1, r.views)) };
  });
  // Sort by relevance first, then by views as tiebreaker
  scored.sort((a, b) => (b.relevance - a.relevance) || (b.viewBonus - a.viewBonus));
  const picks = scored.slice(0, n);

  const lines = [
    '═══ TOP-PERFORMING REFERENCE VIDEOS (learn from these) ═══',
    `Below are ${picks.length} real YouTube videos with millions of views, selected for relevance to your topic. Study their TITLE PATTERNS (how they hook), their DESCRIPTION OPENERS (how they set the stakes), and the language they use. Your script should match this energy — not copy the topic, but copy the craft.`,
    '',
  ];
  for (const p of picks) {
    lines.push(`• "${p.title}" — ${p.channel} (${p.views.toLocaleString()} views)`);
    if (p.description) {
      const firstParagraph = p.description.split(/\n/)[0].substring(0, 400);
      lines.push(`  Opener: "${firstParagraph}"`);
    }
    lines.push('');
  }
  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Script Generator v40 — Complete Rewrite
 *
 * What changed:
 * - Genius hook system: 8 distinct hook patterns, Claude picks the best one for the topic
 * - Human voice first: reads like a real person, not a content template
 * - Long video support: proper narrative arc across blocks (setup → escalation → payoff)
 * - Full order brief integration: niche, tone, key points, CTA deeply woven in
 * - Hook pacing flag: first 30s forces fast cuts in director
 * - No AI clichés enforced more aggressively
 * - 40-50 min video support: up to 5 blocks, each with a defined role
 */

// ─── MODE DETECTION ──────────────────────────────────────────────────────────

const INFOGRAPHIC_KEYWORDS = [
  "invest", "stock", "dividend", "portfolio", "compound", "index fund", "etf", "bond", "market",
  "finance", "money", "broke", "salary", "budget", "saving", "debt", "wealth", "net worth",
  "health", "medical", "body", "nutrition", "diet", "exercise", "fitness", "wellness", "vitamin",
  "sugar", "calorie", "protein", "cholesterol", "blood pressure", "heart rate",
  "science", "physics", "chemistry", "biology", "experiment", "research", "study", "data",
  "business", "startup", "revenue", "profit", "growth", "marketing", "conversion",
  "real estate", "mortgage", "rent", "property", "housing",
  "crypto", "bitcoin", "blockchain", "ethereum",
  "side hustle", "passive income", "make money", "freelance", "entrepreneur",
  "psychology", "brain", "cognitive", "bias", "behavior", "habit",
  "productivity", "sleep", "routine", "dopamine", "cortisol",
  "comparison", "versus", "vs", "better than", "worse than",
  "top 10", "top 5", "ranking", "ranked", "best", "worst",
  "insurance", "policy", "coverage", "premium", "deductible",
  "tax", "irs", "401k", "roth", "pension", "retirement",
];

const VISUAL_KEYWORDS = [
  "horror", "scary", "creepy", "haunted", "ghost", "demon", "paranormal", "murder",
  "true crime", "crime", "serial killer", "cold case", "detective", "investigation",
  "travel", "destination", "country", "tourism", "adventure", "explore", "vacation", "visit", "places", "city", "cities", "beach", "island",
  "celebrity", "actor", "singer", "rapper", "influencer", "famous", "biography",
  "movie", "film", "tv show", "netflix", "series", "recap", "review", "box office",
  "entertainment", "gaming", "video game", "anime", "manga",
  "food", "cooking", "recipe", "restaurant", "cuisine", "chef",
  "nature", "animal", "wildlife", "ocean", "mountain", "forest",
  "mystery", "unsolved", "conspiracy", "legend", "myth", "folklore",
  "sports", "nba", "nfl", "soccer", "football", "basketball", "athlete",
  "history", "ancient", "medieval", "empire", "war", "civilization",
  "luxury", "supercar", "mansion", "yacht", "rolex", "ferrari",
  "story time", "reddit", "askreddit",
];

const DOCUMENTARY_KEYWORDS = [
  "history", "ancient", "medieval", "empire", "war", "civilization", "century",
  "dynasty", "roman", "egypt", "greek", "viking", "mongol", "ottoman", "colonial",
  "revolution", "world war", "battle", "kingdom", "pharaoh", "renaissance",
  "collapsed", "collapse", "rise and fall", "rise of", "fall of", "how did",
  "why did", "the truth about", "forgotten", "lost civilization", "dark ages",
];

function detectMode(topic, niche) {
  const lower = topic.toLowerCase();
  const nicheL = (niche || "").toLowerCase();
  // Documentary mode: history topics or history niche
  for (const kw of DOCUMENTARY_KEYWORDS) { if (lower.includes(kw)) return "documentary"; }
  if (/history|historical|ancient|documentary/.test(nicheL)) return "documentary";
  let infraScore = 0;
  let visualScore = 0;
  for (const kw of INFOGRAPHIC_KEYWORDS) { if (lower.includes(kw)) infraScore++; }
  for (const kw of VISUAL_KEYWORDS) { if (lower.includes(kw)) visualScore++; }
  if (visualScore >= infraScore) return "visual";
  return "infographic";
}

// ─── HOOK SYSTEM ─────────────────────────────────────────────────────────────

const HOOK_PATTERNS = `
HOOK PATTERN LIBRARY — Pick ONE pattern that best fits this specific topic. Do not blend them. Execute it perfectly.

PATTERN 1 — THE STOLEN STATISTIC
Open with one number so surprising it stops the scroll. Then immediately make it personal.
Example: "Ninety-three percent of people who start investing quit within the first year. Not because the market crashed. Because they got bored."
Best for: finance, health, psychology, productivity

PATTERN 2 — THE COLD OPEN SCENE
Drop the viewer into a specific moment, no setup. A person, a place, a time. Make it cinematic.
Example: "June fourteenth, two thousand nine. A man named Bernie Madoff walks into a federal courthouse in a grey suit. In his coat pocket is a handwritten list of one hundred and seventy-two names. Every single one of them trusted him with everything they had."
Best for: true crime, history, biography, documentary

PATTERN 3 — THE DIRECT CHALLENGE
Tell the viewer something they believe is wrong. Don't soften it.
Example: "Everything you've been told about saving money is designed to keep you broke."
Best for: finance, health myths, psychology, self-improvement

PATTERN 4 — THE CURIOSITY GAP
Set up a question the viewer cannot answer yet — and make them desperate to know.
Example: "There's a country where people live an average of ninety-two years. No fancy medicine. No expensive supplements. Just three daily habits most people think are bad for you."
Best for: health, travel, science, mystery

PATTERN 5 — THE BEFORE AND AFTER
Show the transformation first. Then let the video explain how it happened.
Example: "In twenty nineteen, he was three hundred thousand dollars in debt, working double shifts at a gas station. By twenty twenty-three, he'd sold his company for eleven million dollars. This is what he did differently."
Best for: biography, business, self-improvement, finance

PATTERN 6 — THE UNCOMFORTABLE TRUTH
Say something true that nobody else will say directly.
Example: "The reason you haven't built wealth yet isn't the economy. It isn't your income. It's one habit you probably don't even realize you have."
Best for: psychology, self-improvement, finance, health

PATTERN 7 — THE WILD CLAIM (backed immediately)
Make a bold statement that sounds insane — then prove it's real.
Example: "The average American unknowingly donates four thousand dollars a year to corporations. Completely legally. Without realizing it. Here's where it's going."
Best for: finance, consumer habits, psychology, conspiracy

PATTERN 8 — THE STAKES OPENER
Tell the viewer exactly what's at risk if they don't watch this.
Example: "In the next ten years, artificial intelligence will eliminate sixty percent of white-collar jobs. The people who survive will all have done one specific thing. Most people have never heard of it."
Best for: tech, career, finance, future trends
`;

// ─── SHARED WRITING RULES ────────────────────────────────────────────────────

const UNIVERSAL_VOICE_RULES = `
═══ VOICE — NON-NEGOTIABLE ═══
You are writing for a HUMAN narrator. Every sentence must sound like a real person talking — not a blog post, not a Wikipedia article, not a content brief.

THE GOLDEN TEST: Read every paragraph out loud. If it sounds like something a robot would say, rewrite it.

WHAT MAKES IT HUMAN:
- Contractions always: "you've", "that's", "it's", "wouldn't", "they'd", "we're"
- Sentence fragments for punch: "Not what you'd expect." / "And it gets worse." / "Every single time."
- Direct address constantly: "you", "your", "here's what you need to know"
- Unexpected comparisons: "It's like trying to fill a bathtub with the drain open"
- Admit things: "Here's the part most people get wrong." / "Nobody talks about this."
- Rhetorical questions that feel genuinely curious: not "So what does this mean?" but "Why would anyone do that?"
- Short sentences after long ones. Rhythm. Variation. The kind that makes someone lean in.

BANNED FOREVER — these words will not appear anywhere in this script:
"dive into", "delve", "landscape", "game-changer", "let's unpack", "it's worth noting",
"in today's world", "at the end of the day", "make no mistake", "the fact of the matter",
"when it comes to", "in conclusion", "to summarize", "moreover", "furthermore",
"it is important to", "needless to say", "rest assured", "touch base",
"leverage", "synergy", "paradigm", "holistic", "robust", "seamless",
"cutting-edge", "state-of-the-art", "revolutionary", "groundbreaking",
"fascinating", "interesting", "incredible", "amazing", "unbelievable" (these are lazy — show don't tell),
"picture this" (overused YouTube cliché — find a more original scene opener),
"fast forward" (lazy transition — write the scene properly instead),
"throughout history", "since the dawn of time", "in the world of",
"needless to say", "it goes without saying", "believe it or not"

BANNED SENTENCE STARTERS:
Never start a sentence with "As", "While", "Furthermore", "Additionally", "In addition",
"It's important to note", "It's worth mentioning", "This means that", "Picture this", "Fast forward"

NUMBER RULES:
- Spell out ALL numbers as words: "thirty-eight percent" not "38%"
- Spell out years naturally: "two thousand nineteen" not "2019"
- This is read by text-to-speech. Write EXACTLY how it should sound.
- Foreign place names: use English pronunciation. "Barcelona" not "Barthelona". "Beijing" not "Bay-jhing".

FORMAT RULES:
- Write ONLY narration text — no [brackets], no stage directions, no (parenthetical notes)
- Blank lines between paragraphs — these become natural pauses
- Numbered sections: "Number one. SECTION TITLE." on its own line
- No headers, no bullet points, no markdown — pure narration only
`;

// ─── NICHE ANIMATION HINTS ───────────────────────────────────────────────────
// Tells the scriptwriter what visual moments to write to trigger the RIGHT
// animation components in the director. Script creates natural opportunities.

const NICHE_ANIMATION_HINTS = {
  history: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══
This video uses cinematic animations matched to specific sentence patterns. Write to create these moments:

DATE + LOCATION STAMPS → Write chapter openers as: "September fourth, 476 AD. Ravenna, Italy."
HISTORICAL QUOTES → Write real quotes as: "Caesar turned to his officers. 'The die is cast.'"
DECLINING NUMBERS → Write as stark contrast: "Five hundred thousand soldiers in 100 AD. One hundred thousand by 400 AD."
TWO OPPOSING FORCES → Name both sides with numbers: "Sixty thousand Roman legionaries. Eighty thousand Visigoths."
VERDICTS & OUTCOMES → State as blunt final sentences: "The Republic was finished. Gone. Replaced forever."
CHAPTER TITLES → Say chapter name out loud: "Chapter two. The soldier's bargain."
TIMELINE SEQUENCES → List years as a sequence: "First 44 BC. Then 31 BC. Then 27 BC."
POPULATION LOSS → State as stark numbers: "Twenty-five thousand Romans died at Adrianople. In one afternoon."
`,

  finance: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══

SHOCKING STATS → One number per punch: "Ninety-six percent of Americans retire with less than one million dollars."
DOLLAR GROWTH → Write as a journey: "Ten thousand in 1990. Four hundred thousand by 2026."
DIRECT COMPARISONS → Rich vs poor explicitly: "Average person saves five percent. The wealthy save forty."
PERCENTAGES → State as a fill-up: "Seventy-eight percent of Americans live paycheck to paycheck."
NUMBERED STEPS → Number them out loud: "Step one: pay yourself first. Step two: invest the rest."
BOLD VERDICTS → State conclusion bluntly: "The savings account is not an investment. It is a trap."
`,

  true_crime: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══

CRIME SCENE OPENER → Exact time and place: "Tuesday, October fourteenth. Eleven forty-seven PM. Outside apartment 4B."
EVENT SEQUENCE → Times in order: "Ten PM she left the bar. Ten fifteen — CCTV footage. By midnight — nothing."
HIDDEN INFORMATION → Signal suppression: "What the FBI redacted for thirty years was this."
SHOCKING VERDICT → State as outcome: "Not guilty. After six weeks of testimony. Not guilty."
EVIDENCE LIST → List three things: "Three things connected him: a fingerprint, a receipt, one witness."
`,

  creator: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══

FOLLOWER COUNTS → State with context: "Zero to twelve million in eighteen months."
VIRAL MOMENTS → Numbers first: "One video. Forty-seven seconds. Two hundred million views."
RANKINGS → Number explicitly: "Number one: consistency. Number two: thumbnails. Number three: the first five seconds."
BEFORE/AFTER → Clear contrast: "January: one hundred viewers. December: six figures in brand deals."
`,

  business: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══

GROWTH MILESTONES → Year by year: "Year one: ten thousand. Year three: one million. Year five: twenty million."
HABIT STREAKS → Days as a chain: "Twenty-one days. Every single morning. Without exception."
VERSUS MINDSETS → Explicit contrast: "Most people trade time for money. The wealthy build systems that earn while they sleep."
`,

  horror: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══

DREAD OPENER → Time and place: "March third, 1978. 2:17 in the morning. Room 217."
THE REVEAL → Blunt and cold: "They were never alone. Not one night. Not ever."
SUPPRESSED TRUTH → Signal the hidden: "The police report was sealed for twenty years."
`,

  travel: `
═══ VISUAL MOMENT GUIDE — WRITE THESE INTO YOUR SCRIPT ═══

DESTINATION INTRO → Lead with key facts: "Tokyo. Population fourteen million. The most visited city on Earth."
ARRIVAL → Describe the moment: "Landing in Tokyo feels like stepping into the future."
CULTURAL CONTRAST → Two places directly: "In Japan, a train delayed one minute makes national news."
`,
};

function getAnimationHints(mode, niche) {
  const n = (niche || '').toLowerCase();
  if (mode === 'documentary') return NICHE_ANIMATION_HINTS.history || '';
  if (/finance|invest|wealth|money|stock|crypto|saving/.test(n)) return NICHE_ANIMATION_HINTS.finance || '';
  if (/true.?crime|crime|murder|mystery|detective/.test(n)) return NICHE_ANIMATION_HINTS.true_crime || '';
  if (/creator|youtube|social.?media|influencer|content|viral/.test(n)) return NICHE_ANIMATION_HINTS.creator || '';
  if (/business|entrepreneur|startup|hustle|side.?hustle/.test(n)) return NICHE_ANIMATION_HINTS.business || '';
  if (/horror|scary|paranormal|ghost|haunted/.test(n)) return NICHE_ANIMATION_HINTS.horror || '';
  if (/travel|destination|tourism|adventure/.test(n)) return NICHE_ANIMATION_HINTS.travel || '';
  return '';
}

// ─── INFOGRAPHIC PROMPT ──────────────────────────────────────────────────────

function buildInfographicPrompt(topic, duration, style, keyPoints, ctaText, niche, blockRole) {
  const targetWords = Math.round(parseInt(duration) * 130);
  const minWords = Math.round(targetWords * 0.92);
  const maxWords = Math.round(targetWords * 1.08);

  const keyPointsSection = keyPoints ? `
═══ REQUIRED TALKING POINTS — CUSTOMER-SPECIFIED ═══
These points MUST be the backbone of the script. Build the entire narrative around them. Cover every single one.
${keyPoints}
` : '';

  const ctaSection = ctaText ? `
═══ CALL TO ACTION — CUSTOMER-SPECIFIED ═══
Use this exact CTA: "${ctaText}"
Place it TWICE: once naturally after the hook (~30 seconds in), once as the very last line.
Weave it in — don't just drop it. Example: "And if this is the kind of content you want more of, ${ctaText}."
` : '';

  const nicheHint = niche ? `NICHE: ${niche} — write with the language, references, and examples that resonate with this audience.` : '';
  const blockNote = blockRole ? `\nSCRIPT ROLE: ${blockRole}\n` : '';

  const animHints = getAnimationHints('infographic', niche);
  const referenceBlock = buildReferenceBlock(topic, niche, 5);

  return `You are the best YouTube scriptwriter alive. You write for faceless channels that get millions of views because your scripts are genuinely gripping — not because they follow a template, but because they sound like a real person who actually cares about this topic.

The current year is 2026.

TOPIC: "${topic}"
TONE: ${style}
${nicheHint}
${blockNote}
${keyPointsSection}
${ctaSection}
${animHints}
THIS IS A DATA-DRIVEN VIDEO. It will be paired with animated charts, number reveals, stat cards, and infographics. Write to CREATE moments where a number or comparison lands hard — the visuals will amplify it.

${referenceBlock}

${HOOK_PATTERNS}

═══ STRUCTURE ═══

HOOK (first 45-60 seconds — CRITICAL):
Pick the single best hook pattern from the library above and execute it perfectly.
The hook must do THREE things in order:
1. Stop the scroll — one sentence that demands attention
2. Raise the stakes — why does this matter to the viewer specifically
3. Make a promise — what they'll know by the end that they don't know now

After the hook, drop ONE early pattern interrupt: a surprising fact, a counterintuitive claim, or a "here's what nobody tells you" moment. This is what keeps people past the 30-second mark.

BODY (numbered sections, 3-6 depending on length):
Each section MUST be more intense than the one before it. The video escalates — every section raises the stakes.
Each section needs:
- A punchy section title said out loud ("Number one. The mistake everyone makes.")
- An open loop before it ("But before we get there, here's something you need to know.")
- At least 3 specific numbers, stats, or data points per section
- One comparison or analogy that makes the data feel real — something the viewer can picture
- A micro-cliffhanger at the end leading to the next section
- At least one sentence connecting this to the VIEWER's life ("That means if you're earning the average salary, you're already...")

EMOTIONAL ESCALATION — MANDATORY:
Section 1: Establish the problem or situation. Make it real.
Section 2: Deepen it. Show the scale. Make them feel it personally.
Section 3+: The twist, the revelation, the thing nobody talks about. This is where the video lives.
Final section: The resolution or call to action. What do they do NOW with this information?

SUBSCRIBE CTA — MANDATORY at ~40% mark:
This is NON-NEGOTIABLE. Must appear. Natural integration only — never forced.
Example: "If you're finding this useful, hit subscribe — we break down this kind of stuff every week."
Example: "This is the kind of thing they don't teach in school. Subscribe so you don't miss the next one."
DO NOT SKIP THIS.

VIEWER CONNECTION — MANDATORY:
Every section must have at least one sentence that brings the information back to the viewer personally.
Not "people do X" — but "you probably do X" or "if you're like most people watching this..."
The viewer must feel like this video was made specifically for them.

CLOSE (final 60-90 seconds):
- The single biggest takeaway — one sentence, unforgettable
- What the viewer should do TODAY — specific, actionable
- A final thought that makes them think about this tomorrow
- CTA if provided

═══ DATA REQUIREMENTS ═══
This script MUST contain at least ${Math.max(15, Math.round(parseInt(duration) * 2))} specific numbers, stats, or data points.
Every claim needs a number. Every comparison needs real figures. No vague statements.

Good: "Your cortisol drops by thirty-eight percent within the first week of cutting out processed sugar."
Bad: "Your stress levels decrease significantly."

Good: "In two thousand ten, the average American household had four thousand dollars saved. By two thousand twenty-four, that number hadn't moved — it was four thousand one hundred dollars. Fifteen years of inflation-adjusted nothing."
Bad: "Savings rates haven't improved much over the years."

${UNIVERSAL_VOICE_RULES}

WORD COUNT — CRITICAL:
Target: ${targetWords} words (${duration} minutes × 130 words per minute)
Minimum: ${minWords} words — going below this is a FAILURE
Maximum: ${maxWords} words

IMPORTANT: Most AI scripts run short because they don't develop their points fully.
Fight this tendency. Every section should feel complete. Every claim should be explained.
Every number should have context. If you finish a section in 3 sentences, it needs more.
A ${duration}-minute video needs ${targetWords} words. Count carefully before finishing.

Write the complete script now. No preamble, no "Here is your script:" — just start with the first word of the hook.`;
}

// ─── DOCUMENTARY PROMPT ─────────────────────────────────────────────────────

function buildDocumentaryPrompt(topic, duration, style, keyPoints, ctaText, niche, blockRole) {
  const targetWords = Math.round(parseInt(duration) * 140);
  const minWords = Math.round(targetWords * 0.92);
  const maxWords = Math.round(targetWords * 1.08);

  const keyPointsSection = keyPoints ? `
═══ REQUIRED TALKING POINTS ═══
${keyPoints}
` : '';
  const ctaSection = ctaText ? `
═══ CALL TO ACTION ═══
Use this exact CTA: "${ctaText}"
Place it TWICE: once naturally at ~40%, once at the very end.
` : '';
  const blockNote = blockRole ? `
SCRIPT ROLE: ${blockRole}
` : '';

  const animHints = getAnimationHints('documentary', niche);
  const referenceBlock = buildReferenceBlock(topic, niche, 5);

  return `You are a world-class documentary narrator — think Ken Burns, David Attenborough, or the voice behind The Last Kingdom. You write history that feels alive. Not a textbook. A story.

The current year is 2026.

TOPIC: "${topic}"
TONE: ${style || "dramatic, cinematic, documentary"}
NICHE: ${niche || "history"}
${blockNote}
${keyPointsSection}
${ctaSection}
${animHints}
THIS IS A CINEMATIC DOCUMENTARY. Every sentence should feel like it belongs in a Netflix historical documentary. Specific people, specific dates, specific places. No vague summaries.

${referenceBlock}

${HOOK_PATTERNS}

═══ DOCUMENTARY STRUCTURE ═══

COLD OPEN (first 30-45 seconds):
Drop the viewer into a specific moment in history. A specific day, a specific person, a specific crisis.
Not "Rome was powerful" — but "It is the fifth of September, 476 AD, and a fourteen-year-old boy is about to become the last emperor of Rome."
Create immediate tension. The viewer should feel they're watching history happen.

HOOK PROMISE:
After the cold open, make one direct promise to the viewer.
"By the end of this, you'll understand why the most powerful civilization in human history destroyed itself — and why the same thing is happening right now."

BODY (3-6 chapters, each with a title):
Each chapter needs:
- A specific person, place, or event as the anchor
- Exact dates, names, numbers — no vague "many years later"
- Vivid scene-setting: weather, architecture, sounds, smells if relevant
- The human element — what did real people feel, fear, decide?
- A revelation at the end that forces you into the next chapter

PACING:
- Short punchy sentences for action and drama
- Longer flowing sentences for context and atmosphere
- Vary constantly. Never three long sentences in a row.
- Every 2-3 paragraphs: a moment of pure drama that makes the viewer lean forward

SUBSCRIBE CTA — MANDATORY at ~40% mark:
Stories like this get buried. Subscribe so you don't miss the next one.

MODERN RELEVANCE — MANDATORY in final chapter:
Connect this historical story to today. Why does it matter in 2026?
What does it tell us about power, money, politics, human nature — right now?

CLOSE:
End with one unforgettable line. Not a summary. A statement that echoes.

BANNED FOREVER:
"dive into", "delve", "landscape", "game-changer", "let's unpack", "it's worth noting",
"in today's world", "at the end of the day", "throughout history", "since the dawn of time",
"picture this", "fast forward", "fascinating", "interesting", "incredible",
"in conclusion", "to summarize", "make no mistake"

WORD COUNT — CRITICAL:
Target: ${targetWords} words (${duration} minutes × 140 words per minute)
Minimum: ${minWords} words — going below this is a FAILURE
Maximum: ${maxWords} words
Fight the urge to summarize. Develop every moment fully. A ${duration}-minute documentary needs ${targetWords} words of real storytelling.

Write the complete script now. No preamble — drop straight into the cold open.`;
}

// ─── VISUAL PROMPT ───────────────────────────────────────────────────────────

function buildVisualPrompt(topic, duration, style, keyPoints, ctaText, niche, blockRole) {
  const targetWords = Math.round(parseInt(duration) * 130);
  const minWords = Math.round(targetWords * 0.92);
  const maxWords = Math.round(targetWords * 1.08);

  const keyPointsSection = keyPoints ? `
═══ REQUIRED TALKING POINTS — CUSTOMER-SPECIFIED ═══
These points MUST be covered. Build the narrative around them. Cover every single one.
${keyPoints}
` : '';

  const ctaSection = ctaText ? `
═══ CALL TO ACTION — CUSTOMER-SPECIFIED ═══
Use this exact CTA: "${ctaText}"
Place it TWICE: once naturally after the hook (~30 seconds in), once as the very last line.
` : '';

  const nicheHint = niche ? `NICHE: ${niche} — write with the tone, references, and pacing that this audience expects.` : '';
  const blockNote = blockRole ? `\nSCRIPT ROLE: ${blockRole}\n` : '';

  const animHints = getAnimationHints('visual', niche);
  const referenceBlock = buildReferenceBlock(topic, niche, 5);

  return `You are the best YouTube scriptwriter alive. You write for faceless channels that get millions of views because your scripts feel alive — they're cinematic, paced perfectly, and they make people forget they're watching a faceless video.

The current year is 2026.

TOPIC: "${topic}"
TONE: ${style}
${nicheHint}
${blockNote}
${keyPointsSection}
${ctaSection}
${animHints}
THIS IS A VISUAL-NARRATIVE VIDEO. It will be paired with real photographs, AI-generated imagery, and cinematic b-roll. Every sentence you write should make the video team know exactly what image to find. Write so visually that a blind person could see it.

${referenceBlock}

${HOOK_PATTERNS}

═══ STRUCTURE ═══

HOOK (first 45-60 seconds — CRITICAL):
Pick the single best hook pattern from the library above and execute it perfectly.
Do NOT use a statistic hook for a visual topic — use scene-setting, cold opens, or stakes.
The hook must:
1. Drop the viewer into a specific moment, place, or person
2. Create immediate tension or curiosity
3. Make a promise: what they'll discover by the end

After the hook: one early pattern interrupt. A twist the viewer didn't see coming. This is what keeps them past 30 seconds.

BODY (numbered sections, 3-6 depending on length):
Each section MUST be more intense than the one before it. The story escalates — tension builds, stakes rise.
Each section needs:
- A punchy section title said out loud
- Scene-setting that creates a vivid mental image — specific location, time, person
- Specific details — names, dates, places, direct quotes (not vague summaries)
- Emotional beats — moments where the viewer genuinely feels something (dread, awe, anger, inspiration)
- A micro-cliffhanger at the end leading to the next section
- At least one sentence connecting this story to the VIEWER's world today

EMOTIONAL ESCALATION — MANDATORY:
Section 1: Set the scene. Introduce the person, place, or situation. Build investment.
Section 2: Complicate it. The first twist. Something the viewer didn't expect.
Section 3+: The turning point. The biggest revelation. The moment everything changes.
Final section: The aftermath and meaning. Why does this story matter RIGHT NOW in 2026?

PACING RULES:
- Vary sentence length deliberately. Short. Then a longer one that builds momentum and carries the viewer somewhere unexpected before landing hard.
- Use white space (blank lines) to create pause and breath
- Every 60-90 seconds: shift location, introduce someone new, or reveal a twist

SUBSCRIBE CTA — MANDATORY at ~40% mark:
This is NON-NEGOTIABLE. Must appear. Natural only — never forced.
Example: "Stories like this one don't make it into history books. Subscribe so you catch the next one."
Example: "If you want to know how this ends — and trust me, you do — make sure you're subscribed."
DO NOT SKIP THIS.

MODERN RELEVANCE — MANDATORY in closing:
The final section must connect this story to TODAY. Why does it matter to someone watching in 2026?
What can the viewer take from this? What does it say about the world they're living in right now?
One paragraph minimum. This is what separates a good video from a great one.

CLOSE (final 60-90 seconds):
- The emotional payoff — what this story ultimately means
- The modern connection — why this still matters today
- A final image or thought that the viewer will still be thinking about tomorrow
- CTA if provided

═══ VISUAL WRITING RULES ═══
Write so every sentence creates an image. The video system searches for photos matching your descriptions.
Describe scenes with: people (not named unless real), locations, time periods, weather, lighting, action.

Good: "The waiting room was empty except for one woman in a yellow coat, staring at a phone that wasn't ringing."
Bad: "People were waiting anxiously."

Good: "He stood on the roof of the building at three in the morning, looking out at a city that had no idea who he was yet."
Bad: "He was determined to succeed."

${UNIVERSAL_VOICE_RULES}

WORD COUNT — CRITICAL:
Target: ${targetWords} words (${duration} minutes × 130 words per minute)
Minimum: ${minWords} words — going below this is a FAILURE
Maximum: ${maxWords} words

IMPORTANT: Most scripts run short because scenes aren't fully developed.
Fight this tendency. Let scenes breathe. Give characters depth. Let revelations land properly.
If you finish a section in 3 sentences, it needs more. Develop it.
A ${duration}-minute video needs ${targetWords} words. Count carefully before finishing.

Write the complete script now. No preamble — just start with the first word of the hook.`;
}

// ─── BLOCK ROLES FOR LONG VIDEOS ─────────────────────────────────────────────

function getBlockRoles(totalBlocks) {
  if (totalBlocks === 1) return [null];
  if (totalBlocks === 2) return [
    "OPENING (hook + first half of content). End with a strong cliffhanger that makes the second half essential.",
    "CLOSING (second half + conclusion). Pick up naturally from where the first block ended. End with full emotional payoff and CTA.",
  ];
  if (totalBlocks === 3) return [
    "OPENING (hook + setup + first section). Establish the stakes. End with 'but here's where it gets complicated...'",
    "MIDDLE (escalation + 2-3 core sections). This is the meat. Build toward the biggest reveal. End with the most surprising twist.",
    "CLOSING (final section + conclusion + CTA). Deliver the payoff. Make the ending unforgettable.",
  ];
  if (totalBlocks === 4) return [
    "OPENING (hook + context + section 1). Establish the stakes and promise. End mid-thought to force continuation.",
    "DEVELOPMENT (sections 2-3). Build the case. Include the first major surprise. End with 'but the real story is even stranger...'",
    "ESCALATION (sections 4-5). The biggest reveals. Maximum tension or most surprising data. End with 'and this brings us to the part that changes everything...'",
    "CLOSING (final section + conclusion + CTA). The full payoff. Emotional landing. Memorable final line.",
  ];
  // 5+ blocks (40-60+ min)
  const roles = [
    "OPENING (hook + strong intro + section 1). Hook must be the best of the entire video. End with a promise of what's coming.",
    "DEVELOPMENT (sections 2-3). Build the foundation. Include early surprising facts. End with 'but we're only halfway there...'",
    "CORE (sections 4-5). The heart of the video. Most important content. Most surprising data or scenes. End with major cliffhanger.",
    "ESCALATION (sections 6-7). Everything builds to a head. Major reveals. The viewer cannot stop now. End with 'one more thing...'",
    "CLOSING (final section + conclusion + CTA). Full payoff. Emotional resonance. The single most memorable line of the whole video.",
  ];
  // For 6+ blocks, insert extra DEVELOPMENT blocks before the closing
  while (roles.length < totalBlocks) {
    roles.splice(roles.length - 1, 0, `CONTINUATION (block ${roles.length} of ${totalBlocks}). Continue building with fresh examples and data. Maintain energy and pacing. End with a transition to the next section.`);
  }
  return roles;
}

// ─── BLOCK GENERATION ────────────────────────────────────────────────────────

const BLOCK_SIZE_MINUTES = 10;
const WORDS_PER_MINUTE = 130;

async function generateScriptBlock(topic, blockNum, totalBlocks, style, mode, keyPoints, ctaText, niche) {
  const isFirst = blockNum === 1;
  const isLast = blockNum === totalBlocks;
  const roles = getBlockRoles(totalBlocks);
  const blockRole = roles[blockNum - 1];

  // Key points only in first block, CTA only in last
  const kp = isFirst ? keyPoints : null;
  const cta = isLast ? ctaText : null;

  const continuityNote = !isFirst ? `
CONTINUITY: This is block ${blockNum} of ${totalBlocks}. Do NOT write a new hook or introduction — pick up naturally from where the previous section ended. The viewer has already been watching for ${(blockNum - 1) * 10} minutes. Assume they're engaged. No "welcome back" or "as we discussed".
` : '';

  const wordTarget = BLOCK_SIZE_MINUTES * WORDS_PER_MINUTE;
  const minWords = Math.round(wordTarget * 0.92);
  const maxWords = Math.round(wordTarget * 1.08);

  const basePrompt = mode === 'documentary'
    ? buildDocumentaryPrompt(topic, BLOCK_SIZE_MINUTES.toString(), style, kp, cta, niche, blockRole)
    : mode === 'infographic'
    ? buildInfographicPrompt(topic, BLOCK_SIZE_MINUTES.toString(), style, kp, cta, niche, blockRole)
    : buildVisualPrompt(topic, BLOCK_SIZE_MINUTES.toString(), style, kp, cta, niche, blockRole);

  const fullPrompt = basePrompt + continuityNote + `\n\nWORD COUNT FOR THIS BLOCK: ${minWords}–${maxWords} words (exactly ${wordTarget} target).`;

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      messages: [{ role: "user", content: fullPrompt }],
    },
    {
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 180000,
    }
  );
  return response.data.content[0].text.trim();
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function generateScript(topic, options = {}) {
  const duration   = options.duration   || "10";
  const style      = options.tone       || options.style || "engaging";
  const outputDir  = options.output     || "./scripts";
  const keyPoints  = options.keyPoints  || null;
  const ctaText    = options.ctaText    || null;
  const niche      = options.niche      || null;

  let mode = options.mode || detectMode(topic, niche);

  fs.mkdirSync(outputDir, { recursive: true });

  const modeLabel = mode === "documentary" ? "🎬 DOCUMENTARY" : mode === "infographic" ? "📊 INFOGRAPHIC" : "🎬 VISUAL";
  console.log(chalk.blue(`\n✍️  VideoForge Script Generator v40\n`));
  console.log(chalk.blue(`${modeLabel} mode detected for: "${topic}"`));
  if (niche)      console.log(chalk.cyan(`🎯 Niche: ${niche}`));
  if (keyPoints)  console.log(chalk.cyan(`📌 Key points: ${keyPoints.length} chars`));
  if (ctaText)    console.log(chalk.cyan(`📣 CTA: "${ctaText}"`));

  const durationNum = parseInt(duration) || 10;
  const totalBlocks = Math.max(1, Math.ceil(durationNum / BLOCK_SIZE_MINUTES));

  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const outputPath = path.join(outputDir, `${slug}.txt`);

  // ── MULTI-BLOCK (>10 min) ──
  if (totalBlocks > 1) {
    const spinner = ora(`Writing ${durationNum}-minute script in ${totalBlocks} blocks...`).start();
    const blocks = [];

    for (let i = 1; i <= totalBlocks; i++) {
      spinner.text = `Writing block ${i}/${totalBlocks} (${(i-1)*10}-${i*10} min)...`;
      try {
        const block = await generateScriptBlock(topic, i, totalBlocks, style, mode, keyPoints, ctaText, niche);
        blocks.push(block);
      } catch (err) {
        spinner.warn(`Block ${i} failed: ${err.message} — retrying...`);
        await new Promise(r => setTimeout(r, 3000));
        const block = await generateScriptBlock(topic, i, totalBlocks, style, mode, keyPoints, ctaText, niche);
        blocks.push(block);
      }
    }

    // Join blocks with a clear separator that won't affect TTS
    let fullScript = blocks.join('\n\n');

    // Review pass — for very long scripts, review in blocks to avoid token limits
    spinner.text = "Polishing script...";
    const fullWordCount = fullScript.split(/\s+/).length;
    if (fullWordCount > 4000) {
      // Review each block individually then rejoin
      const reviewedBlocks = [];
      for (let bi = 0; bi < blocks.length; bi++) {
        spinner.text = `Polishing block ${bi+1}/${blocks.length}...`;
        const reviewed = await reviewAndPolishScript(blocks[bi], topic, niche, style);
        reviewedBlocks.push(reviewed);
      }
      fullScript = reviewedBlocks.join('\n\n');
    } else {
      fullScript = await reviewAndPolishScript(fullScript, topic, niche, style);
    }

    const wordCount = fullScript.split(/\s+/).length;
    const estMinutes = (wordCount / WORDS_PER_MINUTE).toFixed(1);

    fs.writeFileSync(outputPath, fullScript);
    spinner.succeed(`Script complete: ${outputPath}`);
    console.log(chalk.white(`📝 Words: ${wordCount} (~${estMinutes} min across ${totalBlocks} blocks)`));
    console.log(chalk.white(`📁 Saved: ${outputPath}`));

    // Preview first 3 lines
    const preview = fullScript.split("\n").filter(l => l.trim()).slice(0, 2);
    preview.forEach(l => console.log(chalk.gray(`  "${l}"`)));

    return { path: outputPath, scriptPath: outputPath, wordCount, estMinutes: parseFloat(estMinutes), duration: wordCount / WORDS_PER_MINUTE, mode };
  }

  // ── SINGLE BLOCK (≤10 min) ──
  const spinner = ora(`Writing ${mode} script about "${topic}"...`).start();

  const prompt = mode === "documentary"
    ? buildDocumentaryPrompt(topic, duration, style, keyPoints, ctaText, niche, null)
    : mode === "infographic"
    ? buildInfographicPrompt(topic, duration, style, keyPoints, ctaText, niche, null)
    : buildVisualPrompt(topic, duration, style, keyPoints, ctaText, niche, null);

  let script;
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout: 180000,
      }
    );
    script = response.data.content[0].text.trim();
  } catch (err) {
    spinner.fail(`Script generation failed: ${err.message}`);
    throw err;
  }

  // Review pass — catch robotic sentences, remove AI clichés
  spinner.text = "Polishing script...";
  script = await reviewAndPolishScript(script, topic, niche, style);

  const wordCount = script.split(/\s+/).length;
  const estMinutes = (wordCount / WORDS_PER_MINUTE).toFixed(1);

  fs.writeFileSync(outputPath, script);
  spinner.succeed(`Script written: ${outputPath}`);
  console.log(chalk.white(`📝 Words: ${wordCount}`));
  console.log(chalk.white(`⏱️  Est. duration: ${estMinutes} minutes`));
  console.log(chalk.white(`🎯 Mode: ${mode}`));
  console.log(chalk.white(`📁 Saved: ${outputPath}`));

  const preview = script.split("\n").filter(l => l.trim()).slice(0, 2);
  preview.forEach(l => console.log(chalk.gray(`  "${l}"`)));

  return { path: outputPath, scriptPath: outputPath, wordCount, estMinutes: parseFloat(estMinutes), mode };
}
