import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

/**
 * VideoForge v30 — Era-Aware Web Image Search
 *
 * Brave finds 10 candidates → Claude picks the best match for the scene
 * For historical eras: Claude also validates era-appropriateness and rejects modern images
 * Falls back to: Fal.ai AI generation (pipeline.js)
 */

export async function searchWebImage(query, outputPath, sceneContext) {
  if (process.env.BRAVE_API_KEY) {
    const result = await smartBraveSearch(query, outputPath, sceneContext);
    if (result) return result;
  }
  console.log("    No web image found for: " + query);
  return null;
}

async function smartBraveSearch(query, outputPath, sceneContext) {
  try {
    console.log("    Brave search: " + query);
    const response = await axios.get("https://api.search.brave.com/res/v1/images/search", {
      params: { q: query, count: 10, safesearch: "off", search_lang: "en", country: "ALL" },
      headers: { "Accept": "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": process.env.BRAVE_API_KEY },
      timeout: 10000
    });
    const results = response.data?.results || [];
    if (results.length === 0) { console.log("    Brave: No results"); return null; }

    const candidates = results.map((r, i) => ({
      index: i,
      title: r.title || "Unknown",
      source: r.source || r.url || "Unknown",
      width: r.properties?.width || r.width || 0,
      height: r.properties?.height || r.height || 0,
      originalUrl: r.properties?.url || null,
      thumbnailUrl: r.thumbnail?.src || null
    }));

    console.log("    Found " + candidates.length + " candidates, asking Claude to pick best...");

    let bestIndex = 0;
    if (process.env.ANTHROPIC_API_KEY && sceneContext) {
      try {
        bestIndex = await claudePickBest(candidates, query, sceneContext);
      } catch (e) {
        console.log("    Claude pick failed, using first result");
        bestIndex = 0;
      }
    }

    // -1 means Claude rejected all candidates as era-inappropriate
    if (bestIndex === -1) {
      console.log("    All Brave results rejected as era-inappropriate — falling through to AI");
      return null;
    }

    const order = [bestIndex, ...Array.from({length: candidates.length}, (_, i) => i).filter(i => i !== bestIndex)];

    for (const idx of order) {
      if (idx >= candidates.length) continue;
      const c = candidates[idx];
      const label = idx === bestIndex ? " [BEST]" : "";

      if (c.originalUrl) {
        console.log("    [" + (idx+1) + "]" + label + " " + (c.title || "").substring(0, 50));
        const ok = await downloadImage(c.originalUrl, outputPath, 20000);
        if (ok) {
          console.log("    HD image saved: " + path.basename(outputPath));
          return outputPath;
        }
      }
    }

    // Pass 2: Thumbnails as last resort
    console.log("    No HD originals, trying thumbnails...");
    for (let i = 0; i < Math.min(candidates.length, 3); i++) {
      if (candidates[i].thumbnailUrl) {
        const ok = await downloadImage(candidates[i].thumbnailUrl, outputPath, 3000);
        if (ok) {
          console.log("    Thumbnail saved: " + path.basename(outputPath));
          return outputPath;
        }
      }
    }
    console.log("    All downloads failed");
    return null;
  } catch (error) {
    console.log("    Brave error: " + (error.response?.status || error.message));
    return null;
  }
}

