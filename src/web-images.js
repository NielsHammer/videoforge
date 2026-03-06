import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

/**
 * VideoForge v29 — Smart Web Image Search
 * 
 * Brave finds 10 candidates → Claude picks the best match for the scene → download HD
 * Falls back to: Pexels (pipeline.js) → Fal.ai AI generation (pipeline.js)
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

    // Build candidate list with metadata for Claude to evaluate
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

    // Ask Claude to pick the best image for this scene
    let bestIndex = 0;
    if (process.env.ANTHROPIC_API_KEY && sceneContext) {
      try {
        bestIndex = await claudePickBest(candidates, query, sceneContext);
      } catch (e) {
        console.log("    Claude pick failed, using first result");
        bestIndex = 0;
      }
    }

    // Try the Claude-picked result first, then others as fallback
    const order = [bestIndex, ...Array.from({length: candidates.length}, (_, i) => i).filter(i => i !== bestIndex)];

    for (const idx of order) {
      if (idx >= candidates.length) continue;
      const c = candidates[idx];
      const label = idx === bestIndex ? " [BEST]" : "";

      // Try original URL first (HD)
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
  const narration = sceneContext.narration_segment || sceneContext.subtitle_text || "";
  const displayStyle = sceneContext.display_style || "";
  
  const candidateList = candidates.map((c, i) => 
    (i+1) + ". \"" + c.title + "\" from " + c.source + " (" + c.width + "x" + c.height + ")"
  ).join("\n");

  const response = await axios.post("https://api.anthropic.com/v1/messages", {
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: "I'm making a video. Pick the BEST image for this scene.\n\nSCENE: The narrator says: \"" + narration + "\"\nSEARCH QUERY: " + query + "\nDISPLAY: " + displayStyle + "\n\nIMAGE OPTIONS:\n" + candidateList + "\n\nWhich image number (1-" + candidates.length + ") best matches this scene? Consider:\n- Relevance to what the narrator is saying\n- Image quality (higher resolution is better)\n- Professional look (news/editorial photos > random blog images)\n- If showing a person, prefer clear face shots\n\nReply with ONLY the number, nothing else."
    }]
  }, {
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    timeout: 15000
  });

  const text = response.data.content[0]?.text || "1";
  const num = parseInt(text.match(/\d+/)?.[0] || "1");
  const picked = Math.max(0, Math.min(num - 1, candidates.length - 1));
  console.log("    Claude picked #" + (picked+1) + ": " + candidates[picked].title.substring(0, 60));
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
