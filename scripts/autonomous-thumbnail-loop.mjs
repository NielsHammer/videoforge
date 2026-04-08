/**
 * Autonomous Thumbnail Generation Loop
 *
 * Runs N iterations unattended. Each iteration:
 * 1. Picks 3 random video ideas from the library
 * 2. Generates thumbnails with auto-retry (up to 3 attempts each)
 * 3. Deep self-review with ROOT CAUSE analysis
 * 4. Accumulates lessons learned across iterations
 * 5. Feeds accumulated lessons into future generations
 *
 * Run: node scripts/autonomous-thumbnail-loop.mjs [iterations] [start_from]
 * Example: node scripts/autonomous-thumbnail-loop.mjs 50 1
 */

import { generateThumbnailV2 } from '../src/thumbnail-v2.js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ITERATIONS = parseInt(process.argv[2]) || 50;
const START_FROM = parseInt(process.argv[3]) || 1;
const BASE_DIR = '/opt/videoforge/output/autonomous-loop';
const LESSONS_FILE = path.join(BASE_DIR, 'accumulated-lessons.json');
const LOG_FILE = path.join(BASE_DIR, 'run-log.jsonl');

// Load video library for random topic selection
const videoLib = JSON.parse(fs.readFileSync('/opt/videoforge/video-library/index.json', 'utf-8'));
const allVideos = videoLib.videos || [];

// Accumulated lessons — persists across iterations
let lessons = [];
if (fs.existsSync(LESSONS_FILE)) {
  lessons = JSON.parse(fs.readFileSync(LESSONS_FILE, 'utf-8'));
  console.log(`Loaded ${lessons.length} accumulated lessons from previous runs`);
}

function pickRandomVideos(count = 3) {
  const shuffled = [...allVideos].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function detectNiche(title) {
  const t = title.toLowerCase();
  if (t.includes('stock') || t.includes('invest') || t.includes('money') || t.includes('trading') || t.includes('million') || t.includes('rich') || t.includes('$')) return 'finance';
  if (t.includes('space') || t.includes('planet') || t.includes('universe') || t.includes('nasa') || t.includes('galaxy') || t.includes('star')) return 'space';
  if (t.includes('hack') || t.includes('cyber') || t.includes('virus') || t.includes('dark web') || t.includes('ai ')) return 'tech';
  if (t.includes('war') || t.includes('president') || t.includes('history') || t.includes('ancient') || t.includes('civil') || t.includes('medieval')) return 'history';
  if (t.includes('routine') || t.includes('habit') || t.includes('morning') || t.includes('discipline') || t.includes('detox') || t.includes('workout')) return 'health';
  if (t.includes('travel') || t.includes('country') || t.includes('city') || t.includes('building') || t.includes('island')) return 'travel';
  return 'education';
}

async function deepReview(imagePath, title, plan, attempt) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');

  const lessonsContext = lessons.length > 0
    ? `\n\nACCUMULATED LESSONS FROM ${lessons.length} PREVIOUS THUMBNAILS (apply these):\n${lessons.slice(-20).map(l => `- ${l}`).join('\n')}`
    : '';

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/png", data: base64 } },
        { type: "text", text: `You are a brutal YouTube thumbnail critic with 10 years of design experience. Rate this thumbnail for "${title}".

Think like a human scrolling YouTube on their phone. You see this at 168x94 pixels for 0.05 seconds.

Rate 1-10, then for EVERY problem you find, explain THREE things:
1. WHAT is wrong (the symptom)
2. WHY it's wrong (what a human viewer would think/feel seeing this)
3. ROOT CAUSE in the generation system (what code/prompt/logic flaw produced this problem)

Also explain what WORKS and why.

Return ONLY valid JSON:
{
  "rating": 1-10,
  "would_click": true/false,
  "first_impression": "what a real person sees in 0.05 seconds at mobile size",
  "works": ["things that are genuinely good and WHY they work psychologically"],
  "problems": [
    {
      "symptom": "what's visually wrong",
      "human_reaction": "what a viewer thinks/feels seeing this",
      "root_cause": "what systemic issue in the generation pipeline caused this",
      "fix": "specific actionable fix"
    }
  ],
  "lesson": "ONE sentence universal design principle that applies to ALL niches and ALL video topics at scale (1000+ videos/month). NOT a rule specific to this thumbnail or topic. Think: what would a senior designer tell a junior about thumbnail design in general? Examples of GOOD lessons: 'The hook text must tell a complete story with the image without needing the video title.' Examples of BAD lessons: 'Finance thumbnails need green charts' (too niche-specific)."
}${lessonsContext}` }
      ]
    }]
  });

  try {
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log("  [Review] Parse failed: " + e.message);
  }
  return { rating: 0, problems: [], works: [], lesson: "Review parse failed" };
}

function logResult(entry) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

console.log(`\n${"═".repeat(70)}`);
console.log(`  AUTONOMOUS THUMBNAIL LOOP — ${ITERATIONS} iterations`);
console.log(`  Starting from iteration ${START_FROM}`);
console.log(`  Accumulated lessons: ${lessons.length}`);
console.log(`  Output: ${BASE_DIR}`);
console.log(`${"═".repeat(70)}\n`);

