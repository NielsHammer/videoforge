/**
 * Web screenshot capture via Puppeteer.
 *
 * When the planner picks a branded menu entry we don't have a hand-coded
 * component for, it falls back to `stock_web_screenshot` with a URL. This
 * module captures that URL as a PNG and returns the file path so the render
 * pipeline can use it as an image.
 *
 * Safe by design:
 *   - 8s page-load timeout
 *   - 2s wait after navigation so JS renders
 *   - All failures fall back to null so the caller can use a generic image
 */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const SCREENSHOT_DIR = '/opt/videoforge/output/v2-screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// v2 iter 10 fix: create and destroy a new browser per capture. The shared
// singleton approach kept Chrome helper processes alive after close() returned,
// preventing node from exiting and leaving ~30 zombie processes per run. This
// is slower (~2-3s overhead per capture) but guaranteed to clean up.
async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });
}

// Kept for API compatibility — no-op now since each capture self-cleans.
export async function closeBrowser() {
  // intentional no-op
}

/**
 * Capture a URL as a PNG. Returns the file path on success, null on failure.
 * @param {string} url - The URL to capture (must start with http/https).
 * @param {string} label - Short label used in the filename.
 */
export async function captureWebScreenshot(url, label = 'capture') {
  if (!url || typeof url !== 'string') return null;
  if (!/^https?:\/\//.test(url)) return null;

  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
  const filename = `${Date.now()}-${safeLabel}.png`;
  const outPath = path.join(SCREENSHOT_DIR, filename);

  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: outPath, type: 'png', fullPage: false });
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 5000) {
      return outPath;
    }
    return null;
  } catch (err) {
    console.log(`  ⚠️  screenshot failed for ${url}: ${err.message}`);
    return null;
  } finally {
    // Always tear down the browser — even on failure — so node can exit.
    if (browser) {
      try {
        const pages = await browser.pages().catch(() => []);
        for (const p of pages) { try { await p.close(); } catch {} }
        await browser.close();
        // Kill the underlying process aggressively to prevent lingering helpers
        const proc = browser.process();
        if (proc && !proc.killed) { try { proc.kill('SIGKILL'); } catch {} }
      } catch {}
    }
  }
}

/**
 * Known brand → URL map. The planner can pick from a brand name and we look
 * up the canonical URL here. Falls back to a bare URL if provided directly.
 */
export const BRAND_URLS = {
  youtube: 'https://www.youtube.com',
  'youtube studio': 'https://studio.youtube.com',
  fiverr: 'https://www.fiverr.com',
  upwork: 'https://www.upwork.com',
  elevenlabs: 'https://elevenlabs.io',
  chatgpt: 'https://chat.openai.com',
  claude: 'https://claude.ai',
  notion: 'https://www.notion.so',
  canva: 'https://www.canva.com',
  'google docs': 'https://docs.google.com',
  gmail: 'https://mail.google.com',
  slack: 'https://slack.com',
  github: 'https://github.com',
  stripe: 'https://stripe.com',
  linkedin: 'https://www.linkedin.com',
  twitter: 'https://twitter.com',
  x: 'https://x.com',
  instagram: 'https://www.instagram.com',
  tiktok: 'https://www.tiktok.com',
  medium: 'https://medium.com',
  substack: 'https://substack.com',
  patreon: 'https://www.patreon.com',
  shopify: 'https://www.shopify.com',
};

export function resolveBrandUrl(nameOrUrl) {
  if (!nameOrUrl) return null;
  if (/^https?:\/\//.test(nameOrUrl)) return nameOrUrl;
  const key = nameOrUrl.trim().toLowerCase();
  return BRAND_URLS[key] || null;
}
