import fs from 'fs';
const file = '/opt/videoforge/src/worker.js';
let code = fs.readFileSync(file, 'utf8');

const OLD = `    const { data, error } = await supabase
      .from('orders')
      .select('id, topic, updated_at')
      .eq('status', 'processing');
    if (error) { log(\`Recovery check failed: \${error.message}\`); return; }
    if (data && data.length > 0) {
      for (const o of data) {
        const stuckMs = Date.now() - new Date(o.updated_at).getTime();
        if (stuckMs < 3 * 60 * 60 * 1000) { log(\`  Order still active (\${Math.round(stuckMs/60000)} min) — skipping\`); continue; }
        deleteOutputFolder(o.id);
        await supabase.from('orders')
          .update({ status: 'queued', video_url: null, thumbnail_url: null, output_dir: null })
          .eq('id', o.id);
        log(\`  Recovered stuck order: "\${o.topic}" → re-queued\`);
      }
    } else {
      log('  No stuck orders found.');
    }`;

const NEW = `    // ── Recover stuck processing orders (>3 hours) ──
    const { data, error } = await supabase
      .from('orders')
      .select('id, topic, updated_at')
      .eq('status', 'processing');
    if (error) { log(\`Recovery check failed: \${error.message}\`); return; }
    if (data && data.length > 0) {
      for (const o of data) {
        const stuckMs = Date.now() - new Date(o.updated_at).getTime();
        if (stuckMs < 3 * 60 * 60 * 1000) { log(\`  Order still active (\${Math.round(stuckMs/60000)} min) — skipping\`); continue; }
        deleteOutputFolder(o.id);
        await supabase.from('orders')
          .update({ status: 'queued', video_url: null, thumbnail_url: null, output_dir: null })
          .eq('id', o.id);
        log(\`  Recovered stuck order: "\${o.topic}" → re-queued\`);
      }
    } else {
      log('  No stuck orders found.');
    }

    // ── Auto-requeue failed orders (max 3 attempts, wait 10 min between tries) ──
    // Failed orders were never automatically retried — they just sat as failed forever.
    // Now: any order that failed more than 10 minutes ago gets requeued, up to 3 times.
    // After 3 failures it stays failed so the team can investigate.
    try {
      const { data: failedOrders } = await supabase
        .from('orders')
        .select('id, topic, updated_at, retry_count')
        .eq('status', 'failed');
      if (failedOrders && failedOrders.length > 0) {
        for (const o of failedOrders) {
          const failedMs = Date.now() - new Date(o.updated_at).getTime();
          if (failedMs < 10 * 60 * 1000) continue; // wait at least 10 min before retry
          const retries = o.retry_count || 0;
          if (retries >= 3) {
            // 3 strikes — leave as failed, team needs to investigate
            continue;
          }
          deleteOutputFolder(o.id);
          await supabase.from('orders')
            .update({ status: 'queued', video_url: null, thumbnail_url: null, output_dir: null, retry_count: retries + 1 })
            .eq('id', o.id);
          log(\`  Auto-requeued failed order: "\${o.topic}" (attempt \${retries + 1}/3)\`);
        }
      }
    } catch (retryErr) {
      log(\`  Failed order retry check error: \${retryErr.message}\`);
    }`;

if (code.includes(OLD)) {
  code = code.replace(OLD, NEW);
  fs.writeFileSync(file, code);
  console.log('✅ Fixed: failed orders now auto-requeue up to 3 times');
} else {
  console.log('❌ Anchor not found');
}
