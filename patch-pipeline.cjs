#!/usr/bin/env node
// patch-pipeline.cjs — adds batch4 types to graphicTypes in pipeline.js
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "src", "pipeline.js");
let code = fs.readFileSync(target, "utf8");

const batch4 = [
  "pull_quote","stat_comparison","bullet_list","myth_fact","step_reveal",
  "pro_con","score_card","person_profile","reddit_post","google_search",
  "three_points","stacked_bar","countdown_timer","vote_bar","map_callout",
  "news_headline","instagram_post","youtube_card","quiz_card",
  "portfolio_breakdown","roi_calculator","timelapse_bar","speed_meter",
  "candlestick_chart","conversation_bubble","loading_bar","wealth_ladder",
  "rule_card","alert_banner","big_number","mindset_shift",
];

// Find the NOTE comment that marks end of graphicTypes
const marker = "// NOTE: quote_overlay, overlay_caption, polaroid_stack are NOT here";
if (!code.includes(marker)) {
  console.error("Could not find marker in pipeline.js");
  process.exit(1);
}

// Check if already patched
if (code.includes("pull_quote")) {
  console.log("Already patched — skipping");
  process.exit(0);
}

const batch4str = `  // batch4 — pure graphic components, no image needed\n  ${batch4.map(t => `"${t}"`).join(",")},\n  `;
code = code.replace(marker, batch4str + marker);

fs.writeFileSync(target, code, "utf8");
console.log("✅ pipeline.js patched — added", batch4.length, "batch4 types to graphicTypes");
