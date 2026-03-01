import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { fileURLToPath } from "url";
import ora from "ora";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function renderWithRemotion(clips, wordTimestamps, totalDuration, outputPath, assetsDir, theme = "blue") {
  const spinner = ora("Bundling Remotion project...").start();
  const entryPoint = path.resolve(__dirname, "remotion/index.jsx");
  const absoluteAssetsDir = path.resolve(assetsDir);

  const bundleLocation = await bundle({ entryPoint, publicDir: absoluteAssetsDir });
  spinner.succeed("Remotion project bundled");

  const fps = 30;
  const totalFrames = Math.ceil(totalDuration * fps);

  // Prepare clips for Remotion (convert image paths to basenames)
  const clipsForRemotion = clips.map((clip) => ({
    ...clip,
    imagePath: clip.imagePath && fs.existsSync(clip.imagePath) ? path.basename(clip.imagePath) : null,
  }));

  const inputProps = { clips: clipsForRemotion, wordTimestamps, theme };

  const spinner2 = ora("Selecting composition...").start();
  const composition = await selectComposition({
    serveUrl: bundleLocation, id: "VideoForge",
    inputProps,
  });
  composition.durationInFrames = totalFrames;
  composition.fps = fps;
  composition.width = 1920;
  composition.height = 1080;
  spinner2.succeed(`Composition: ${totalFrames} frames (${(totalDuration / 60).toFixed(1)} min)`);

  const spinner3 = ora("Rendering...").start();
  let lastPct = 0;
  await renderMedia({
    composition, serveUrl: bundleLocation, codec: "h264", outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct > lastPct + 4) { spinner3.text = `Rendering: ${pct}%`; lastPct = pct; }
    },
  });
  spinner3.succeed("Remotion render complete");
  return outputPath;
}
