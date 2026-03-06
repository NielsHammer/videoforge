import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FAL_KEY = process.env.FAL_KEY;
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// ─── 50 THEMES ───────────────────────────────────────────────────────────────
const GRID_THEMES = {
  // Tech / Digital
  blue_grid:      { bg1: "#050a18", bg2: "#0a1628", accent: "#4a9eff", glow: "rgba(74,158,255,0.15)" },
  electric_cyan:  { bg1: "#001210", bg2: "#001a18", accent: "#00ffcc", glow: "rgba(0,255,204,0.15)" },
  neon_green:     { bg1: "#001200", bg2: "#001a00", accent: "#44ff44", glow: "rgba(68,255,68,0.15)" },
  ice_blue:       { bg1: "#051018", bg2: "#081828", accent: "#88ccff", glow: "rgba(136,204,255,0.15)" },
  steel_grey:     { bg1: "#0a0a0f", bg2: "#101018", accent: "#8899bb", glow: "rgba(136,153,187,0.15)" },
  ai_neural:      { bg1: "#080010", bg2: "#100020", accent: "#cc44ff", glow: "rgba(204,68,255,0.18)" },
  lab:            { bg1: "#030810", bg2: "#061018", accent: "#44aaff", glow: "rgba(68,170,255,0.12)" },

  // Finance / Business
  gold_luxury:    { bg1: "#0f0a00", bg2: "#1a1200", accent: "#ffd700", glow: "rgba(255,215,0,0.15)" },
  wall_street:    { bg1: "#030810", bg2: "#050f18", accent: "#4477dd", glow: "rgba(68,119,221,0.15)" },
  rose_gold:      { bg1: "#120a08", bg2: "#1a1210", accent: "#ddaa88", glow: "rgba(221,170,136,0.15)" },

  // Energy / Action
  red_energy:     { bg1: "#120505", bg2: "#1a0808", accent: "#ff4444", glow: "rgba(255,68,68,0.15)" },
  orange_fire:    { bg1: "#120800", bg2: "#1a0f00", accent: "#ff8844", glow: "rgba(255,136,68,0.15)" },
  sunset_warm:    { bg1: "#120a00", bg2: "#1a1000", accent: "#ff9944", glow: "rgba(255,153,68,0.15)" },

  // Mystery / Drama
  midnight_blue:  { bg1: "#050510", bg2: "#080818", accent: "#3344aa", glow: "rgba(51,68,170,0.15)" },
  blood_red:      { bg1: "#100000", bg2: "#1a0505", accent: "#cc2222", glow: "rgba(204,34,34,0.15)" },
  dark_horror:    { bg1: "#080005", bg2: "#100008", accent: "#880033", glow: "rgba(136,0,51,0.2)" },
  dark_crime:     { bg1: "#050505", bg2: "#0a0a0a", accent: "#aa0000", glow: "rgba(170,0,0,0.18)" },
  conspiracy:     { bg1: "#040804", bg2: "#080f08", accent: "#336633", glow: "rgba(51,102,51,0.15)" },

  // Space / Cosmic
  purple_cosmic:  { bg1: "#0a051a", bg2: "#120828", accent: "#9955ff", glow: "rgba(153,85,255,0.15)" },
  aurora:         { bg1: "#051210", bg2: "#081a15", accent: "#44ddaa", glow: "rgba(68,221,170,0.15)" },
  celestial:      { bg1: "#030510", bg2: "#060818", accent: "#6644cc", glow: "rgba(102,68,204,0.18)" },
  mythology:      { bg1: "#0a0805", bg2: "#150f08", accent: "#cc8833", glow: "rgba(204,136,51,0.18)" },

  // Nature / Travel
  forest_green:   { bg1: "#050f05", bg2: "#081808", accent: "#44aa44", glow: "rgba(68,170,68,0.15)" },
  teal_ocean:     { bg1: "#051210", bg2: "#081a18", accent: "#44ddcc", glow: "rgba(68,221,204,0.15)" },
  earth_brown:    { bg1: "#0f0a05", bg2: "#1a1208", accent: "#aa8844", glow: "rgba(170,136,68,0.15)" },
  tropical:       { bg1: "#051510", bg2: "#081f18", accent: "#00ddaa", glow: "rgba(0,221,170,0.18)" },
  mountains:      { bg1: "#080c12", bg2: "#0c1018", accent: "#8899cc", glow: "rgba(136,153,204,0.15)" },
  desert:         { bg1: "#150f05", bg2: "#1f1808", accent: "#ddaa44", glow: "rgba(221,170,68,0.18)" },
  arctic:         { bg1: "#080c15", bg2: "#0c1220", accent: "#aaccff", glow: "rgba(170,204,255,0.15)" },

  // History / Culture
  ancient_rome:   { bg1: "#100c05", bg2: "#1a1508", accent: "#cc9933", glow: "rgba(204,153,51,0.18)" },
  medieval:       { bg1: "#080808", bg2: "#100c0a", accent: "#886633", glow: "rgba(136,102,51,0.18)" },
  egypt:          { bg1: "#120e00", bg2: "#1c1500", accent: "#ddbb44", glow: "rgba(221,187,68,0.18)" },
  old_map:        { bg1: "#0f0c05", bg2: "#181208", accent: "#aa9955", glow: "rgba(170,153,85,0.15)" },
  museum:         { bg1: "#0a0a0a", bg2: "#141414", accent: "#ccbbaa", glow: "rgba(204,187,170,0.12)" },

  // Entertainment
  pink_neon:      { bg1: "#12051a", bg2: "#1a0822", accent: "#ff44aa", glow: "rgba(255,68,170,0.15)" },
  cinema:         { bg1: "#0a0505", bg2: "#150808", accent: "#cc4422", glow: "rgba(204,68,34,0.18)" },
  gaming:         { bg1: "#080015", bg2: "#0f0022", accent: "#8833ff", glow: "rgba(136,51,255,0.18)" },
  music_waves:    { bg1: "#050010", bg2: "#080018", accent: "#ff3388", glow: "rgba(255,51,136,0.18)" },

  // Health / Wellness
  green_matrix:   { bg1: "#050f05", bg2: "#0a1a0a", accent: "#39ff6e", glow: "rgba(57,255,110,0.15)" },
  gym_fitness:    { bg1: "#080f05", bg2: "#0f1808", accent: "#88ff44", glow: "rgba(136,255,68,0.18)" },
  mindfulness:    { bg1: "#0a0815", bg2: "#120f20", accent: "#bb88ee", glow: "rgba(187,136,238,0.15)" },

  // Spiritual
  royal_purple:   { bg1: "#0a0518", bg2: "#120828", accent: "#8844cc", glow: "rgba(136,68,204,0.15)" },

  // Cozy / Lifestyle
  cozy_library:   { bg1: "#100c08", bg2: "#1a1510", accent: "#cc9966", glow: "rgba(204,153,102,0.18)" },
  cooking:        { bg1: "#120a05", bg2: "#1c1208", accent: "#ff8855", glow: "rgba(255,136,85,0.18)" },

  // War / Military
  war_military:   { bg1: "#080a05", bg2: "#0f1008", accent: "#667744", glow: "rgba(102,119,68,0.15)" },

  // Default fallbacks
  neon_purple:    { bg1: "#0a0015", bg2: "#10002a", accent: "#cc00ff", glow: "rgba(204,0,255,0.18)" },
  crypto_dark:    { bg1: "#050810", bg2: "#080f18", accent: "#ffaa00", glow: "rgba(255,170,0,0.18)" },
};

