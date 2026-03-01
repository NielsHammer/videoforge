import { execSync } from "child_process";

export function getAudioDuration(filePath) {
  const result = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: "utf-8" }
  );
  return parseFloat(result.trim());
}
