#!/usr/bin/env node
/**
 * VideoForge Quality Check
 * Takes 8 screenshots from final.mp4, sends to Claude Vision, scores 1-10.
 * If score < 7, sets needs_review: true in quality-report.json
 * 
 * Usage: node src/quality-check.js <output-dir>
 * Example: node src/quality-check.js output/2026-03-16-my-video
 */

import { execSync, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const PASS_THRESHOLD = 7;
const NUM_SCREENSHOTS = 8;

async function runQualityCheck(outputDir) {
  const videoPath = path.join(outputDir, "final.mp4");
  const reportPath = path.join(outputDir, "quality-report.json");

  if (!fs.existsSync(videoPath)) {
    console.error(`❌ No final.mp4 found in ${outputDir}`);
    process.exit(1);
  }

  console.log("🔍 VideoForge Quality Check");
  console.log(`📁 Video: ${videoPath}`);

  // Get video duration
  let duration;
  try {
    const probe = execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath
    ]).toString().trim();
    duration = parseFloat(probe);
  } catch (e) {
    console.error("❌ ffprobe failed:", e.message);
    process.exit(1);
  }

  console.log(`⏱️  Duration: ${duration.toFixed(1)}s`);

  // Take NUM_SCREENSHOTS evenly spaced screenshots (skip first 2s and last 5s)
  const screenshotDir = path.join(outputDir, "quality-screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const effectiveDuration = duration - 7; // skip tail
  const interval = effectiveDuration / (NUM_SCREENSHOTS + 1);
  const timestamps = Array.from({ length: NUM_SCREENSHOTS }, (_, i) => 2 + (i + 1) * interval);

  console.log(`📸 Taking ${NUM_SCREENSHOTS} screenshots...`);

  const screenshotPaths = [];
  for (const ts of timestamps) {
    const outPath = path.join(screenshotDir, `frame-${ts.toFixed(1)}s.jpg`);
    try {
      execFileSync("ffmpeg", [
        "-ss", ts.toFixed(2),
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "4",
        "-y",
        outPath
      ], { stdio: "pipe" });
      screenshotPaths.push({ path: outPath, timestamp: ts });
    } catch (e) {
      console.warn(`⚠️  Screenshot at ${ts.toFixed(1)}s failed, skipping`);
    }
  }

  if (screenshotPaths.length === 0) {
    console.error("❌ No screenshots taken");
    process.exit(1);
  }

  console.log(`✅ ${screenshotPaths.length} screenshots taken`);

  // Load screenshots as base64
  const imageBlocks = screenshotPaths.map(({ path: p, timestamp }) => ({
    timestamp,
    base64: fs.readFileSync(p).toString("base64"),
  }));

  // Send to Claude Vision
  console.log("🤖 Sending to Claude for review...");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = [
    {
      type: "text",
      text: `You are a YouTube video quality reviewer for TubeAutomate, a service that produces faceless YouTube videos with AI-generated visuals, animations, and infographics.

Review these ${imageBlocks.length} frames from a video and score it on the following criteria:

SCORING CRITERIA (each 0-10, then give overall 0-10):
1. TEXT QUALITY: Is all text on screen meaningful, readable, and grammatically correct? No word salad, no cut-off words, no gibberish labels?
2. VISUAL RELEVANCE: Do the images/animations shown match what the video topic is about? No random unrelated images?
3. COMPONENT QUALITY: Do infographics/animations look professional? Proper layout, not broken, not empty?
4. VARIETY: Good mix of different visual types? Not the same component repeating?
5. OVERALL POLISH: Would a paying customer be satisfied with this video?

FRAMES (in chronological order):
${imageBlocks.map((img, i) => `Frame ${i + 1} at ${img.timestamp.toFixed(1)}s`).join(", ")}

Respond with ONLY this JSON (no markdown):
{
  "scores": {
    "text_quality": 0-10,
    "visual_relevance": 0-10,
    "component_quality": 0-10,
    "variety": 0-10,
    "overall_polish": 0-10
  },
  "overall_score": 0-10,
  "needs_review": true/false,
  "issues": ["issue1", "issue2"],
  "summary": "one sentence summary"
}`
    },
    ...imageBlocks.map((img, i) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: img.base64,
      }
    }))
  ];

  let report;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content }],
    });

    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    report = JSON.parse(clean);
  } catch (e) {
    console.error("❌ Claude review failed:", e.message);
    report = {
      scores: {},
      overall_score: 5,
      needs_review: true,
      issues: ["Quality check failed — manual review required"],
      summary: "Automated review could not complete",
      error: e.message,
    };
  }

  // Force needs_review if score below threshold
  if (report.overall_score < PASS_THRESHOLD) {
    report.needs_review = true;
  }

  // Add metadata
  report.video_path = videoPath;
  report.checked_at = new Date().toISOString();
  report.screenshots = screenshotPaths.map(s => s.path);
  report.pass_threshold = PASS_THRESHOLD;

  // Write report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print results
  console.log("\n" + "═".repeat(50));
  console.log("QUALITY REPORT");
  console.log("═".repeat(50));
  console.log(`Overall Score: ${report.overall_score}/10 ${report.overall_score >= PASS_THRESHOLD ? "✅ PASS" : "🚨 NEEDS REVIEW"}`);
  if (report.scores) {
    Object.entries(report.scores).forEach(([k, v]) => {
      console.log(`  ${k.replace(/_/g, " ")}: ${v}/10`);
    });
  }
  console.log(`\nSummary: ${report.summary}`);
  if (report.issues?.length) {
    console.log("\nIssues found:");
    report.issues.forEach(issue => console.log(`  ⚠️  ${issue}`));
  }
  console.log(`\n📄 Report saved: ${reportPath}`);

  if (report.needs_review) {
    console.log("\n🚨 FLAGGED FOR TEAM REVIEW — do not deliver to customer until reviewed");
    process.exit(2); // exit code 2 = needs review (not a crash)
  } else {
    console.log("\n✅ Quality check passed — safe to deliver");
    process.exit(0);
  }
}

// Main
const outputDir = process.argv[2];
if (!outputDir) {
  console.error("Usage: node src/quality-check.js <output-dir>");
  process.exit(1);
}

runQualityCheck(path.resolve(outputDir)).catch(err => {
  console.error("Quality check error:", err);
  process.exit(1);
});
