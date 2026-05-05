import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOFORGE_DIR = '/opt/videoforge';
const PORT = 3001;

const SUPABASE_URL = 'https://fhrznlqtnjgyzpvthyyl.supabase.co';
const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const app = express();
app.use(express.json());

app.use('/output', express.static(path.join(VIDEOFORGE_DIR, 'output'), {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=3600');
    // Force download for video and image files
    if (filePath.endsWith('.mp4')) {
      res.set('Content-Disposition', 'attachment');
    }
  }
}));

// /watch — same files as /output but served inline so they play in the browser
// instead of triggering a download. Used by pipeline-v2 and human review links.
app.use('/watch', express.static(path.join(VIDEOFORGE_DIR, 'output'), {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=3600');
    if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
      res.set('Accept-Ranges', 'bytes'); // enable seeking in the browser player
    }
  }
}));

// ─── ADMIN AUTH ──────────────────────────────────────────────────────────────
// Simple token-based auth for admin endpoints
// Set ADMIN_API_KEY in .env — all admin requests must include it as Bearer token
function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return res.status(503).json({ error: 'Admin API not configured (set ADMIN_API_KEY in .env)' });
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${key}`) {
    return res.status(401).json({ error: 'Unauthorized — include Authorization: Bearer <ADMIN_API_KEY>' });
  }
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  next();
}

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

// GET /admin/orders/failed — list all failed orders (optional ?days=7 filter)
app.get('/admin/orders/failed', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select('id, topic, status, admin_notes, created_at, channel_niche, niche, tone')
      .eq('status', 'failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ count: data.length, orders: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/orders/requeue — requeue specific orders by ID
// Body: { "ids": ["uuid1", "uuid2"] }
app.post('/admin/orders/requeue', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Provide { "ids": ["order-uuid-1", "order-uuid-2"] }' });
    }
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'queued', admin_notes: `Requeued via admin API (${new Date().toISOString().slice(0,10)})` })
      .in('id', ids)
      .select('id, topic, status');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ requeued: data.length, orders: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/orders/requeue-all-failed — requeue ALL failed orders from past N days
// Body: { "days": 7 } (optional, default 7)
app.post('/admin/orders/requeue-all-failed', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    // First get the failed orders
    const { data: failed, error: fetchErr } = await supabase
      .from('orders')
      .select('id, topic')
      .eq('status', 'failed')
      .gte('created_at', since);
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!failed || failed.length === 0) return res.json({ requeued: 0, message: 'No failed orders found' });
    const ids = failed.map(o => o.id);
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'queued', admin_notes: `Bulk requeue via admin API (${new Date().toISOString().slice(0,10)})` })
      .in('id', ids);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
    res.json({ requeued: failed.length, orders: failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/orders/status — overview of all order statuses
app.get('/admin/orders/status', requireAdmin, async (req, res) => {
  try {
    const statuses = ['queued', 'processing', 'review', 'failed', 'delivered'];
    const counts = {};
    for (const s of statuses) {
      const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', s);
      if (!error) counts[s] = count;
    }
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[fileserver] Running on port ${PORT}`);
  console.log(`[fileserver] Admin API ${process.env.ADMIN_API_KEY ? 'enabled' : 'disabled (set ADMIN_API_KEY)'}`);
});
