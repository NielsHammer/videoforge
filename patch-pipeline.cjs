const fs = require("fs");
let c = fs.readFileSync("src/pipeline.js", "utf-8");

// 1. Add import
if (!c.includes("generateThumbnail")) {
  c = c.replace(
    'import axios from "axios";',
    'import axios from "axios";\nimport { generateThumbnail } from "./thumbnail.js";'
  );
}

// 2. Add thumbnail step before "Video complete"
const marker = 'console.log(chalk.green.bold("\\n\\u2705 Video complete!"));';
const replacement = `// --- STEP 6: Generate Thumbnail ---
  console.log(chalk.blue("\\n\\ud83d\\uddbc  Generating thumbnail...\\n"));
  try {
    const thumbTitle = scriptText.split("\\n")[0].replace(/^#\\s*/, "").trim() || projectName;
    await generateThumbnail(outputDir, thumbTitle, theme.replace(/_/g, " "));
    console.log(chalk.green("  \\u2705 Thumbnail saved"));
  } catch (thumbErr) {
    console.log(chalk.yellow("  \\u26a0\\ufe0f  Thumbnail skipped: " + thumbErr.message));
  }

  console.log(chalk.green.bold("\\n\\u2705 Video complete!"));`;

if (!c.includes("Generate Thumbnail")) {
  c = c.replace(marker, replacement);
}

fs.writeFileSync("src/pipeline.js", c);
console.log("Done! Thumbnail integration added to pipeline.js");
