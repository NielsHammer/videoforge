import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FAL_KEY = process.env.FAL_KEY;

const GRID_THEMES = {
  blue_grid:      { bg1: "#050a18", bg2: "#0a1628", accent: "#4a9eff", glow: "rgba(74,158,255,0.15)" },
  green_matrix:   { bg1: "#050f05", bg2: "#0a1a0a", accent: "#39ff6e", glow: "rgba(57,255,110,0.15)" },
  gold_luxury:    { bg1: "#0f0a00", bg2: "#1a1200", accent: "#ffd700", glow: "rgba(255,215,0,0.15)" },
  red_energy:     { bg1: "#120505", bg2: "#1a0808", accent: "#ff4444", glow: "rgba(255,68,68,0.15)" },
  purple_cosmic:  { bg1: "#0a051a", bg2: "#120828", accent: "#9955ff", glow: "rgba(153,85,255,0.15)" },
  teal_ocean:     { bg1: "#051210", bg2: "#081a18", accent: "#44ddcc", glow: "rgba(68,221,204,0.15)" },
  orange_fire:    { bg1: "#120800", bg2: "#1a0f00", accent: "#ff8844", glow: "rgba(255,136,68,0.15)" },
  pink_neon:      { bg1: "#12051a", bg2: "#1a0822", accent: "#ff44aa", glow: "rgba(255,68,170,0.15)" },
  ice_blue:       { bg1: "#051018", bg2: "#081828", accent: "#88ccff", glow: "rgba(136,204,255,0.15)" },
  forest_green:   { bg1: "#050f05", bg2: "#081808", accent: "#44aa44", glow: "rgba(68,170,68,0.15)" },
  sunset_warm:    { bg1: "#120a00", bg2: "#1a1000", accent: "#ff9944", glow: "rgba(255,153,68,0.15)" },
  midnight_blue:  { bg1: "#050510", bg2: "#080818", accent: "#3344aa", glow: "rgba(51,68,170,0.15)" },
  electric_cyan:  { bg1: "#001210", bg2: "#001a18", accent: "#00ffcc", glow: "rgba(0,255,204,0.15)" },
  earth_brown:    { bg1: "#0f0a05", bg2: "#1a1208", accent: "#aa8844", glow: "rgba(170,136,68,0.15)" },
  blood_red:      { bg1: "#100000", bg2: "#1a0505", accent: "#cc2222", glow: "rgba(204,34,34,0.15)" },
  royal_purple:   { bg1: "#0a0518", bg2: "#120828", accent: "#8844cc", glow: "rgba(136,68,204,0.15)" },
  neon_green:     { bg1: "#001200", bg2: "#001a00", accent: "#44ff44", glow: "rgba(68,255,68,0.15)" },
  rose_gold:      { bg1: "#120a08", bg2: "#1a1210", accent: "#ddaa88", glow: "rgba(221,170,136,0.15)" },
  steel_grey:     { bg1: "#0a0a0f", bg2: "#101018", accent: "#8899bb", glow: "rgba(136,153,187,0.15)" },
  aurora:         { bg1: "#051210", bg2: "#081a15", accent: "#44ddaa", glow: "rgba(68,221,170,0.15)" }
};

const NICHE_THEMES = {
  finance:"blue_grid",investing:"blue_grid",business:"blue_grid",money:"gold_luxury",
  trading:"blue_grid",stocks:"blue_grid",crypto:"electric_cyan",
  horror:"blood_red",scary:"blood_red",mystery:"midnight_blue",crime:"midnight_blue",
  health:"aurora",wellness:"teal_ocean",fitness:"aurora",body:"aurora",
  tech:"electric_cyan",ai:"electric_cyan",programming:"green_matrix",
  luxury:"gold_luxury",celebrity:"gold_luxury",wealth:"gold_luxury",
  motivation:"orange_fire",hustle:"orange_fire",success:"orange_fire",
  space:"purple_cosmic",science:"purple_cosmic",astronomy:"purple_cosmic",
  travel:"forest_green",nature:"forest_green",ocean:"teal_ocean",
  gaming:"neon_green",entertainment:"pink_neon",music:"pink_neon",
  history:"earth_brown",psychology:"royal_purple",philosophy:"royal_purple",
  food:"sunset_warm",cooking:"rose_gold",cars:"steel_grey",sports:"red_energy"
};

