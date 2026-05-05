import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('https://fhrznlqtnjgyzpvthyyl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY_RUN = process.argv[2] !== '--commit';

const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();

const { data: failed, error } = await supabase
  .from('orders')
  .select('id, topic, updated_at, created_at, retry_count, admin_notes')
  .eq('status', 'failed')
  .gte('updated_at', tenDaysAgo)
  .order('updated_at', { ascending: false });

if (error) { console.error(error); process.exit(1); }
console.log(`Failed orders in last 10 days: ${failed.length}`);

// Normalize topic for dedup — strip [Client feedback ...] trailers, trim, lowercase
const norm = (t) => (t || '').replace(/\s*\[Client feedback[^\]]*\]\s*/gi, '').trim().toLowerCase();

const byTopic = new Map();
for (const o of failed) {
  const key = norm(o.topic);
  if (!key) continue; // skip empties
  // Keep the most recent (failed array is already sorted desc by updated_at)
  if (!byTopic.has(key)) byTopic.set(key, { keep: o, discards: [] });
  else byTopic.get(key).discards.push(o);
}

const keepIds = [];
const discardIds = [];
for (const { keep, discards } of byTopic.values()) {
  keepIds.push(keep.id);
  for (const d of discards) discardIds.push(d.id);
}

console.log(`Unique topics to requeue: ${keepIds.length}`);
console.log(`Duplicates to leave as failed: ${discardIds.length}`);

console.log('\n--- Requeue list ---');
for (const { keep, discards } of byTopic.values()) {
  const dupMarker = discards.length ? ` (+${discards.length} dupes)` : '';
  console.log(`  ${keep.id.slice(0,8)} r=${keep.retry_count ?? 0} "${(keep.topic||'').slice(0,60)}"${dupMarker}`);
}

if (DRY_RUN) {
  console.log('\n[DRY RUN — pass --commit to actually requeue]');
  process.exit(0);
}

console.log('\n=== COMMITTING ===');

// Update in batches. Clear admin_notes so old error text doesn't pollute the next script generation
// (worker.js appends admin_notes to topic as "[Client feedback for this revision: ...]")
let updated = 0;
for (const id of keepIds) {
  const { error: uerr } = await supabase
    .from('orders')
    .update({
      status: 'queued',
      admin_notes: null,
      retry_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'failed'); // guard: only update if still failed
  if (uerr) console.error(`  FAIL ${id.slice(0,8)}: ${uerr.message}`);
  else updated++;
}
console.log(`Re-queued: ${updated}/${keepIds.length}`);