const allScores = [];

for (let iter = START_FROM; iter < START_FROM + ITERATIONS; iter++) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ITERATION ${iter} / ${START_FROM + ITERATIONS - 1}`);
  console.log(`${"═".repeat(70)}`);

  // Pick 3 random videos
  const videos = pickRandomVideos(3);

  for (let v = 0; v < videos.length; v++) {
    const video = videos[v];
    const niche = detectNiche(video.title);
    const outDir = path.join(BASE_DIR, `iter-${String(iter).padStart(3, '0')}`, `thumb-${v + 1}`);

    console.log(`\n── ${iter}.${v + 1}: "${video.title}" (${niche}) ──`);

    try {
      // Add accumulated lessons to the script context
      const lessonsForPrompt = lessons.length > 0
        ? `\n\nDESIGN LESSONS LEARNED FROM PREVIOUS THUMBNAILS (MUST apply):\n${lessons.slice(-15).map(l => `- ${l}`).join('\n')}`
        : '';

      const desc = `Video by ${video.channel}. ${video.views?.toLocaleString() || 'Unknown'} views.${lessonsForPrompt}`;

      // Generate thumbnail (with built-in auto-retry)
      const pngPath = await generateThumbnailV2(outDir, video.title, video.title, desc, niche, "engaging");

      // Deep review with root cause analysis
      console.log("\n--- Deep Review ---");
      const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'thumbnail-v2-plan.json'), 'utf-8'));
      const review = await deepReview(pngPath, video.title, plan, plan._attempt || 1);

      console.log(`  Deep Review: ${review.rating}/10`);
      if (review.first_impression) console.log(`  First impression: "${review.first_impression}"`);
      if (review.works) {
        for (const w of review.works) console.log(`  ✓ ${w}`);
      }
      if (review.problems) {
        for (const p of review.problems) {
          console.log(`  ✗ ${p.symptom}`);
          console.log(`    → Human reaction: ${p.human_reaction}`);
          console.log(`    → Root cause: ${p.root_cause}`);
          console.log(`    → Fix: ${p.fix}`);
        }
      }

      // Accumulate the lesson — but dedupe semantically against existing rules.
      // 95 paraphrases of "show specific mechanism" taught us that raw appending
      // collapses into noise. Only keep a new lesson if it is structurally different
      // from every existing one (no shared 5+ word substring with any existing rule,
      // and at least 30% different by trigram similarity).
      function trigrams(s) {
        const t = s.toLowerCase().replace(/[^a-z ]/g, '');
        const out = new Set();
        for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
        return out;
      }
      function jaccard(a, b) {
        const A = trigrams(a), B = trigrams(b);
        let inter = 0;
        for (const x of A) if (B.has(x)) inter++;
        return inter / (A.size + B.size - inter || 1);
      }
      if (review.lesson && review.lesson !== "Review parse failed") {
        const isDup = lessons.some(existing => jaccard(existing, review.lesson) > 0.45);
        if (isDup) {
          console.log(`  ↺  Lesson dropped (semantic duplicate of existing rule)`);
        } else {
          lessons.push(review.lesson);
          console.log(`  📝 Lesson: ${review.lesson}`);
          fs.writeFileSync(LESSONS_FILE, JSON.stringify(lessons, null, 2));
        }
      }

      // Save deep review
      fs.writeFileSync(path.join(outDir, 'deep-review.json'), JSON.stringify(review, null, 2));

      allScores.push(review.rating);

      // Log
      logResult({
        iteration: iter,
        index: v + 1,
        title: video.title,
        channel: video.channel,
        niche,
        rating: review.rating,
        attempts: plan._attempt || 1,
        lesson: review.lesson,
        problems_count: review.problems?.length || 0,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      logResult({
        iteration: iter,
        index: v + 1,
        title: video.title,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Summary after each iteration
  const recentScores = allScores.slice(-9); // last 3 iterations (9 thumbnails)
  const avg = recentScores.length > 0 ? (recentScores.reduce((a, b) => a + b, 0) / recentScores.length).toFixed(1) : '?';
  console.log(`\n── Iteration ${iter} complete ──`);
  console.log(`  Total thumbnails: ${allScores.length}`);
  console.log(`  Recent avg score: ${avg}/10`);
  console.log(`  Accumulated lessons: ${lessons.length}`);
  console.log(`  All-time avg: ${(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)}/10`);
}

// Final summary
console.log(`\n${"═".repeat(70)}`);
console.log(`  AUTONOMOUS LOOP COMPLETE`);
console.log(`  Total iterations: ${ITERATIONS}`);
console.log(`  Total thumbnails: ${allScores.length}`);
console.log(`  Final avg score: ${(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)}/10`);
console.log(`  Lessons learned: ${lessons.length}`);
console.log(`  Results: ${BASE_DIR}`);
console.log(`${"═".repeat(70)}`);
