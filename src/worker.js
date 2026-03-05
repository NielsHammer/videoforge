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
  const topicClean = topic.replace(/"/g, '');
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
    const fallback = `TITLE: ${topicClean}\n\nDESCRIPTION: ${topicClean}\n\nTAGS: ${topicClean.split(' ').join(', ')}\n\nUPLOAD INSTRUCTIONS:\n1. Go to youtube.com/upload\n2. Select the video file (final.mp4)\n3. Paste the title above\n4. Paste the description above\n5. Upload the thumbnail file (thumbnail.png)\n6. Set visibility to Public\n7. Click Publish`;
    fs.writeFileSync(guidePath, fallback);
    log('  Upload guide generated (fallback)');
  }
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
