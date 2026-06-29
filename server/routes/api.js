import express from 'express';
import { models, toClient } from '../models/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

const userOwnedTables = new Set(['game_sessions', 'user_game_subscriptions', 'gpu_rentals', 'wallet_transactions', 'support_tickets', 'ticket_replies']);
const defaultStatus = { game_sessions: 'active', gpu_rentals: 'provisioning', support_tickets: 'open' };

function getModel(table) {
  const Model = models[table];
  if (!Model) throw new Error(`Unknown table: ${table}`);
  return Model;
}

async function attachRelations(table, rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  for (const row of list) {
    if (!row) continue;
    if (['game_sessions', 'user_game_subscriptions'].includes(table) && row.game_id) {
      const game = await models.games.findById(row.game_id).catch(() => null);
      if (game) row.game = toClient(game);
    }
    if (table === 'gpu_rentals' && row.gpu_type_id) {
      const gpu = await models.gpu_types.findById(row.gpu_type_id).catch(() => null);
      if (gpu) row.gpu_type = toClient(gpu);
    }
  }
  return Array.isArray(rows) ? list : list[0];
}

router.get('/:table', optionalAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const Model = getModel(table);
    const q = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (['order', 'limit', 'select'].includes(key)) continue;
      q[key === 'id' ? '_id' : key] = value;
    }
    const query = Model.find(q);
    if (req.query.order) {
      const [field, dir] = String(req.query.order).split(':');
      query.sort({ [field]: dir === 'asc' ? 1 : -1 });
    }
    if (req.query.limit) query.limit(Number(req.query.limit));
    let rows = (await query).map(toClient);
    rows = await attachRelations(table, rows);
    res.json(rows);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/:table', optionalAuth, async (req, res) => {
  try {
    const { table } = req.params;
    const Model = getModel(table);
    const payload = { ...req.body };
    if (userOwnedTables.has(table) && req.user && !payload.user_id) payload.user_id = req.user.id;
    if (defaultStatus[table] && !payload.status) payload.status = defaultStatus[table];
    if (payload.starts_at === undefined && ['game_sessions', 'user_game_subscriptions', 'gpu_rentals'].includes(table)) payload.starts_at = new Date();
    const doc = await Model.create(payload);
    res.status(201).json(toClient(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.patch('/:table/:id', optionalAuth, async (req, res) => {
  try {
    const Model = getModel(req.params.table);
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(toClient(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
