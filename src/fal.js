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
 * Generate an AI image using Fal.ai Flux Pro.
 * Higher quality than Schnell (~$0.05), sharper details, more photorealistic.
 */
export async function generateAIImage(prompt, outputPath) {
  // Enforce photorealistic style on EVERY prompt — Flux needs explicit style keywords
  // or it defaults to AI-art aesthetic (glossy, exaggerated, cartoony)
  const hasPhotoStyle = prompt.toLowerCase().includes("photograph") || prompt.toLowerCase().includes("dslr");
  const realism = "anatomically correct humans, physically plausible objects, no extra limbs or fingers, no text or writing visible";
  const styleEnforced = hasPhotoStyle
    ? `${prompt}, ${realism}`
    : `${prompt}. Shot on DSLR camera, 35mm lens, natural lighting, photorealistic photograph, editorial quality, ${realism}.`;

  const resp = await axios.post(
    "https://fal.run/fal-ai/flux-pro/v1.1",
    {
      prompt: styleEnforced,
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