function getThemeForTopic(topic) {
  const t = topic.toLowerCase();
  for (const [kw, th] of Object.entries(NICHE_THEMES)) { if (t.includes(kw)) return th; }
  return "blue_grid";
}

function generateGridHTML(themeName) {
  const th = GRID_THEMES[themeName] || GRID_THEMES.blue_grid;
  let vL=""; for(let i=0;i<16;i++){const x=i*85;const op=i%3===0?0.35:0.15;const sw=i%3===0?1.5:0.8;vL+='<path d="M'+x+',0 Q'+(x+12)+',180 '+(x-8)+',360 Q'+(x+15)+',540 '+x+',720" stroke="'+th.accent+'" stroke-width="'+sw+'" fill="none" opacity="'+op+'"/>';}
  let hL=""; for(let i=0;i<10;i++){const y=i*80;const op=i%3===0?0.35:0.15;const sw=i%3===0?1.5:0.8;hL+='<path d="M0,'+y+' Q320,'+(y+10)+' 640,'+(y-8)+' Q960,'+(y+12)+' 1280,'+y+'" stroke="'+th.accent+'" stroke-width="'+sw+'" fill="none" opacity="'+op+'"/>';}
  let dots=""; for(let i=0;i<20;i++){dots+='<circle cx="'+(60+Math.floor(Math.random()*1160))+'" cy="'+(50+Math.floor(Math.random()*620))+'" r="2.5" fill="'+th.accent+'" opacity="0.5"/>';}
  let p=""; for(let i=0;i<15;i++){const l=5+Math.floor(Math.random()*90);const t2=5+Math.floor(Math.random()*90);const s=2+Math.floor(Math.random()*4);const o=(0.2+Math.random()*0.4).toFixed(2);p+='<div style="position:absolute;left:'+l+'%;top:'+t2+'%;width:'+s+'px;height:'+s+'px;background:'+th.accent+';border-radius:50%;opacity:'+o+';box-shadow:0 0 '+(s*3)+'px '+th.accent+';"></div>';}
  return '<div style="position:absolute;inset:0;background:linear-gradient(135deg,'+th.bg1+' 0%,'+th.bg2+' 50%,'+th.bg1+' 100%);overflow:hidden;"><svg width="1280" height="720" style="position:absolute;inset:0;" xmlns="http://www.w3.org/2000/svg">'+vL+hL+dots+'</svg><div style="position:absolute;top:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,'+th.glow+',transparent 70%);"></div><div style="position:absolute;bottom:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,'+th.glow+',transparent 70%);"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;background:radial-gradient(ellipse,'+th.glow+',transparent 70%);"></div>'+p+'</div>';
}


const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

async function searchBraveImage(query) {
  if (!BRAVE_API_KEY) return null;
  try {
    console.log("  [Image] Searching Brave for: " + query);
    const r = await axios.get("https://api.search.brave.com/res/v1/images/search", {
      params: { q: query + " high quality photo", count: 5 },
      headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY },
      timeout: 10000
    });
    const results = r.data?.results || [];
    // Pick the best image - prefer larger images, skip tiny ones
    for (const img of results) {
      if (img.properties?.url && img.properties.width > 400 && img.properties.height > 400) {
        console.log("  [Image] Found Brave image: " + img.properties.url.substring(0, 60) + "...");
        return img.properties.url;
      }
    }
    // Fallback to thumbnail URL
    for (const img of results) {
      if (img.thumbnail?.src) {
        console.log("  [Image] Found Brave thumbnail: " + img.thumbnail.src.substring(0, 60) + "...");
        return img.thumbnail.src;
      }
    }
  } catch(e) { console.log("  [Image] Brave search failed: " + e.message); }
  return null;
}

