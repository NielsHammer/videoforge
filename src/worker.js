import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://fhrznlqtnjgyzpvthyyl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL = 30000;
const VIDEOFORGE_DIR = '/opt/videoforge';
const SERVER_IP = '178.156.209.219';
const FILE_SERVER_PORT = 3001;

if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// File server for video delivery
const app = express();
app.use('/output', express.static(path.join(VIDEOFORGE_DIR, 'output'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
  }
}));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.listen(FILE_SERVER_PORT, '0.0.0.0', () => {
  log(`File server running on https://files.tubeautomate.com`);
});

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function generateUploadGuide(topic, outputDir) {
  const guidePath = path.join(outputDir, 'upload-guide.html');
  const topicClean = topic.replace(/"/g, '');
  
  // Use Claude to generate title, description, tags
  try {
    const out = execSync(
      `node -e "
const Anthropic = require('@anthropic-ai/sdk');
const c = new Anthropic();
c.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  messages: [{role:'user',content:'Generate a YouTube upload guide for a video about: ${topicClean.replace(/'/g, "\\'")}. Return ONLY this format, no other text:\\n\\nTITLE: (catchy YouTube title, max 60 chars)\\nDESCRIPTION: (YouTube description, 150-200 words with keywords, include a call to action)\\nTAGS: (15-20 comma-separated tags)\\n\\nUPLOAD INSTRUCTIONS:\\n1. Go to youtube.com/upload\\n2. Select the video file (final.mp4)\\n3. Paste the title above\\n4. Paste the description above\\n5. Add the tags above\\n6. Upload the thumbnail file (thumbnail.png)\\n7. Set visibility to Public\\n8. Click Publish'}]
}).then(r => process.stdout.write(r.content[0].text));
"`,
      { cwd: VIDEOFORGE_DIR, timeout: 30000, encoding: 'utf8' }
    );
    fs.writeFileSync(guidePath, out);
    log('  Upload guide generated');
  } catch (e) {
    // Fallback simple guide
    const fallback = `TITLE: ${topicClean}\n\nDESCRIPTION: ${topicClean}\n\nTAGS: ${topicClean.split(' ').join(', ')}\n\nUPLOAD INSTRUCTIONS:\n1. Go to youtube.com/upload\n2. Select the video file (final.mp4)\n3. Paste the title above\n4. Paste the description above\n5. Upload the thumbnail file (thumbnail.png)\n6. Set visibility to Public\n7. Click Publish`;
    fs.writeFileSync(guidePath, fallback);
    log('  Upload guide generated (fallback)');
  }
  return guidePath;
}

async function processOrder(order) {
  const { id: orderId, topic, script_upload, tone, voice_id, voice_name, key_points } = order;
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
      const out = execSync(
        (() => {
          const toneMap = { professional: 'serious', entertaining: 'engaging', dramatic: 'dramatic', casual: 'engaging', mysterious: 'dramatic', motivational: 'engaging', humorous: 'humor', humourous: 'humor', funny: 'humor' };
          const mappedTone = toneMap[(tone || '').toLowerCase()] || 'engaging';
          return `node src/cli.js script "${topic.replace(/"/g, '\\"')}" --tone ${mappedTone}`;
        })(),
        { cwd: VIDEOFORGE_DIR, timeout: 120000, encoding: 'utf8' }
      );
      const match = out.match(/Saved:\s*(.+\.txt)/);
      if (!match) throw new Error('Script generation failed');
      scriptPath = path.join(VIDEOFORGE_DIR, match[1].trim());
    }
    log(`  Script: ${scriptPath}`);
    log('  Generating video (~10-15 min)...');
    // Record what folders exist BEFORE generation
    const outputBase = path.join(VIDEOFORGE_DIR, 'output');
    const beforeDirs = new Set(fs.readdirSync(outputBase));
    execSync(
      `node src/cli.js generate "${scriptPath}"${voice_id ? ` --voice ${voice_id}` : ""}`,
      { cwd: VIDEOFORGE_DIR, timeout: 1800000, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
    // Find the NEW folder that was just created (exists now but not before)
    const afterDirs = fs.readdirSync(outputBase);
    const newDirs = afterDirs.filter(d => !beforeDirs.has(d) && fs.existsSync(path.join(outputBase, d, 'final.mp4')));
    let outputDir;
    if (newDirs.length > 0) {
      outputDir = newDirs[0];
    } else {
      // Fallback: find most recently modified folder with final.mp4
      const allDirs = afterDirs
        .filter(d => fs.statSync(path.join(outputBase, d)).isDirectory() && fs.existsSync(path.join(outputBase, d, 'final.mp4')))
        .sort((a, b) => fs.statSync(path.join(outputBase, b)).mtimeMs - fs.statSync(path.join(outputBase, a)).mtimeMs);
      if (allDirs.length === 0) throw new Error('No output directory with final.mp4 found');
      outputDir = allDirs[0];
    }
    const outputPath = path.join(outputBase, outputDir);
    const thumbFile = path.join(outputPath, 'thumbnail.png');
    log(`  Video generated! Output: ${outputDir}`);

    // Generate upload guide
    await generateUploadGuide(topic, outputPath);

    const baseUrl = `https://files.tubeautomate.com/output/${outputDir}`;
    const videoUrl = `${baseUrl}/final.mp4`;
    let thumbUrl = null;
    if (fs.existsSync(thumbFile)) {
      thumbUrl = `${baseUrl}/thumbnail.png`;
    }

    await supabase.from('orders').update({
      status: 'review',
      video_url: videoUrl,
      thumbnail_url: thumbUrl,
      admin_notes: `local:${outputDir}`
    }).eq('id', orderId);
    log(`  Order ${orderId} complete! Ready for review.`);
  } catch (err) {
    log(`  Order ${orderId} FAILED: ${err.message}`);
    await supabase.from('orders').update({ status: 'failed', admin_notes: `Generation failed: ${err.message}` }).eq('id', orderId);
  }
}

async function processApproved(order) {
  const { id: orderId, admin_notes } = order;
  log(`Approving order ${orderId}...`);

  // Get output directory
  const localMatch = (admin_notes || '').match(/^local:(.+)/);
  const outputBase = path.join(VIDEOFORGE_DIR, 'output');
  let outputDir;
  if (localMatch) {
    outputDir = localMatch[1];
  } else {
    const dirs = fs.readdirSync(outputBase)
      .filter(d => fs.statSync(path.join(outputBase, d)).isDirectory() && fs.existsSync(path.join(outputBase, d, 'final.mp4')))
      .sort((a, b) => fs.statSync(path.join(outputBase, b)).mtimeMs - fs.statSync(path.join(outputBase, a)).mtimeMs);
    if (dirs.length === 0) { log('  No output found'); return; }
    outputDir = dirs[0];
  }

  const baseUrl = `https://files.tubeautomate.com/output/${outputDir}`;
  const guideUrl = `${baseUrl}/upload-guide.html`;

  await supabase.from('orders').update({
    status: 'delivered',
    admin_notes: `local:${outputDir}`,
    video_url: `${baseUrl}/final.mp4`,
    thumbnail_url: `${baseUrl}/thumbnail.png`,
  }).eq('id', orderId);

  log(`  Order ${orderId} delivered!`);
}

async function pollForOrders() {
  try {
    const { data: queued } = await supabase.from('orders').select('*').eq('status', 'queued').order('created_at', { ascending: true }).limit(1);
    if (queued?.length > 0) { await processOrder(queued[0]); return; }
    const { data: approved } = await supabase.from('orders').select('*').eq('status', 'approved').order('created_at', { ascending: true }).limit(1);
    if (approved?.length > 0) { await processApproved(approved[0]); return; }
  } catch (err) {
    log(`Poll error: ${err.message}`);
  }
}

log('VideoForge Worker v3 started');
log(`Polling every ${POLL_INTERVAL / 1000}s`);
log(`File server: https://files.tubeautomate.com`);
pollForOrders();
setInterval(pollForOrders, POLL_INTERVAL);
