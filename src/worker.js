import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
dotenv.config();

const anthropic = new Anthropic();

const SUPABASE_URL = 'https://fhrznlqtnjgyzpvthyyl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL = 30000;
const MAX_CONCURRENT_JOBS = 2; // max simultaneous video renders to protect VPS memory
let activeJobs = 0;
const STUCK_INTERVAL = 30 * 60 * 1000;
const VIDEOFORGE_DIR = '/opt/videoforge';
const OUTPUT_DIR = path.join(VIDEOFORGE_DIR, 'output');
const OUTPUT_BASE = path.join(VIDEOFORGE_DIR, 'output');

if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function deleteOutputFolder(orderId, keepVoice = false) {
  const folderPath = path.join(OUTPUT_BASE, `order-${orderId}`);
  if (!fs.existsSync(folderPath)) return;

  if (keepVoice) {
    const assetsDir = path.join(folderPath, 'assets');
    const voicePath = path.join(assetsDir, 'voiceover.mp3');
    const tsPath = path.join(assetsDir, 'voiceover-timestamps.json');
    const tmpVoice = path.join(OUTPUT_BASE, `voice-backup-${orderId}.mp3`);
    const tmpTs = path.join(OUTPUT_BASE, `voice-backup-${orderId}.json`);
    if (fs.existsSync(voicePath)) fs.copyFileSync(voicePath, tmpVoice);
    if (fs.existsSync(tsPath)) fs.copyFileSync(tsPath, tmpTs);
    fs.rmSync(folderPath, { recursive: true, force: true });
    fs.mkdirSync(assetsDir, { recursive: true });
    if (fs.existsSync(tmpVoice)) { fs.copyFileSync(tmpVoice, voicePath); fs.unlinkSync(tmpVoice); }
    if (fs.existsSync(tmpTs)) { fs.copyFileSync(tmpTs, tsPath); fs.unlinkSync(tmpTs); }
    log(`  🗑️  Cleared output folder for order ${orderId} (voiceover preserved)`);
  } else {
    fs.rmSync(folderPath, { recursive: true, force: true });
    log(`  🗑️  Deleted output folder for order ${orderId} (full wipe)`);
  }
}

