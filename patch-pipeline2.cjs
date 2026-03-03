const fs = require("fs");
let c = fs.readFileSync("src/pipeline.js", "utf-8");

// Find "Video complete" line and insert thumbnail step before it
const marker = '  console.log(chalk.green.bold("\\n\u2705 Video complete!"));';
const thumbCode = `  // --- STEP 6: Generate Thumbnail ---
  console.log(chalk.blue("\\nGenerating thumbnail...\\n"));
  try {
    const thumbTitle = scriptText.split("\\n")[0].replace(/^#\\s*/, "").trim() || projectName;
    await generateThumbnail(outputDir, thumbTitle, theme.replace(/_/g, " "));
    console.log(chalk.green("  Thumbnail saved!"));
  } catch (thumbErr) {
    console.log(chalk.yellow("  Thumbnail skipped: " + thumbErr.message));
  }

`;

if (!c.includes("Generate Thumbnail")) {
  c = c.replace(marker, thumbCode + marker);
}

fs.writeFileSync("src/pipeline.js", c);
console.log("Done! Thumbnail step added before Video complete.");