async function shouldUseRealPhoto(title, topic) {
  // Ask Claude if this topic is about a specific person, company, or brand
  try {
    const r = await anthropic.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 100,
      messages: [{ role: "user", content: "Is this video about a SPECIFIC real person, company, or brand? If yes, reply with ONLY the search query to find a dramatic/clickbaity photo of them (e.g. 'Sam Bankman-Fried shocked face' or 'FTX logo dramatic'). If no specific person/company, reply with just 'NO'.\n\nVideo: " + title + "\nTopic: " + topic }]
    });
    const answer = r.content[0].text.trim();
    if (answer === "NO" || answer.length < 3) return null;
    return answer;
  } catch(e) { return null; }
}

async function generateClickbaitImage(title, topic) {
  if (!FAL_KEY) { console.log("  [Image] No FAL_KEY"); return null; }
  console.log("  [Image] Generating clickbait image...");
  const pr = await anthropic.messages.create({ model:"claude-sonnet-4-20250514", max_tokens:150,
    messages:[{role:"user",content:"Create a Fal.ai image prompt for a clickbait YouTube thumbnail.\n\nVideo: "+title+"\nTopic: "+topic+"\n\nRules:\n- The image MUST feature a PERSON as the main focus, taking up most of the frame\n- Close-up or medium shot of the person reacting dramatically (drowning in money, terrified, overwhelmed, amazed, shocked)\n- The person should be front and center, sharp focus on their face and expression\n- Photorealistic, ultra HD, 4K, cinematic studio lighting\n- VERY bright vivid colors, high contrast, attention-grabbing\n- Person must look realistic and high quality, not cartoonish or AI-looking\n- NO text in the image\n- Under 80 words\n\nReply with ONLY the prompt."}]
  });
  const ip = pr.content[0].text.trim();
  console.log("  [Image] Prompt: "+ip.substring(0,80)+"...");
  for (let a=1;a<=3;a++) {
    console.log("  [Image] Attempt "+a+"/3...");
    try {
      const r = await axios.post("https://queue.fal.run/fal-ai/flux-pro/v1.1",{prompt:ip,image_size:{width:768,height:768},num_images:1,enable_safety_checker:true},{headers:{Authorization:"Key "+FAL_KEY,"Content-Type":"application/json"},timeout:120000});
      const rid = r.data.request_id;
      if (!rid) { const im=r.data.images||r.data.output?.images; if(im&&im.length>0) return im[0].url; continue; }
      console.log("  [Image] Queued, polling...");
      for (let i=0;i<90;i++) {
        await new Promise(function(res){setTimeout(res,2000);});
        try {
          const s = await axios.get("https://queue.fal.run/fal-ai/flux-pro/requests/"+rid+"/status",{headers:{Authorization:"Key "+FAL_KEY}});
          if (s.data.status==="COMPLETED") { const r2=await axios.get("https://queue.fal.run/fal-ai/flux-pro/requests/"+rid,{headers:{Authorization:"Key "+FAL_KEY}}); const im=r2.data.images||r2.data.output?.images; if(im&&im.length>0){console.log("  [Image] Done attempt "+a);return im[0].url;} }
          if (s.data.status==="FAILED") break;
        } catch(e){}
      }
    } catch(e){console.log("  [Image] Attempt "+a+" error: "+e.message);}
  }
  console.log("  [Image] All 3 attempts failed"); return null;
}

