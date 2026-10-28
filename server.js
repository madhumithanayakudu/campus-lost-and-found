require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT = 3000 } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CATEGORIES = ['Electronics','Books & Notes','ID & Cards','Keys','Clothing','Bags','Accessories','Other'];
const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e);
  res.status(500).json({ error: e.message || 'Server error' });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/items', wrap(async (req, res) => {
  const { type, category, status, q } = req.query;
  let query = db.from('items').select('*').order('created_at', { ascending: false }).limit(200);
  if (type === 'lost' || type === 'found') query = query.eq('type', type);
  if (CATEGORIES.includes(category)) query = query.eq('category', category);
  if (status === 'open' || status === 'resolved') query = query.eq('status', status);
  if (q && q.trim()) {
    const s = q.trim().replace(/[%,()]/g, ' ');
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,location.ilike.%${s}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
}));

app.post('/api/items', wrap(async (req, res) => {
  const b = req.body || {};
  const item = {
    type: b.type, title: (b.title || '').trim(), description: (b.description || '').trim(),
    category: b.category, location: (b.location || '').trim(),
    event_date: b.event_date || new Date().toISOString().slice(0, 10),
    contact_name: (b.contact_name || '').trim(), contact_info: (b.contact_info || '').trim()
  };
  if (!['lost', 'found'].includes(item.type)) return res.status(400).json({ error: 'Choose lost or found.' });
  if (item.title.length < 3) return res.status(400).json({ error: 'Title must be at least 3 characters.' });
  if (!CATEGORIES.includes(item.category)) return res.status(400).json({ error: 'Pick a category.' });
  if (item.location.length < 2) return res.status(400).json({ error: 'Add a location.' });
  if (item.contact_name.length < 2) return res.status(400).json({ error: 'Add your name.' });
  if (item.contact_info.length < 5) return res.status(400).json({ error: 'Add an email or phone number.' });
  const { data, error } = await db.from('items').insert(item).select().single();
  if (error) throw error;
  res.status(201).json(data);
}));

app.patch('/api/items/:id/resolve', wrap(async (req, res) => {
  const { data, error } = await db.from('items').update({ status: 'resolved' }).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json(data);
}));

app.get('/api/stats', wrap(async (req, res) => {
  const { data, error } = await db.from('items').select('type,status');
  if (error) throw error;
  res.json({
    lost: data.filter(i => i.type === 'lost' && i.status === 'open').length,
    found: data.filter(i => i.type === 'found' && i.status === 'open').length,
    resolved: data.filter(i => i.status === 'resolved').length
  });
}));

app.listen(PORT, () => console.log(`Campus Lost & Found running at http://localhost:${PORT}`));
