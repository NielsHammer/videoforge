import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://fhrznlqtnjgyzpvthyyl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL = 30000;
const VIDEOFORGE_DIR = '/opt/videoforge';

if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function generateUploadGuide(topic, outputDir) {
  const guidePath = path.join(outputDir, 'upload-guide.html');
  const topicClean = topic.replace(/"/g, '').replace(/'/g, "\\'");

  let title = topic;
  let description = `A detailed video about ${topic}. Subscribe for more content!`;
  let tags = topic.split(' ').slice(0, 10).join(', ');

  try {
    const out = execSync(
      `node -e "
const Anthropic = require('@anthropic-ai/sdk');
const c = new Anthropic();
c.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 800,
  messages: [{role:'user',content:'Generate YouTube metadata for a video about: ${topicClean}. Return ONLY valid JSON, no other text, no markdown: {\"title\":\"catchy title max 60 chars\",\"description\":\"150-200 word YouTube description with keywords and call to action\",\"tags\":\"tag1, tag2, tag3, up to 20 tags\"}'}]
}).then(r => process.stdout.write(r.content[0].text));
"`,
      { cwd: VIDEOFORGE_DIR, timeout: 30000, encoding: 'utf8' }
    );
    const parsed = JSON.parse(out.trim());
    if (parsed.title) title = parsed.title;
    if (parsed.description) description = parsed.description;
    if (parsed.tags) tags = parsed.tags;
    log('  Upload guide generated');
  } catch (e) {
    log('  Upload guide using fallback (Claude error)');
  }

  const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
  const tagsHtml = tagsArray.map(t => `<span class="tag">${t}</span>`).join('');
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

async function processOrder(order) {
  const { id: orderId, topic, script_upload, tone, voice_id, admin_notes } = order;
  log(`Processing order ${orderId}: "${topic}"`);
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

      // Include admin_notes (customer feedback + team notes) in script generation if present
      const topicWithNotes = admin_notes
        ? `${topic} [Additional context: ${admin_notes}]`
        : topic;

      const out = execSync(
        `node src/cli.js script "${topicWithNotes.replace(/"/g, '\\"')}" --tone ${mappedTone}`,
        { cwd: VIDEOFORGE_DIR, timeout: 120000, encoding: 'utf8' }
      );
      const match = out.match(/Saved:\s*(.+\.txt)/);
      if (!match) throw new Error('Script generation failed');
      scriptPath = path.join(VIDEOFORGE_DIR, match[1].trim());
    }

    log(`  Script: ${scriptPath}`);
    log('  Generating video (~10-15 min)...');

    // Record folders BEFORE generation so we can find the new one
    const outputBase = path.join(VIDEOFORGE_DIR, 'output');
    const beforeDirs = new Set(fs.readdirSync(outputBase));

    execSync(
      `node src/cli.js generate "${scriptPath}"${voice_id ? ` --voice ${voice_id}` : ''}`,
      { cwd: VIDEOFORGE_DIR, timeout: 1800000, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );

    // Find the new output folder
    const afterDirs = fs.readdirSync(outputBase);
    const newDirs = afterDirs.filter(d =>
      !beforeDirs.has(d) && fs.existsSync(path.join(outputBase, d, 'final.mp4'))
    );

    let outputDirName;
    if (newDirs.length > 0) {
      outputDirName = newDirs[0];
    } else {
      // Fallback: most recently modified folder with final.mp4
      const allDirs = afterDirs
        .filter(d =>
          fs.statSync(path.join(outputBase, d)).isDirectory() &&
          fs.existsSync(path.join(outputBase, d, 'final.mp4'))
        )
        .sort((a, b) =>
          fs.statSync(path.join(outputBase, b)).mtimeMs -
          fs.statSync(path.join(outputBase, a)).mtimeMs
        );
      if (allDirs.length === 0) throw new Error('No output directory with final.mp4 found');
      outputDirName = allDirs[0];
    }

    const outputPath = path.join(outputBase, outputDirName);
    const thumbFile = path.join(outputPath, 'thumbnail.png');
    log(`  Video generated! Output: ${outputDirName}`);

    // Generate upload guide
    await generateUploadGuide(topic, outputPath);

    const baseUrl = `https://files.tubeautomate.com/output/${outputDirName}`;
    const thumbUrl = fs.existsSync(thumbFile) ? `${baseUrl}/thumbnail.png` : null;

    await supabase.from('orders').update({
      status: 'review',
      video_url: `${baseUrl}/final.mp4`,
      thumbnail_url: thumbUrl,
      output_dir: outputDirName,           // stored cleanly in its own column
      admin_notes: null,                   // clear notes after use so modal is clean
    }).eq('id', orderId);

    log(`  Order ${orderId} complete! Ready for admin review.`);
  } catch (err) {
    log(`  Order ${orderId} FAILED: ${err.message}`);
    await supabase.from('orders').update({
      status: 'failed',
      admin_notes: `Generation failed: ${err.message}`
    }).eq('id', orderId);
  }
}

async function pollForOrders() {
  try {
    // Only process queued orders — no other statuses need worker action
    // Status flow: queued → processing → review → client_review → delivered
    // Revision flow: revision_requested → queued (set by admin) → processing → review → client_review → delivered
    const { data: queued } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1);

    if (queued?.length > 0) {
      await processOrder(queued[0]);
    }
  } catch (err) {
    log(`Poll error: ${err.message}`);
  }
}

log('VideoForge Worker v5 started');
log(`Polling every ${POLL_INTERVAL / 1000}s`);
pollForOrders();
setInterval(pollForOrders, POLL_INTERVAL);
