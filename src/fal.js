import axios from "axios";
import fs from "fs";
import path from "path";

const FAL_KEY = process.env.FAL_KEY;
const FAL_BASE = "https://queue.fal.run";

/**
 * Remove background from an image using BiRefNet (FREE on fal.ai).
 * Returns path to transparent PNG.
 */
export async function removeBackground(imagePath, outputPath) {
  // First upload the image to get a URL fal.ai can access
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const dataUrl = `data:${mimeType};base64,${base64}`;

  // Use the fal.ai upload endpoint
  const uploadResp = await axios.post(
    "https://fal.run/fal-ai/birefnet/v2",
    {
      image_url: dataUrl,
    },
    {
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  // Download the result
  const resultUrl = uploadResp.data.image.url;
  const imgResp = await axios.get(resultUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  fs.writeFileSync(outputPath, Buffer.from(imgResp.data));
  return outputPath;
}

/**
 * Generate an AI image using Fal.ai Flux Schnell.
 * Fast, cheap (~$0.03), good quality.
 */
export async function generateAIImage(prompt, outputPath) {
  const resp = await axios.post(
    "https://fal.run/fal-ai/flux/schnell",
    {
      prompt: prompt,
      image_size: "landscape_16_9",
      num_images: 1,
    },
    {
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );

  const imageUrl = resp.data.images[0].url;
  const imgResp = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  fs.writeFileSync(outputPath, Buffer.from(imgResp.data));
  return outputPath;
}