async function generateUploadGuide(topic, outputDir) {
  const guidePath = path.join(outputDir, 'upload-guide.html');

  let title = topic;
  let description = `A detailed video about ${topic}. Subscribe for more content!`;
  let tags = topic.split(' ').slice(0, 10).join(', ');

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: 'The current year is 2026. Generate YouTube metadata for a video about: ' + topic + '. Return ONLY valid JSON, no other text, no markdown: {"title":"catchy title max 60 chars, use 2026 if year is relevant","description":"150-200 word YouTube description with keywords and call to action","tags":"tag1, tag2, tag3, up to 20 tags"}' }]
    });
    const out = msg.content[0].text;
    const parsed = JSON.parse(out.trim());
    if (parsed.title) title = parsed.title;
    if (parsed.description) description = parsed.description;
    if (parsed.tags) tags = parsed.tags;
    log('  Upload guide generated');
  } catch (e) {
    log('  Upload guide using fallback (Claude error)');
  }

  const escapeHtml = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
  const tagsHtml = tagsArray.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const tagsPlain = tagsArray.join(', ');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Guide - ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f7; color: #1d1d1f; padding: 32px 16px; }
    .container { max-width: 780px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { color: #6e6e73; font-size: 15px; margin-bottom: 32px; }
    .card { background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6e6e73; margin-bottom: 10px; }
    .card-content { font-size: 15px; line-height: 1.65; color: #1d1d1f; white-space: pre-wrap; }
    .copy-btn { margin-top: 14px; background: #0071e3; color: white; border: none; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .copy-btn:hover { background: #0077ed; }
    .copy-btn.copied { background: #34c759; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .tag { background: #e8f0fe; color: #1a73e8; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
    .steps { list-style: none; }
    .steps li { display: flex; align-items: flex-start; gap: 14px; padding: 10px 0; border-bottom: 1px solid #f2f2f7; font-size: 15px; }
    .steps li:last-child { border-bottom: none; }
    .step-num { background: #0071e3; color: white; border-radius: 50%; width: 28px; height: 28px; min-width: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
    .steps a { color: #0071e3; text-decoration: none; }
    .header-icon { font-size: 32px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-icon">📹</div>
    <h1>YouTube Upload Guide</h1>
    <p class="subtitle">Your video is ready. Follow these steps to publish it.</p>
    <div class="card">
      <div class="card-label">Title</div>
      <div class="card-content" id="title-text">${title}</div>
      <button class="copy-btn" onclick="copyText('title-text', this)">Copy Title</button>
    </div>
    <div class="card">
      <div class="card-label">Description</div>
      <div class="card-content" id="desc-text">${description}</div>
      <button class="copy-btn" onclick="copyText('desc-text', this)">Copy Description</button>
    </div>
    <div class="card">
      <div class="card-label">Tags</div>
      <div class="tags">${tagsHtml}</div>
      <button class="copy-btn" onclick="copyRaw('${tagsPlain.replace(/'/g, "\\'")}', this)">Copy Tags</button>
    </div>
    <div class="card">
      <div class="card-label">Upload Steps</div>
      <ul class="steps">
        <li><div class="step-num">1</div><div>Go to <a href="https://youtube.com/upload" target="_blank">youtube.com/upload</a></div></li>
        <li><div class="step-num">2</div><div>Click <strong>Select Files</strong> and upload <strong>final.mp4</strong></div></li>
        <li><div class="step-num">3</div><div>Paste the <strong>title</strong> above into the title field</div></li>
        <li><div class="step-num">4</div><div>Paste the <strong>description</strong> above into the description field</div></li>
        <li><div class="step-num">5</div><div>Under <strong>Tags</strong>, paste the tags above</div></li>
        <li><div class="step-num">6</div><div>Click <strong>Thumbnail</strong> and upload <strong>thumbnail.png</strong></div></li>
        <li><div class="step-num">7</div><div>Set visibility to <strong>Public</strong></div></li>
        <li><div class="step-num">8</div><div>Click <strong>Publish</strong> 🎉</div></li>
      </ul>
    </div>
  </div>
  <script>
    function copyText(id, btn) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = btn.textContent.replace('Copied!', 'Copy ' + (id === 'title-text' ? 'Title' : 'Description')); btn.classList.remove('copied'); }, 2000);
      });
    }
    function copyRaw(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy Tags'; btn.classList.remove('copied'); }, 2000);
      });
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(guidePath, html);
  return guidePath;
}

async function regenerateThumbnail(order) {
  const { id: orderId, topic } = order;
  log(`Regenerating thumbnail for order ${orderId}: "${topic}"`);
  await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId);

  try {
    const outputDirName = `order-${orderId}`;
    const outputPath = path.join(OUTPUT_BASE, outputDirName);

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output folder not found: ${outputDirName}`);
    }

    const thumbFile = path.join(outputPath, 'thumbnail.png');
    if (fs.existsSync(thumbFile)) fs.unlinkSync(thumbFile);

    const scriptFile = path.join(VIDEOFORGE_DIR, 'scripts', `order-${orderId}.txt`);
    const scriptArg = fs.existsSync(scriptFile) ? `"${scriptFile}"` : `"${topic}"`;
    const topicEscaped = topic.replace(/"/g, '\\"');

    execSync(
      `node src/cli.js generate ${scriptArg} --order-id ${orderId} --topic "${topicEscaped}" --skip-voice --no-render`,
      { cwd: VIDEOFORGE_DIR, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 600000 }
    );

    const baseUrl = `https://files.tubeautomate.com/output/${outputDirName}`;
    const thumbUrl = fs.existsSync(thumbFile) ? `${baseUrl}/thumbnail.png?t=${Date.now()}` : null;

    await supabase.from('orders').update({
      status: 'review',
      thumbnail_url: thumbUrl,
      thumbnail_action: null,
      admin_notes: null,
    }).eq('id', orderId);

    log(`  Thumbnail regenerated for order ${orderId}`);
  } catch (err) {
    log(`  Thumbnail regen FAILED for ${orderId}: ${err.message}`);
    await supabase.from('orders').update({
      status: 'review',
      thumbnail_action: null,
      admin_notes: `Thumbnail regen failed: ${err.message}`
    }).eq('id', orderId);
  }
}

