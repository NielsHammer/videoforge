#!/usr/bin/env node
/**
 * VideoForge Quality Check v2
 * 
 * Comprehensive review: screenshots every 15s + full storyboard text scan + Claude Vision
 * Auto-regenerates once if score too low. Hard cap: MAX_ATTEMPTS total (never infinite loops).
 * 
 * Usage: node src/quality-check.js <output-dir> [--regenerate]
 * Exit codes: 0=pass, 2=needs-review, 3=auto-regenerate-requested, 1=error
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PASS_THRESHOLD = 7;
const MAX_ATTEMPTS = 2;          // HARD CAP — never regenerates more than this
const SCREENSHOT_INTERVAL = 15;  // one screenshot every 15 seconds
const MAX_SCREENSHOTS = 20;      // cap for very long videos

async function runQualityCheck(outputDir, options = {}) {
  const videoPath    = path.join(outputDir, "final.mp4");
  const storyPath    = path.join(outputDir, "storyboard.json");
  const reportPath   = path.join(outputDir, "quality-report.json");
  const attemptsPath = path.join(outputDir, "quality-attempts.json");
  const ssDir        = path.join(outputDir, "quality-screenshots");

  // ── Safety: read attempt counter ──
  let attempts = 0;
  if (fs.existsSync(attemptsPath)) {
    try { attempts = JSON.parse(fs.readFileSync(attemptsPath, "utf8")).attempts || 0; } catch {}
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`❌ No final.mp4 found in ${outputDir}`);
    process.exit(1);
  }

  console.log("\n" + "═".repeat(55));
  console.log("🔍 VideoForge Quality Check v2");
  console.log(`📁 ${path.basename(outputDir)}`);
  console.log(`🔄 Attempt ${attempts + 1} of ${MAX_ATTEMPTS}`);
  console.log("═".repeat(55));

  // ── Video duration ──
  let duration;
  try {
    duration = parseFloat(execFileSync("ffprobe", [
      "-v","error","-show_entries","format=duration",
      "-of","default=noprint_wrappers=1:nokey=1", videoPath
    ]).toString().trim());
  } catch (e) {
    console.error("❌ ffprobe failed:", e.message);
    process.exit(1);
  }
  console.log(`⏱️  Duration: ${(duration/60).toFixed(1)} min`);

  // ── Screenshots every SCREENSHOT_INTERVAL seconds ──
  fs.mkdirSync(ssDir, { recursive: true });
  const rawTs = [];
  for (let t = 2; t < duration - 5; t += SCREENSHOT_INTERVAL) rawTs.push(t);
  const step = Math.ceil(rawTs.length / MAX_SCREENSHOTS);
  const timestamps = rawTs.filter((_, i) => i % step === 0);

  console.log(`📸 Taking ${timestamps.length} screenshots...`);
  const screenshots = [];
  for (const ts of timestamps) {
    const out = path.join(ssDir, `frame-${Math.round(ts)}s.jpg`);
    try {
      execFileSync("ffmpeg", [
        "-ss", ts.toFixed(2), "-i", videoPath,
        "-frames:v","1","-q:v","5","-y", out
      ], { stdio:"pipe" });
      if (fs.existsSync(out) && fs.statSync(out).size > 1000)
        screenshots.push({ path: out, timestamp: ts });
    } catch {}
  }
  console.log(`✅ ${screenshots.length} screenshots captured`);

  // ── Storyboard text analysis ──
  let storyboardContext = "";
  let textIssues = [];
  if (fs.existsSync(storyPath)) {
    try {
      const { clips = [] } = JSON.parse(fs.readFileSync(storyPath, "utf8"));

      const allTexts = clips.flatMap(c => {
        const t = [];
        const ad = c.animation_data || {};
        const cd = c.chart_data || {};
        const nd = c.number_data || {};
        if (ad.lines)   t.push(...(Array.isArray(ad.lines) ? ad.lines : []));
        if (ad.text)    t.push(ad.text);
        if (ad.label)   t.push(ad.label);
        if (ad.headline) t.push(ad.headline);
        if (ad.value)   t.push(String(ad.value));
        if (cd.title)   t.push(cd.title);
        if (nd.label)   t.push(nd.label);
        if (Array.isArray(cd.items)) cd.items.forEach(it => t.push(typeof it === "string" ? it : it?.label || ""));
        if (Array.isArray(cd.stats)) cd.stats.forEach(s => { if (s?.label) t.push(s.label); });
        return t.filter(x => x && String(x).length > 1);
      });

      const badPatterns = [
        /^(wasn|didn|don|can|won|isn|aren|couldn|shouldn|wouldn|doesn)$/i,
        /people know emergency/i,
        /keep going dollars/i,
        /show five mental/i,
        /means nearly/i,
        /real kicker brain/i,
        /^(the|and|but|for|with|this|that)$/i,
      ];
      textIssues = allTexts.filter(t => badPatterns.some(p => p.test(String(t).trim())));

      const typeCounts = {};
      clips.forEach(c => { typeCounts[c.visual_type] = (typeCounts[c.visual_type]||0)+1; });

      storyboardContext = `
STORYBOARD ANALYSIS (${clips.length} clips, ${(duration/60).toFixed(1)} min video):
Type breakdown: ${Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}×${v}`).join(", ")}
Stock %: ${Math.round(clips.filter(c=>c.visual_type==="stock").length/clips.length*100)}%

ALL on-screen text labels (check every one for gibberish):
${allTexts.slice(0, 60).map(t => `  "${t}"`).join("\n")}

${textIssues.length > 0
  ? `⚠️ AUTO-DETECTED GIBBERISH (${textIssues.length} items): ${textIssues.map(t=>`"${t}"`).join(", ")}`
  : "✓ No obvious gibberish detected in automated scan"}`;
    } catch (e) {
      storyboardContext = `Could not parse storyboard: ${e.message}`;
    }
  }

  // ── Claude Vision review ──
  console.log(`\n🤖 Sending ${screenshots.length} frames + full storyboard to Claude...`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const reviewPrompt = `You are reviewing a faceless YouTube video for TubeAutomate. Paying customers get these videos for $150 each. Your job is to catch every quality issue before delivery.

${storyboardContext}

I'm showing you ${screenshots.length} frames taken every ~${SCREENSHOT_INTERVAL} seconds covering the FULL video (${(duration/60).toFixed(1)} minutes).

Score each category 0-10:

TEXT_QUALITY: Is ALL on-screen text meaningful, contextually relevant, and grammatically correct?
- Score 0-4 if you see: word salad ("PEOPLE KNOW EMERGENCY AWAY"), cut-off words ("HUNDRE", "PEOPL"), contraction fragments ("WASN", "DIDN"), numbers used as labels ("KEEP GOING DOLLARS"), random keyword lists
- Score 7-10 if all text directly relates to what's being communicated

VISUAL_RELEVANCE: Do visuals match the video topic and the specific moment?
- Score 0-4 if: same stock photo repeated, generic images unrelated to topic, wrong context
- Score 7-10 if: images clearly illustrate the point being made

COMPONENT_QUALITY: Are infographic/animation components properly rendered?  
- Score 0-4 if: empty data cards, broken layouts, text cut off, components that seem misplaced
- Score 7-10 if: all components display cleanly and make sense

PACING_VARIETY: Is there good visual variety and rhythm?
- Score 0-4 if: monotonous repetition of same type, jarring transitions, boring
- Score 7-10 if: natural mix of stock, animation, and infographic

CUSTOMER_SATISFACTION: Would a customer paying $150 be satisfied?
- Consider the whole package: does this look like a professional YouTube video?

IMPORTANT DECISION RULES:
- Set "auto_regenerate": true ONLY if text_quality < 5 (clear gibberish on screen) OR overall_score < 5
- Set "needs_review": true if overall_score < 7 but don't auto_regenerate (human should judge)  
- If it's decent but not perfect (6/10), set needs_review true but NOT auto_regenerate

Respond with ONLY valid JSON, no markdown:
{
  "scores": {"text_quality":0,"visual_relevance":0,"component_quality":0,"pacing_variety":0,"customer_satisfaction":0},
  "overall_score": 0,
  "needs_review": false,
  "auto_regenerate": false,
  "issues": ["describe each specific problem found"],
  "summary": "one honest sentence about this video"
}`;

  let report;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: reviewPrompt },
          ...screenshots.map(({ path: p }) => ({
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: fs.readFileSync(p).toString("base64") }
          }))
        ]
      }],
    });

    report = JSON.parse(response.content[0].text.trim().replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("⚠️  Claude review error:", e.message);
    report = {
      scores: {},
      overall_score: 5,
      needs_review: true,
      auto_regenerate: false,
      issues: [`Quality check failed: ${e.message}`],
      summary: "Review could not complete — manual review required",
    };
  }

  // ── Boost issue list with auto-detected gibberish ──
  if (textIssues.length > 0) {
    report.issues = report.issues || [];
    report.issues.unshift(`Storyboard scan: gibberish text detected: ${textIssues.map(t=>`"${t}"`).join(", ")}`);
    if ((report.scores?.text_quality ?? 10) > 4) {
      report.scores = report.scores || {};
      report.scores.text_quality = Math.min(report.scores.text_quality ?? 10, 4);
      const vals = Object.values(report.scores).filter(Number.isFinite);
      report.overall_score = Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
      report.auto_regenerate = true;
    }
  }

  // ── Apply threshold ──
  if (report.overall_score < PASS_THRESHOLD) report.needs_review = true;

  // ── Safety cap — NEVER exceed MAX_ATTEMPTS ──
  if (report.auto_regenerate && attempts >= MAX_ATTEMPTS) {
    console.log(`\n🛑 SAFETY LIMIT: reached ${MAX_ATTEMPTS} attempts — forcing manual review`);
    report.auto_regenerate = false;
    report.needs_review = true;
    report.issues = report.issues || [];
    report.issues.push(`Safety limit: auto-regeneration disabled after ${MAX_ATTEMPTS} attempts`);
  }

  // ── Save report ──
  report.video_path   = videoPath;
  report.checked_at   = new Date().toISOString();
  report.attempt      = attempts + 1;
  report.screenshots  = screenshots.length;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(attemptsPath, JSON.stringify({ attempts: attempts + 1, last: new Date().toISOString() }));

  // ── Print results ──
  console.log("\n" + "═".repeat(55));
  const icon = report.overall_score >= PASS_THRESHOLD ? "✅" : report.auto_regenerate ? "🔄" : "🚨";
  const label = report.overall_score >= PASS_THRESHOLD ? "PASS" : report.auto_regenerate ? "AUTO-REGEN" : "NEEDS REVIEW";
  console.log(`${icon} Score: ${report.overall_score}/10 — ${label}`);
  if (report.scores) {
    Object.entries(report.scores).forEach(([k,v]) => {
      const bar = "█".repeat(Math.round(v)) + "░".repeat(10 - Math.round(v));
      console.log(`  ${k.replace(/_/g," ").padEnd(22)} ${bar} ${v}/10`);
    });
  }
  console.log(`\n📝 ${report.summary}`);
  if (report.issues?.length) {
    console.log("\n⚠️  Issues:");
    report.issues.forEach(i => console.log(`   • ${i}`));
  }
  console.log(`\n📄 Report saved: ${reportPath}`);

  // ── Handle outcome ──
  if (report.auto_regenerate && options.regenerate) {
    console.log(`\n🔄 Auto-regenerating (attempt ${attempts+1} of ${MAX_ATTEMPTS})...`);
    console.log("   Clearing render artifacts (keeping voice cache)...");

    // Safe cleanup — only delete render outputs, never the voice/timestamps
    const safeToDelete = ["final.mp4", "storyboard.json", "remotion-output.mp4"];
    safeToDelete.forEach(f => {
      const p = path.join(outputDir, f);
      if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`   Deleted: ${f}`); }
    });

    // Delete assets except voice and timestamps
    const assetsDir = path.join(outputDir, "assets");
    const keepFiles = new Set(["voice.mp3", "timestamps.json"]);
    if (fs.existsSync(assetsDir)) {
      fs.readdirSync(assetsDir).forEach(f => {
        if (!keepFiles.has(f)) {
          try { fs.unlinkSync(path.join(assetsDir, f)); } catch {}
        }
      });
    }

    // Clean old screenshots
    if (fs.existsSync(ssDir)) fs.rmSync(ssDir, { recursive: true, force: true });

    process.exit(3); // caller re-runs generation with --skip-voice
  }

  process.exit(report.overall_score >= PASS_THRESHOLD ? 0 : 2);
}

const args = process.argv.slice(2);
const outputDir = args.find(a => !a.startsWith("--"));
const doRegenerate = args.includes("--regenerate");

if (!outputDir) {
  console.error("Usage: node src/quality-check.js <output-dir> [--regenerate]");
  process.exit(1);
}

runQualityCheck(path.resolve(outputDir), { regenerate: doRegenerate }).catch(err => {
  console.error("Quality check crashed:", err.message);
  process.exit(1);
});