// All valid theme names (for Claude to choose from)
const ALL_THEMES = Object.keys(GRID_THEMES);

// ─── Claude picks the best theme + writes the thumbnail image prompt ──────────
async function getThemeAndPrompt(title, topic) {
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are a YouTube thumbnail designer. Given a video title and topic, pick the best background theme and write the perfect AI image generation prompt.

Video title: "${title}"
Topic: "${topic}"

Available themes: ${ALL_THEMES.join(", ")}

Rules for theme selection:
- History/ancient/empire topics → ancient_rome, medieval, egypt, old_map, museum
- Horror/scary/paranormal → dark_horror, blood_red, midnight_blue
- Crime/mystery/thriller → dark_crime, conspiracy, midnight_blue
- Finance/investing/money → gold_luxury, wall_street, blue_grid
- Tech/AI/coding → electric_cyan, ai_neural, lab, ice_blue
- Space/cosmos/astronomy → purple_cosmic, celestial, mythology
- Nature/travel/adventure → forest_green, tropical, mountains, desert
- Health/fitness/wellness → gym_fitness, mindfulness, teal_ocean
- Gaming → gaming, neon_green, purple_cosmic
- Music/entertainment → music_waves, cinema, pink_neon
- Motivation/hustle/success → orange_fire, red_energy, gold_luxury
- Spiritual/philosophy → royal_purple, celestial, mindfulness
- War/military/conflict → war_military, dark_crime, steel_grey
- Food/cooking → cooking, cozy_library, rose_gold
- Luxury/wealth/billionaires → gold_luxury, rose_gold, royal_purple
- Cozy/books/education → cozy_library, museum, earth_brown, old_map

Rules for the image prompt:
- The image MUST feature a PERSON as the main focus (close-up or medium shot)
- Person should match the theme: Roman soldier for ancient history, explorer for travel, etc.
- Dramatic expression: shocked, amazed, overwhelmed, terrified, triumphant
- Photorealistic, ultra HD, cinematic studio lighting
- High contrast, attention-grabbing colors
- NO text in the image, NO watermarks
- Under 80 words

Reply with ONLY valid JSON, no markdown:
{"theme": "theme_name_here", "image_prompt": "your prompt here"}`
      }]
    });

    const text = r.content[0].text.trim();
    const parsed = JSON.parse(text);
    const theme = ALL_THEMES.includes(parsed.theme) ? parsed.theme : "blue_grid";
    return { theme, imagePrompt: parsed.image_prompt };
  } catch (e) {
    console.log("  [Theme] Claude failed, using fallback: " + e.message);
    return { theme: "blue_grid", imagePrompt: `Dramatic close-up of a person looking shocked and amazed, photorealistic, cinematic lighting, high contrast, ultra HD, professional photography` };
  }
}

// ─── Title text — Claude writes clickbait title fitting the topic ─────────────
async function generateTitleText(videoTitle, topic) {
  console.log("  [Title] Generating hook text...");
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `Create a 4-6 word YouTube thumbnail text for maximum clicks.

Video title: ${videoTitle}
Topic: ${topic}

Rules:
- 4-6 words, ALL CAPS
- Must be SPECIFIC to the topic — no generic words like EXPOSED or SHOCKING unless they genuinely fit
- For history topics: use words like THE TRUTH, NEVER TAUGHT, REAL STORY, HIDDEN HISTORY, WHAT HAPPENED
- For finance topics: use words like THE SECRET, HOW THEY DID IT, REAL NUMBERS
- For crime/drama: use words like THE TRUTH, WHAT REALLY HAPPENED, THEY HID THIS
- For travel: use words like YOU WONT BELIEVE, HIDDEN GEM, MOST BEAUTIFUL
- For motivation: use words like NOBODY TELLS YOU, CHANGE YOUR LIFE, THE REAL SECRET
- Creates curiosity — viewer NEEDS to click
- References the specific subject matter if possible

Reply with ONLY the text, nothing else.`
      }]
    });
    return r.content[0].text.trim().replace(/"/g, "");
  } catch (e) {
    console.log("  [Title] Claude failed, using fallback: " + e.message);
    return videoTitle.toUpperCase().split(' ').slice(0, 5).join(' ');
  }
}

// ─── Brave image search ───────────────────────────────────────────────────────
async function searchBraveImage(query) {
  if (!BRAVE_API_KEY) return null;
  try {
    console.log("  [Image] Searching Brave for: " + query);
    const r = await axios.get("https://api.search.brave.com/res/v1/images/search", {
      params: { q: query, count: 10 },
      headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY },
      timeout: 10000
    });
    const results = r.data?.results || [];
    for (const img of results) {
      const url = img.properties?.url;
      const w = img.properties?.width || 0;
      const h = img.properties?.height || 0;
      if (url && w >= 400 && h >= 300) {
        console.log("  [Image] Found Brave image (" + w + "x" + h + "): " + url.substring(0, 80));
        return url;
      }
    }
    for (const img of results) {
      if (img.thumbnail?.src) {
        console.log("  [Image] Using Brave thumbnail: " + img.thumbnail.src.substring(0, 80));
        return img.thumbnail.src;
      }
    }
  } catch (e) { console.log("  [Image] Brave search failed: " + e.message); }
  return null;
}

// ─── Pexels image fallback ────────────────────────────────────────────────────
async function searchPexelsImage(query) {
  const PEXELS_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_KEY) return null;
  try {
    console.log("  [Image] Trying Pexels for: " + query);
    const r = await axios.get("https://api.pexels.com/v1/search", {
      params: { query, per_page: 5, orientation: "landscape" },
      headers: { Authorization: PEXELS_KEY },
      timeout: 10000
    });
    const photos = r.data?.photos || [];
    if (photos.length > 0) {
      const url = photos[0].src?.large2x || photos[0].src?.large || photos[0].src?.medium;
      if (url) { console.log("  [Image] Pexels found: " + url.substring(0, 80)); return url; }
    }
  } catch (e) { console.log("  [Image] Pexels failed: " + e.message); }
  return null;
}

// ─── Check if topic is about a specific real person/brand ────────────────────
async function shouldUseRealPhoto(title, topic) {
  try {
    const r = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `Is this video about a SPECIFIC real person, company, or brand? If yes, reply with ONLY the search query to find a dramatic/clickbaity photo of them (e.g. 'Sam Bankman-Fried shocked face' or 'FTX logo dramatic'). If no specific person/company, reply with just 'NO'.

Video: ${title}
Topic: ${topic}`
      }]
    });
    const answer = r.content[0].text.trim();
    if (answer === "NO" || answer.length < 3) return null;
    return answer;
  } catch (e) { return null; }
}

// ─── Fal.ai image generation ──────────────────────────────────────────────────
async function generateFalImage(prompt) {
  if (!FAL_KEY) { console.log("  [Image] No FAL_KEY"); return null; }
  console.log("  [Image] Generating with Fal.ai...");
  console.log("  [Image] Prompt: " + prompt.substring(0, 80) + "...");

  for (let a = 1; a <= 3; a++) {
    console.log("  [Image] Attempt " + a + "/3...");
    try {
      const r = await axios.post(
        "https://queue.fal.run/fal-ai/flux-pro/v1.1",
        { prompt, image_size: { width: 768, height: 768 }, num_images: 1, enable_safety_checker: true },
        { headers: { Authorization: "Key " + FAL_KEY, "Content-Type": "application/json" }, timeout: 120000 }
      );
      const rid = r.data.request_id;
      if (!rid) {
        const im = r.data.images || r.data.output?.images;
        if (im && im.length > 0) return im[0].url;
        continue;
      }
      console.log("  [Image] Queued, polling...");
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 2000));
        try {
          const s = await axios.get(
            "https://queue.fal.run/fal-ai/flux-pro/requests/" + rid + "/status",
            { headers: { Authorization: "Key " + FAL_KEY }, timeout: 10000 }
          );
          if (s.data.status === "COMPLETED") {
            const r2 = await axios.get(
              "https://queue.fal.run/fal-ai/flux-pro/requests/" + rid,
              { headers: { Authorization: "Key " + FAL_KEY }, timeout: 15000 }
            );
            const im = r2.data.images || r2.data.output?.images;
            if (im && im.length > 0) { console.log("  [Image] Done attempt " + a); return im[0].url; }
          }
          if (s.data.status === "FAILED") { console.log("  [Image] Fal.ai generation failed"); break; }
          if (i >= 88) { console.log("  [Image] Fal.ai polling timeout"); break; }
        } catch (e) {}
      }
    } catch (e) { console.log("  [Image] Attempt " + a + " error: " + e.message); }
  }
  console.log("  [Image] All 3 attempts failed");
  return null;
}

// ─── Grid background HTML ─────────────────────────────────────────────────────
function generateGridHTML(themeName) {
  const th = GRID_THEMES[themeName] || GRID_THEMES.blue_grid;
  let vL = "";
  for (let i = 0; i < 16; i++) {
    const x = i * 85;
    const op = i % 3 === 0 ? 0.35 : 0.15;
    const sw = i % 3 === 0 ? 1.5 : 0.8;
    vL += '<path d="M' + x + ',0 Q' + (x + 12) + ',180 ' + (x - 8) + ',360 Q' + (x + 15) + ',540 ' + x + ',720" stroke="' + th.accent + '" stroke-width="' + sw + '" fill="none" opacity="' + op + '"/>';
  }
  let hL = "";
  for (let i = 0; i < 10; i++) {
    const y = i * 80;
    const op = i % 3 === 0 ? 0.35 : 0.15;
    const sw = i % 3 === 0 ? 1.5 : 0.8;
    hL += '<path d="M0,' + y + ' Q320,' + (y + 10) + ' 640,' + (y - 8) + ' Q960,' + (y + 12) + ' 1280,' + y + '" stroke="' + th.accent + '" stroke-width="' + sw + '" fill="none" opacity="' + op + '"/>';
  }
  let dots = "";
  for (let i = 0; i < 20; i++) {
    dots += '<circle cx="' + (60 + Math.floor(Math.random() * 1160)) + '" cy="' + (50 + Math.floor(Math.random() * 620)) + '" r="2.5" fill="' + th.accent + '" opacity="0.5"/>';
  }
  let p = "";
  for (let i = 0; i < 15; i++) {
    const l = 5 + Math.floor(Math.random() * 90);
    const t2 = 5 + Math.floor(Math.random() * 90);
    const sz = 2 + Math.floor(Math.random() * 4);
    const o = (0.2 + Math.random() * 0.4).toFixed(2);
    p += '<div style="position:absolute;left:' + l + '%;top:' + t2 + '%;width:' + sz + 'px;height:' + sz + 'px;background:' + th.accent + ';border-radius:50%;opacity:' + o + ';box-shadow:0 0 ' + (sz * 3) + 'px ' + th.accent + ';"></div>';
  }
  return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,' + th.bg1 + ' 0%,' + th.bg2 + ' 50%,' + th.bg1 + ' 100%);overflow:hidden;"><svg width="1280" height="720" style="position:absolute;inset:0;" xmlns="http://www.w3.org/2000/svg">' + vL + hL + dots + '</svg><div style="position:absolute;top:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,' + th.glow + ',transparent 70%);"></div><div style="position:absolute;bottom:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,' + th.glow + ',transparent 70%);"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,' + th.glow + ',transparent 70%);"></div>' + p + '</div>';
}

// ─── Arrow SVG ────────────────────────────────────────────────────────────────
function generateArrowSVG(style, accent) {
  const arrowPath = "M 93.5625 230.84375 L 98.140625 239.574219 C 100.757812 244.554688 107.246094 253.886719 111.007812 258.070312 L 116.054688 263.683594 C 118.261719 266.140625 123.617188 272.707031 125.582031 275.367188 L 249.125 442.679688 C 249.671875 443.417969 250.585938 443.777344 251.488281 443.609375 L 259.867188 442.03125 C 260.800781 441.855469 261.613281 441.28125 262.089844 440.457031 L 286.46875 398.492188 C 286.886719 397.777344 287.800781 397.535156 288.515625 397.949219 L 298.359375 403.667969 C 303.53125 406.671875 315.953125 412.585938 321.546875 414.699219 L 353.996094 426.988281 C 368.84375 432.609375 400.636719 440.539062 416.382812 442.550781 L 432.4375 444.601562 C 439.875 445.550781 457.179688 446.347656 464.671875 446.089844 L 483.015625 445.453125 C 491.183594 445.167969 511.425781 443.296875 519.507812 442.078125 L 534.550781 439.808594 C 541.589844 438.746094 557.257812 434.957031 564.007812 432.683594 L 602.070312 419.871094 C 611.558594 416.675781 632.75 407.554688 641.589844 402.855469 L 651.121094 397.792969 C 655.484375 395.476562 665.359375 389.253906 669.332031 386.320312 L 694.089844 368.039062 C 705.875 359.335938 729.703125 337.835938 739.566406 327 L 752 313.347656 C 757.828125 306.945312 769.660156 291.386719 774.273438 284.058594 L 782.71875 270.644531 C 786.71875 264.289062 794.191406 249.460938 796.917969 242.460938 L 803.617188 225.269531 C 806.875 216.914062 811.71875 198.703125 813.042969 189.832031 L 816.691406 165.476562 C 816.832031 164.53125 816.597656 163.5625 816.03125 162.789062 L 812.304688 157.675781 C 811.785156 156.964844 810.851562 156.695312 810.035156 157.027344 L 548.714844 262.457031 C 540.25 265.871094 520.480469 271.90625 511.550781 273.796875 L 502.007812 275.820312 C 497.382812 276.800781 487.445312 277.785156 482.71875 277.730469 L 452.253906 277.386719 C 442.992188 277.28125 424.796875 274.683594 415.875 272.195312 L 406.953125 269.703125 C 402.765625 268.535156 393.597656 265.074219 389.683594 263.1875 L 369.121094 253.265625 C 368.34375 252.890625 367.957031 252.007812 368.203125 251.183594 L 369.851562 245.6875 C 370.867188 242.300781 373.769531 235.550781 375.53125 232.484375 L 391.21875 205.167969 C 391.691406 204.351562 391.757812 203.359375 391.40625 202.484375 L 390.835938 201.070312 C 390.476562 200.179688 389.777344 199.46875 388.898438 199.09375 L 385.863281 197.804688 C 383.3125 196.71875 379.441406 196.121094 376.679688 196.386719 L 111.4375 221.695312 C 107.570312 222.066406 102.039062 223.894531 98.730469 225.933594 L 94.144531 228.738281 C 93.425781 229.175781 93.171875 230.097656 93.5625 230.84375 Z";
  const configs = [
    { tx: 320, ty: 330, sx: 0.65, sy: 0.72, rot: 22 },
    { tx: 300, ty: 320, sx: 0.67, sy: 0.74, rot: 20 },
    { tx: 340, ty: 340, sx: 0.63, sy: 0.70, rot: 24 },
    { tx: 310, ty: 325, sx: 0.66, sy: 0.73, rot: 21 },
    { tx: 330, ty: 335, sx: 0.64, sy: 0.71, rot: 23 }
  ];
  const c = configs[(style - 1) % 5];
  return '<svg width="1280" height="720" style="position:absolute;inset:0;z-index:8;" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><filter id="ds"><feDropShadow dx="4" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.55)"/></filter></defs>'
    + '<g transform="translate(' + c.tx + ',' + c.ty + ') scale(' + c.sx + ',' + c.sy + ')" filter="url(#ds)">'
    + '<path d="' + arrowPath + '" fill="' + accent + '"/>'
    + '</g></svg>';
}

// ─── Impact font character width table (measured, not guessed) ───────────────
// Impact is narrow — widths vary a lot per character. These are ratios at any font size.
const IMPACT_WIDTHS = {
  ' ':0.28,'A':0.54,'B':0.52,'C':0.50,'D':0.55,'E':0.46,'F':0.43,'G':0.54,
  'H':0.56,'I':0.22,'J':0.36,'K':0.52,'L':0.43,'M':0.64,'N':0.57,'O':0.58,
  'P':0.48,'Q':0.58,'R':0.52,'S':0.46,'T':0.44,'U':0.55,'V':0.52,'W':0.72,
  'X':0.52,'Y':0.46,'Z':0.50,'0':0.52,'1':0.36,'2':0.48,'3':0.48,'4':0.52,
  '5':0.48,'6':0.52,'7':0.44,'8':0.52,'9':0.52,'-':0.34,"'":0.22,':':0.28,
  '!':0.28,'?':0.44,'.':0.24,',':0.24
};
function measureText(text, fontSize) {
  let w = 0;
  for (const ch of text.toUpperCase()) w += (IMPACT_WIDTHS[ch] || 0.52) * fontSize;
  return w;
}

function wrapText(text, fontSize, maxWidth) {
  const words = text.toUpperCase().split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (measureText(test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function bestFontSize(text, boxW, boxH, minSize = 40, maxSize = 78) {
  const maxLineW = boxW - 48;
  for (let fs = maxSize; fs >= minSize; fs -= 2) {
    const lines = wrapText(text, fs, maxLineW);
    const totalH = lines.length * fs * 1.2;
    // Check no single line overflows AND total height fits
    const fits = totalH <= boxH - 32 && lines.every(l => measureText(l, fs) <= maxLineW);
    if (fits) return { fontSize: fs, lines };
  }
  // Last resort: force at minSize even if slightly over
  return { fontSize: minSize, lines: wrapText(text, minSize, maxLineW) };
}

// ─── Assemble full HTML ───────────────────────────────────────────────────────
function assembleHTML(gridHTML, imageUrl, titleText, arrowStyle, themeName) {
  const th = GRID_THEMES[themeName] || GRID_THEMES.blue_grid;
  const imgLayer = imageUrl
    ? '<div style="position:absolute;left:40px;top:80px;width:540px;height:560px;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 20px ' + th.glow + ';"><img src="' + imageUrl + '" style="width:100%;height:100%;object-fit:cover;"/></div>'
    : '';
  const arrowLayer = generateArrowSVG(arrowStyle, th.accent);

  const boxX = 630, boxY = 80, boxW = 620, boxH = 340;
  const centerX = boxX + boxW / 2;

  const { fontSize, lines } = bestFontSize(titleText, boxW, boxH);
  const lineHeight = fontSize * 1.2;
  const totalTextH = lines.length * lineHeight;
  const startY = boxY + (boxH - totalTextH) / 2 + fontSize * 0.85;

  let svgLines = '';
  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1;
    const color = isLast ? th.accent : '#ffffff';
    const y = startY + idx * lineHeight;
    svgLines += `<text x="${centerX}" y="${y}" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-weight="900" font-size="${fontSize}" fill="${color}" style="filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.9))">${line}</text>`;
  });

  const titleLayer = `<svg width="1280" height="720" style="position:absolute;inset:0;z-index:10;" xmlns="http://www.w3.org/2000/svg">
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="16" fill="rgba(0,0,0,0.72)" stroke="${th.accent}" stroke-width="2" opacity="0.95"/>
    ${svgLines}
  </svg>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{width:1280px;height:720px;overflow:hidden;background:#000;}</style></head><body style="position:relative;width:1280px;height:720px;">${gridHTML}${imgLayer}${arrowLayer}${titleLayer}</body></html>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateThumbnail(outputDir, title, topic) {
  console.log("============================================================");
  console.log("VideoForge Thumbnail v10 (50 themes + Claude theme picker)");
  console.log("============================================================");
  console.log("Title: " + title);
  console.log("Topic: " + topic);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Claude picks theme + writes image prompt + generates title text — all in parallel
  const [{ theme, imagePrompt }, titleText, realPhotoQuery] = await Promise.all([
    getThemeAndPrompt(title, topic),
    generateTitleText(title, topic),
    shouldUseRealPhoto(title, topic),
  ]);

  console.log("  Theme: " + theme);
  console.log("  Title text: " + titleText);
  console.log("  Image prompt: " + imagePrompt.substring(0, 80) + "...");

  const gridHTML = generateGridHTML(theme);

  // Get image with full fallback chain — always tries until something works
  let imageUrl = null;

  // Step 1: Real photo for specific people/brands
  if (realPhotoQuery) {
    imageUrl = await searchBraveImage(realPhotoQuery);
    if (imageUrl) console.log("  [Image] Using real photo from Brave");
  }

  // Step 2: Fal.ai AI image with Claude's prompt
  if (!imageUrl) {
    imageUrl = await generateFalImage(imagePrompt);
    if (imageUrl) console.log("  [Image] Using Fal.ai AI image");
  }

  // Step 3: Pexels stock photo using topic keywords
  if (!imageUrl) {
    console.log("  [Image] Fal.ai failed, trying Pexels...");
    imageUrl = await searchPexelsImage(topic);
    if (imageUrl) console.log("  [Image] Using Pexels stock photo");
  }

  // Step 4: Broader Brave search using just the topic
  if (!imageUrl) {
    console.log("  [Image] Pexels failed, trying broader Brave search...");
    imageUrl = await searchBraveImage(topic + " person dramatic");
    if (imageUrl) console.log("  [Image] Using broader Brave result");
  }

  // Step 5: Give up on image — thumbnail renders without one (grid + text still looks good)
  if (!imageUrl) console.log("  [Image] All sources failed — rendering without image");

  console.log("\n  Image: " + (imageUrl ? "✓ found" : "none — text only"));

  const arrowStyle = 1 + Math.floor(Math.random() * 5);
  console.log("  Arrow: style " + arrowStyle);

  const html = assembleHTML(gridHTML, imageUrl, titleText, arrowStyle, theme);
  fs.writeFileSync(path.join(outputDir, "thumbnail.html"), html);

  console.log("\n--- Rendering PNG ---");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--disable-gpu"]
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const pngPath = path.join(outputDir, "thumbnail.png");
    await page.screenshot({ path: pngPath, type: "png", clip: { x: 0, y: 0, width: 1280, height: 720 } });
    console.log("  Saved: " + pngPath);
  } finally {
    await browser.close();
  }

  console.log("\nDONE!");
  return path.join(outputDir, "thumbnail.png");
}

if (process.argv[1] && (process.argv[1].endsWith("thumbnail.js") || process.argv[1].endsWith("thumbnail.mjs"))) {
  const title = process.argv[2] || "The Roman Empire Explained";
  const topic = process.argv[3] || "history";
  const outDir = process.argv[4] || "./test-thumb";
  generateThumbnail(outDir, title, topic).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
