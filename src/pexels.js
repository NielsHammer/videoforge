import axios from "axios";
import fs from "fs";

const API_BASE = "https://api.pexels.com";

/**
 * Fetch a single HD photo from Pexels.
 * Photos are higher quality than Pexels videos and work better
 * with Ken Burns animation for faceless YouTube content.
 */
export async function fetchPhoto(query, outputPath) {
  const response = await axios.get(`${API_BASE}/v1/search`, {
    params: {
      query: query,
      per_page: 10,
      orientation: "landscape",
      size: "large",
    },
    headers: {
      Authorization: process.env.PEXELS_API_KEY,
    },
    timeout: 15000, // 15s
  });

  if (!response.data.photos || response.data.photos.length === 0) {
    throw new Error(`No photos found for: ${query}`);
  }

  // Pick a random photo from top results for variety
  const pickIndex = Math.floor(
    Math.random() * Math.min(response.data.photos.length, 6)
  );
  const photo = response.data.photos[pickIndex];

  // Get the large2x version (highest quality landscape)
  const imageUrl = photo.src.large2x || photo.src.large || photo.src.original;

  // Download
  const imageResponse = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    maxContentLength: 50 * 1024 * 1024,
    timeout: 30000, // 30s
  });

  fs.writeFileSync(outputPath, Buffer.from(imageResponse.data));
  return outputPath;
}