async function claudePickBest(candidates, query, sceneContext) {
  const narration = sceneContext.narration_segment || sceneContext.subtitle_text || sceneContext.text || "";
  const displayStyle = sceneContext.display_style || "";
  const era = sceneContext.era || ""; // era context from videoBible

  // Era-aware instruction
  const eraInstruction = era && era !== "modern"
    ? `\nCRITICAL ERA RULE: This video is set in ${era}. REJECT any image showing modern clothing, gym equipment, contemporary people, modern cars, smartphones, or post-1900 elements. If ALL images are inappropriate, reply with "0".`
    : "";

  // Try vision-based selection first: download thumbnails and let Claude SEE the actual images
  // This catches cases where titles are misleading (e.g., "Beautiful Colombia" but image shows China)
  const thumbnailData = [];
  const top = candidates.slice(0, 6); // check top 6 candidates visually
  for (const c of top) {
    if (!c.thumbnailUrl) continue;
    try {
      const thumbResp = await axios.get(c.thumbnailUrl, {
        responseType: "arraybuffer",
        timeout: 4000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/*,*/*;q=0.8",
        }
      });
      const ct = thumbResp.headers["content-type"] || "";
      if (ct.includes("text/html") || thumbResp.data.byteLength < 1000) continue;
      const mimeType = ct.includes("png") ? "image/png" : ct.includes("webp") ? "image/webp" : "image/jpeg";
      const base64 = Buffer.from(thumbResp.data).toString("base64");
      thumbnailData.push({ index: c.index, base64, mimeType, title: c.title, width: c.width, height: c.height });
    } catch {}
  }

  // If we got at least 2 thumbnails, use vision-based selection
  if (thumbnailData.length >= 2) {
    try {
      const result = await claudeVisionPick(thumbnailData, narration, query, displayStyle, era, eraInstruction, candidates.length);
      if (result !== null) return result;
    } catch (e) {
      console.log("    Vision pick failed (" + e.message + "), falling back to title-based");
    }
  }

  // Fallback: title-based selection (no vision)
  const candidateList = candidates.map((c, i) =>
    (i+1) + ". \"" + c.title + "\" from " + c.source + " (" + c.width + "x" + c.height + ")"
  ).join("\n");

  const response = await axios.post("https://api.anthropic.com/v1/messages", {
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Pick the BEST image for this video scene.

NARRATOR SAYS: "${narration}"
SEARCH QUERY: ${query}${eraInstruction}

IMAGE OPTIONS (by title only — I couldn't load thumbnails):
${candidateList}

Which image (1-${candidates.length}) best matches the narrator's sentence? Reply "0" if none match.
Reply with ONLY the number.`
    }]
  }, {
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    timeout: 15000
  });

  const text = response.data.content[0]?.text || "1";
  const num = parseInt(text.match(/\d+/)?.[0] || "1");
  if (num === 0) {
    console.log("    Claude rejected all candidates (title-based)");
    return -1;
  }
  const picked = Math.max(0, Math.min(num - 1, candidates.length - 1));
  console.log("    Claude picked #" + (picked+1) + " (title-based): " + candidates[picked].title.substring(0, 60));
  return picked;
}

// Vision-based image selection: Claude actually SEES the thumbnails
async function claudeVisionPick(thumbnailData, narration, query, displayStyle, era, eraInstruction, totalCandidates) {
  // Build multimodal content: text prompt + all thumbnail images
  const content = [];

  content.push({
    type: "text",
    text: `I'm making a YouTube video. Look at these ${thumbnailData.length} candidate images and pick the one that BEST matches what the narrator is saying RIGHT NOW.

NARRATOR SAYS: "${narration}"
SEARCH QUERY: ${query}${eraInstruction}

RULES:
1. The image must show what the narrator is LITERALLY describing. If they say "wall sit exercise" the image must show a wall sit, not a squat. If they say "Colombia" it must show Colombia, not China.
2. Reject images that show the wrong country, wrong exercise, wrong person, wrong topic — even if they're high quality.
3. Reject images with visible watermarks, heavy text overlays, or low resolution.
4. If NONE of the images match the narrator's sentence, reply "0" to reject all.

The images are labeled 1-${thumbnailData.length} below. Reply with ONLY the number of the best match (or 0 to reject all).`
  });

  // Add each thumbnail as an image block with a label
  for (let i = 0; i < thumbnailData.length; i++) {
    const t = thumbnailData[i];
    content.push({
      type: "text",
      text: `\nImage ${i + 1} (${t.width}x${t.height}, "${t.title.substring(0, 60)}"):`
    });
    content.push({
      type: "image",
      source: { type: "base64", media_type: t.mimeType, data: t.base64 }
    });
  }

  const response = await axios.post("https://api.anthropic.com/v1/messages", {
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{ role: "user", content }]
  }, {
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    timeout: 20000
  });

  const text = response.data.content[0]?.text || "";
  const num = parseInt(text.match(/\d+/)?.[0] || "0");

  if (num === 0) {
    console.log("    Claude Vision rejected all " + thumbnailData.length + " images as irrelevant");
    return -1;
  }

  if (num < 1 || num > thumbnailData.length) return null; // invalid response, fall back

  // Map back from thumbnail index to original candidate index
  const picked = thumbnailData[num - 1].index;
  console.log("    Claude Vision picked #" + (picked+1) + ": " + thumbnailData[num - 1].title.substring(0, 60));
  return picked;
}

async function downloadImage(url, outputPath, minBytes) {
  if (!minBytes) minBytes = 5000;
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer", timeout: 12000, maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.google.com/",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const ct = response.headers["content-type"] || "";
    if (ct.includes("text/html")) return false;
    if (response.data.byteLength < minBytes) return false;
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    console.log("    Downloaded " + Math.round(response.data.byteLength / 1024) + "KB");
    return true;
  } catch (error) { return false; }
}

export function isWebSearchAvailable() {
  return !!process.env.BRAVE_API_KEY;
}