async function processOrder(order) {
  const {
    id: orderId, topic, script_upload, tone, voice_id, admin_notes, video_length,
    key_points, cta_text, background_theme, channel_niche, niche  // order form fields
  } = order;

  log(`Processing order ${orderId}: "${topic}"`);
  if (key_points)       log(`  Key points: ${key_points.slice(0, 80)}...`);
  if (cta_text)         log(`  CTA: ${cta_text}`);
  if (background_theme) log(`  Theme: ${background_theme}`);

  const keepVoice = !!(admin_notes && /keep voice|same voice|reuse voice|don.t redo voice|voice is fine|voice is good/i.test(admin_notes));
  deleteOutputFolder(orderId, keepVoice);

  await supabase.from('orders').update({ status: 'processing' }).eq('id', orderId);

  try {
    let scriptPath;

    if (script_upload) {
      log('  Using uploaded script...');
      const { data, error } = await supabase.storage.from('scripts').download(script_upload);
      if (error) throw new Error(`Script download: ${error.message}`);
      scriptPath = path.join(VIDEOFORGE_DIR, 'scripts', `order-${orderId}.txt`);
      fs.writeFileSync(scriptPath, await data.text());
    } else {
      log('  Generating script...');
      const toneMap = {
        professional: 'serious', entertaining: 'engaging', dramatic: 'dramatic',
        casual: 'engaging', mysterious: 'dramatic', motivational: 'engaging',
        humorous: 'humor', humourous: 'humor', funny: 'humor'
      };
      const mappedTone = toneMap[(tone || '').toLowerCase()] || 'engaging';

      const topicWithNotes = admin_notes
        ? `${topic} [Client feedback for this revision: ${admin_notes}]`
        : topic;

      const durationMap = {
        '10 minutes': '10', '20 minutes': '20', '30 minutes': '30',
        '40 minutes': '40', '50 minutes': '50', '60 minutes': '60',
        '3 minutes': '3', '5 minutes': '5', '7 minutes': '7', '15 minutes': '15'
      };
      const duration = durationMap[(video_length || '').toLowerCase()] || '10';

      // Write key_points + cta_text to a sidecar JSON file.
      // Using a file instead of CLI args avoids shell-escaping nightmares
      // with multi-line text, quotes, and special characters from order forms.
      const scriptsDir = path.join(VIDEOFORGE_DIR, 'scripts');
      const extrasPath = path.join(scriptsDir, `order-${orderId}-extras.json`);
      const hasExtras = !!(key_points || cta_text);

      if (hasExtras) {
        const extras = {};
        if (key_points)    extras.keyPoints = key_points;
        if (cta_text)      extras.ctaText   = cta_text;
        if (channel_niche) extras.niche     = channel_niche;
        fs.mkdirSync(scriptsDir, { recursive: true }); // ensure dir exists before writing
        fs.writeFileSync(extrasPath, JSON.stringify(extras));
        log('  Extras file written');
      }

      const extrasFlag = hasExtras ? ` --extras-file "${extrasPath}"` : '';

      let out;
      try {
        out = execSync(
          `node src/cli.js script "${topicWithNotes.replace(/"/g, '\\"')}" --tone ${mappedTone} --duration ${duration}${extrasFlag}`,
          { cwd: VIDEOFORGE_DIR, timeout: 600000, encoding: 'utf8' }
        );
      } finally {
        // Always clean up the extras file — whether script generation succeeded or crashed.
        // Without finally, a crash would leave JSON files accumulating in /scripts/
        if (hasExtras && fs.existsSync(extrasPath)) {
          fs.unlinkSync(extrasPath);
        }
      }

      const match = out.match(/Saved:\s*([^\n\r]+\.txt)/);
      if (!match) {
        log(`  Script output tail: ${out.slice(-300)}`);
        throw new Error('Script generation failed — could not find output path in CLI output');
      }
      const rawPath = match[1].trim();
      scriptPath = rawPath.startsWith('/') ? rawPath : path.join(VIDEOFORGE_DIR, rawPath);
    }

    log(`  Script: ${scriptPath}`);
    log('  Generating video (~10-15 min)...');

    const skipVoiceFlag = keepVoice ? ' --skip-voice' : '';
    if (keepVoice) log('  Reusing existing voiceover (admin notes say keep voice)');

    const topicEscaped = topic.replace(/"/g, '\\"');

    const themeFlag = background_theme ? ` --theme ${background_theme}` : '';

    // Write full order brief to sidecar JSON — avoids shell-escaping issues with
    // key_points/cta_text which can contain quotes, newlines, special chars
    const briefPath = path.join(VIDEOFORGE_DIR, 'scripts', `order-${orderId}-brief.json`);
    const orderBriefData = {
      topic:           topic           || '',
      niche:           channel_niche || niche || '',
      tone:            tone            || '',
      keyPoints:       key_points      || '',
      callToAction:    cta_text        || '',
      narrator:        voice_id        || '',
      videoLength:     video_length    || '',
      backgroundStyle: background_theme|| '',
    };
    fs.mkdirSync(path.dirname(briefPath), { recursive: true });
    fs.writeFileSync(briefPath, JSON.stringify(orderBriefData));
    log(`  Brief: niche=${orderBriefData.niche || 'auto'}, tone=${orderBriefData.tone || 'auto'}, keyPoints=${orderBriefData.keyPoints ? 'yes' : 'no'}, cta=${orderBriefData.callToAction ? 'yes' : 'no'}`);

    let generateError = null;
    try {
      execSync(
        `node src/cli.js generate "${scriptPath}"${voice_id ? ` --voice ${voice_id}` : ''}${skipVoiceFlag} --order-id ${orderId} --topic "${topicEscaped}"${themeFlag} --brief-file "${briefPath}"`,
        { cwd: VIDEOFORGE_DIR, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 7200000 }
      );
    } catch (e) {
      generateError = e;
    } finally {
      // Always clean up brief file
      if (fs.existsSync(briefPath)) fs.unlinkSync(briefPath);
    }
    if (generateError) throw generateError;

    const outputDirName = `order-${orderId}`;
    if (!fs.existsSync(path.join(OUTPUT_BASE, outputDirName, 'final.mp4'))) {
      throw new Error(`Output folder not found: ${outputDirName} — pipeline may have failed`);
    }

    const outputPath = path.join(OUTPUT_BASE, outputDirName);
    const thumbFile = path.join(outputPath, 'thumbnail.png');
    log(`  Video generated! Output: ${outputDirName}`);

    await generateUploadGuide(topic, outputPath);

    const baseUrl = `https://files.tubeautomate.com/output/${outputDirName}`;
    const thumbUrl = fs.existsSync(thumbFile) ? `${baseUrl}/thumbnail.png` : null;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('orders').update({
      status: 'review',
      video_url: `${baseUrl}/final.mp4`,
      thumbnail_url: thumbUrl,
      output_dir: outputDirName,
      expires_at: expiresAt,
      admin_notes: null,
    }).eq('id', orderId);

    log(`  Order ${orderId} complete — ready for admin review.`);
  } catch (err) {
    log(`  Order ${orderId} FAILED: ${err.message}`);
    await supabase.from('orders').update({
      status: 'failed',
      admin_notes: `Generation failed: ${err.message}`
    }).eq('id', orderId);
  }
}

async function cleanupExpiredFiles() {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select('id, topic, output_dir')
      .lt('expires_at', now)
      .not('output_dir', 'is', null);
    if (error) { log(`Cleanup check failed: ${error.message}`); return; }
    if (!data || data.length === 0) { log('Cleanup: no expired files found.'); return; }
    for (const order of data) {
      const folderPath = path.join(OUTPUT_DIR, order.output_dir);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        log(`Cleanup: deleted expired folder "${order.output_dir}" (order: ${order.topic})`);
      }
      await supabase.from('orders').update({ output_dir: null }).eq('id', order.id);
    }
    log(`Cleanup: removed ${data.length} expired order(s)`);
  } catch (err) {
    log(`Cleanup error: ${err.message}`);
  }
}