async function generateTitleText(videoTitle, topic) {
  console.log("  [Title] Generating hook text...");
  const r = await anthropic.messages.create({ model:"claude-sonnet-4-20250514", max_tokens:100,
    messages:[{role:"user",content:"Create a 4-6 word YouTube thumbnail text for maximum clicks.\n\nVideo title: "+videoTitle+"\nTopic: "+topic+"\n\nRules:\n- 4-6 words, ALL CAPS\n- Use power words: SECRET, TRUTH, NEVER, EXPOSED, HIDDEN, SHOCKING, REAL REASON\n- NEVER use abbreviations or acronyms (write full names)\n- Must create curiosity gap - viewer NEEDS to click\n- Reference the specific person, company, or subject by name if possible\n\nReply with ONLY the text, nothing else."}]
  });
  return r.content[0].text.trim().replace(/"/g,"");
}

function generateArrowSVG(style, accent) {
  // Exact arrow shape from Canva SVG reference - big fat U-curve with arrowhead pointing up-left
  const arrowPath = "M 93.5625 230.84375 L 98.140625 239.574219 C 100.757812 244.554688 107.246094 253.886719 111.007812 258.070312 L 116.054688 263.683594 C 118.261719 266.140625 123.617188 272.707031 125.582031 275.367188 L 249.125 442.679688 C 249.671875 443.417969 250.585938 443.777344 251.488281 443.609375 L 259.867188 442.03125 C 260.800781 441.855469 261.613281 441.28125 262.089844 440.457031 L 286.46875 398.492188 C 286.886719 397.777344 287.800781 397.535156 288.515625 397.949219 L 298.359375 403.667969 C 303.53125 406.671875 315.953125 412.585938 321.546875 414.699219 L 353.996094 426.988281 C 368.84375 432.609375 400.636719 440.539062 416.382812 442.550781 L 432.4375 444.601562 C 439.875 445.550781 457.179688 446.347656 464.671875 446.089844 L 483.015625 445.453125 C 491.183594 445.167969 511.425781 443.296875 519.507812 442.078125 L 534.550781 439.808594 C 541.589844 438.746094 557.257812 434.957031 564.007812 432.683594 L 602.070312 419.871094 C 611.558594 416.675781 632.75 407.554688 641.589844 402.855469 L 651.121094 397.792969 C 655.484375 395.476562 665.359375 389.253906 669.332031 386.320312 L 694.089844 368.039062 C 705.875 359.335938 729.703125 337.835938 739.566406 327 L 752 313.347656 C 757.828125 306.945312 769.660156 291.386719 774.273438 284.058594 L 782.71875 270.644531 C 786.71875 264.289062 794.191406 249.460938 796.917969 242.460938 L 803.617188 225.269531 C 806.875 216.914062 811.71875 198.703125 813.042969 189.832031 L 816.691406 165.476562 C 816.832031 164.53125 816.597656 163.5625 816.03125 162.789062 L 812.304688 157.675781 C 811.785156 156.964844 810.851562 156.695312 810.035156 157.027344 L 548.714844 262.457031 C 540.25 265.871094 520.480469 271.90625 511.550781 273.796875 L 502.007812 275.820312 C 497.382812 276.800781 487.445312 277.785156 482.71875 277.730469 L 452.253906 277.386719 C 442.992188 277.28125 424.796875 274.683594 415.875 272.195312 L 406.953125 269.703125 C 402.765625 268.535156 393.597656 265.074219 389.683594 263.1875 L 369.121094 253.265625 C 368.34375 252.890625 367.957031 252.007812 368.203125 251.183594 L 369.851562 245.6875 C 370.867188 242.300781 373.769531 235.550781 375.53125 232.484375 L 391.21875 205.167969 C 391.691406 204.351562 391.757812 203.359375 391.40625 202.484375 L 390.835938 201.070312 C 390.476562 200.179688 389.777344 199.46875 388.898438 199.09375 L 385.863281 197.804688 C 383.3125 196.71875 379.441406 196.121094 376.679688 196.386719 L 111.4375 221.695312 C 107.570312 222.066406 102.039062 223.894531 98.730469 225.933594 L 94.144531 228.738281 C 93.425781 229.175781 93.171875 230.097656 93.5625 230.84375 Z";
  // 5 position/scale variations of the same arrow shape
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

function assembleHTML(gridHTML, imageUrl, titleText, arrowStyle, themeName) {
  const th = GRID_THEMES[themeName] || GRID_THEMES.blue_grid;
  const imgLayer = imageUrl ? '<div style="position:absolute;left:40px;top:80px;width:540px;height:560px;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 20px '+th.glow+';"><img src="'+imageUrl+'" style="width:100%;height:100%;object-fit:cover;"/></div>' : '';
  const arrowLayer = generateArrowSVG(arrowStyle, th.accent);
  const words = titleText.split(" ");
  let l1,l2;
  if(words.length<=3){l1=titleText;l2="";}else{const m=Math.ceil(words.length/2);l1=words.slice(0,m).join(" ");l2=words.slice(m).join(" ");}
  // Auto-size font: fewer chars = bigger, more chars = smaller (min 48, max 78)
  const totalChars = titleText.length;
  let fontSize = 78;
  if (totalChars > 20) fontSize = 72;
  if (totalChars > 25) fontSize = 64;
  if (totalChars > 30) fontSize = 58;
  if (totalChars > 36) fontSize = 52;
  if (totalChars > 42) fontSize = 48;
  const titleLayer = '<div style="position:absolute;right:30px;top:80px;width:620px;height:340px;z-index:10;padding:24px 30px;background:rgba(0,0,0,0.55);border-radius:16px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.08);overflow:hidden;display:flex;flex-direction:column;justify-content:center;"><div style="font-family:Oswald,Arial Black,Impact,sans-serif;font-weight:700;font-size:'+fontSize+'px;color:#FFF;text-transform:uppercase;line-height:0.95;letter-spacing:-2px;text-shadow:4px 4px 0 rgba(0,0,0,0.95),8px 8px 16px rgba(0,0,0,0.7),0 0 40px rgba(0,0,0,0.5);">'+l1+'</div>'+(l2?'<div style="font-family:Oswald,Arial Black,Impact,sans-serif;font-weight:700;font-size:'+fontSize+'px;color:'+th.accent+';text-transform:uppercase;line-height:0.95;letter-spacing:-2px;text-shadow:4px 4px 0 rgba(0,0,0,0.95),8px 8px 16px rgba(0,0,0,0.7),0 0 30px '+th.glow+';margin-top:4px;">'+l2+'</div>':'')+'</div>';
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@import url("https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap");*{margin:0;padding:0;box-sizing:border-box;}body{width:1280px;height:720px;overflow:hidden;background:#000;}</style></head><body>'+gridHTML+imgLayer+arrowLayer+titleLayer+'</body></html>';
}

export async function generateThumbnail(outputDir, title, topic) {
  console.log("============================================================");
  console.log("VideoForge Thumbnail v8.2 (Grid + AI Image + Arrows)");
  console.log("============================================================");
  console.log("Title: "+title); console.log("Topic: "+topic);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir,{recursive:true});
  const themeName = getThemeForTopic(topic);
  console.log("  Theme: "+themeName);
  const gridHTML = generateGridHTML(themeName);
  // Try real photo first for person/company topics, then fall back to AI
  const [realPhotoQuery, titleText] = await Promise.all([shouldUseRealPhoto(title, topic), generateTitleText(title, topic)]);
  let imageUrl = null;
  if (realPhotoQuery) {
    imageUrl = await searchBraveImage(realPhotoQuery);
    if (imageUrl) console.log("  [Image] Using real photo from Brave");
  }
  if (!imageUrl) {
    imageUrl = await generateClickbaitImage(title, topic);
  }
  console.log("\n  Image: "+(imageUrl?"Generated":"NONE"));
  console.log("  Title: "+titleText);
  const arrowStyle = 1+Math.floor(Math.random()*5);
  console.log("  Arrow: style "+arrowStyle);
  const html = assembleHTML(gridHTML,imageUrl,titleText,arrowStyle,themeName);
  fs.writeFileSync(path.join(outputDir,"thumbnail.html"),html);
  console.log("\n--- Rendering PNG ---");
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--font-render-hinting=none","--disable-gpu"]});
  try {
    const page = await browser.newPage();
    await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
    await page.setContent(html,{waitUntil:"networkidle0",timeout:30000});
    await new Promise(function(r){setTimeout(r,3000);});
    const pngPath = path.join(outputDir,"thumbnail.png");
    await page.screenshot({path:pngPath,type:"png",clip:{x:0,y:0,width:1280,height:720}});
    console.log("  Saved: "+pngPath);
  } finally { await browser.close(); }
  console.log("\nDONE!");
  return path.join(outputDir,"thumbnail.png");
}

if (process.argv[1]&&(process.argv[1].endsWith("thumbnail.js")||process.argv[1].endsWith("thumbnail.mjs"))) {
  const title=process.argv[2]||"Top 10 Passive Income Strategies";
  const topic=process.argv[3]||"finance";
  const outDir=process.argv[4]||"./output/thumb-test";
  generateThumbnail(outDir,title,topic).then(function(r){console.log("Thumbnail: "+r);}).catch(function(e){console.error("Error: "+e.message);process.exit(1);});
}
