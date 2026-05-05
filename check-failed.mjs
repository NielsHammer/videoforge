import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient('https://fhrznlqtnjgyzpvthyyl.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

// Count by status
const { data: all } = await supabase
  .from('orders')
  .select('status, updated_at');

const counts = {};
for (const o of all) counts[o.status] = (counts[o.status] || 0) + 1;
console.log('All orders by status:', counts);

// Recent successful completions
const { data: success } = await supabase
  .from('orders')
  .select('id, topic, status, updated_at')
  .in('status', ['delivered', 'review'])
  .order('updated_at', { ascending: false })
  .limit(15);

console.log('\n--- 15 most recent successful orders ---');
for (const o of success) {
  const age = Math.round((Date.now() - new Date(o.updated_at).getTime()) / 3600000);
  console.log(`[${age}h] ${o.status.padEnd(10)} ${o.id.slice(0,8)} "${(o.topic||'').slice(0,55)}"`);
}

// Currently processing
const { data: proc } = await supabase
  .from('orders')
  .select('id, topic, updated_at')
  .eq('status', 'processing');
console.log(`\n--- Currently processing: ${proc.length} ---`);
for (const o of proc) {
  const min = Math.round((Date.now() - new Date(o.updated_at).getTime()) / 60000);
  console.log(`[${min}min] ${o.id.slice(0,8)} "${(o.topic||'').slice(0,55)}"`);
}

// Queued
const { data: q } = await supabase.from('orders').select('id').eq('status', 'queued');
console.log(`\nQueued: ${q.length}`);