async function pollForOrders() {
  try {
    const { data: thumbJobs } = await supabase
      .from('orders')
      .select('*')
      .eq('thumbnail_action', 'regenerate')
      .neq('status', 'processing')
      .order('created_at', { ascending: false })
      .limit(1);

    if (thumbJobs?.length > 0) {
      await regenerateThumbnail(thumbJobs[0]);
      return;
    }

    const { data: queued } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: false })
      .limit(1);

    if (queued?.length > 0) {
      if (activeJobs >= MAX_CONCURRENT_JOBS) {
        log(`  Concurrency limit reached (${activeJobs}/${MAX_CONCURRENT_JOBS}) — waiting for slot`);
        return;
      }
      activeJobs++;
      log(`  Starting job (active: ${activeJobs}/${MAX_CONCURRENT_JOBS})`);
      processOrder(queued[0]).finally(() => {
        activeJobs--;
        log(`  Job complete (active: ${activeJobs}/${MAX_CONCURRENT_JOBS})`);
      });
    }
  } catch (err) {
    log(`Poll error: ${err.message}`);
  }
}

async function recoverStuckOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, topic, updated_at')
      .eq('status', 'processing');

    if (error) { log(`Recovery check failed: ${error.message}`); return; }

    if (data && data.length > 0) {
      for (const o of data) {
        const stuckMs = Date.now() - new Date(o.updated_at).getTime();
        if (stuckMs < 3 * 60 * 60 * 1000) { log(`  Order still active (${Math.round(stuckMs/60000)} min) — skipping`); continue; }
        deleteOutputFolder(o.id);
        await supabase.from('orders')
          .update({ status: 'queued', video_url: null, thumbnail_url: null, output_dir: null })
          .eq('id', o.id);
        log(`  Recovered stuck order: "${o.topic}" → re-queued`);
      }
    } else {
      log('  No stuck orders found.');
    }
  } catch (err) {
    log(`Recovery error: ${err.message}`);
  }
}

log('VideoForge Worker v6 started');
log(`Polling every ${POLL_INTERVAL / 1000}s | Stuck check every 30 min`);
log('Checking for stuck orders on startup...');

recoverStuckOrders().then(() => {
  cleanupExpiredFiles();
  pollForOrders();
  setInterval(pollForOrders, POLL_INTERVAL);
  setInterval(() => {
    log('Running periodic stuck order check...');
    recoverStuckOrders();
  }, STUCK_INTERVAL);
  setInterval(() => {
    log('Running daily expired file cleanup...');
    cleanupExpiredFiles();
  }, 24 * 60 * 60 * 1000);
});
