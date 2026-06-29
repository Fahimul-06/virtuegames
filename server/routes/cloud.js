import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { models, toClient } from '../models/index.js';

const router = express.Router();
const TRIAL_SECONDS = Number(process.env.TRIAL_SECONDS || 300);
const AGENT_SHARED_SECRET = process.env.AGENT_SHARED_SECRET || 'change-this-agent-secret';

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin only.' });
    next();
  });
}

function requireAgent(req, res, next) {
  const token = req.header('x-agent-token') || req.body?.agent_token;
  if (!token || token !== AGENT_SHARED_SECRET) return res.status(401).json({ error: 'Invalid GPU agent token.' });
  next();
}

function slugify(text = '') {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function syncInstalledGames(installedGames = []) {
  const normalized = [];
  const ids = [];
  for (const item of installedGames) {
    const title = item.title || item.name;
    if (!title) continue;
    const slug = item.slug || slugify(title);
    let game = await models.games.findOne({ $or: [{ slug }, { title }] });
    if (!game) {
      game = await models.games.create({
        title,
        slug,
        description: item.description || `${title} is available on a connected GPU server.`,
        genre: item.genre || 'Cloud Game',
        developer: item.developer || 'Unknown',
        publisher: item.publisher || 'Unknown',
        thumbnail_url: item.cover_url || item.thumbnail_url || '',
        banner_url: item.banner_url || item.cover_url || item.thumbnail_url || '',
        trailer_url: item.trailer_url || '',
        rating: item.rating || 4.5,
        is_featured: false,
        is_active: true,
        tags: item.tags || ['cloud', 'server-installed']
      });
    }
    ids.push(game._id.toString());
    normalized.push({
      game_id: game._id.toString(),
      title: game.title,
      slug,
      platform: item.platform || 'windows',
      launch_path: item.launch_path || item.exe || '',
      install_dir: item.install_dir || '',
      cover_url: item.cover_url || item.thumbnail_url || game.thumbnail_url || '',
      executable_found: item.executable_found !== false
    });
  }
  return { ids, normalized };
}

async function findAvailableNode(gameId = null) {
  const q = { status: 'online', $expr: { $lt: ['$used_slots', '$total_slots'] } };
  if (gameId) q.installed_game_ids = gameId;
  return models.gpu_nodes.findOne(q).sort({ used_slots: 1, last_heartbeat_at: -1 });
}

async function getActiveSubscription(userId, gameId) {
  return models.user_game_subscriptions.findOne({
    user_id: userId,
    game_id: gameId,
    is_active: true,
    expires_at: { $gt: new Date() }
  });
}

router.get('/nodes', requireAdmin, async (_req, res) => {
  const nodes = await models.gpu_nodes.find().sort({ status: 1, last_heartbeat_at: -1 });
  res.json(nodes.map(toClient));
});

router.get('/nodes/public', async (_req, res) => {
  const nodes = await models.gpu_nodes.find({ status: 'online' }).select('name region gpu_model total_slots used_slots installed_game_ids installed_games status last_heartbeat_at hardware');
  res.json(nodes.map(toClient));
});

router.post('/nodes/heartbeat', requireAgent, async (req, res) => {
  const {
    name,
    region = 'local',
    public_url = '',
    gpu_model = 'RTX GPU',
    total_slots = 1,
    used_slots,
    installed_games = [],
    installed_game_ids = [],
    hardware = {},
    system = {},
    capabilities = ['webrtc', 'game-streaming', 'gpu-rental']
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Node name is required.' });
  const synced = await syncInstalledGames(installed_games);
  const gameIds = [...new Set([...(installed_game_ids || []), ...synced.ids])];
  const node = await models.gpu_nodes.findOneAndUpdate(
    { name },
    {
      name,
      region,
      public_url,
      gpu_model: hardware.gpu_model || gpu_model,
      total_slots,
      ...(Number.isFinite(Number(used_slots)) ? { used_slots: Number(used_slots) } : {}),
      installed_game_ids: gameIds,
      installed_games: synced.normalized,
      hardware,
      system,
      capabilities,
      status: 'online',
      last_heartbeat_at: new Date()
    },
    { upsert: true, new: true }
  );
  res.json(toClient(node));
});

router.patch('/nodes/:id', requireAdmin, async (req, res) => {
  const node = await models.gpu_nodes.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!node) return res.status(404).json({ error: 'GPU node not found.' });
  res.json(toClient(node));
});

router.post('/game-sessions/start', requireAuth, async (req, res) => {
  try {
    const { game_id, is_trial = false } = req.body;
    const game = await models.games.findById(game_id);
    if (!game || !game.is_active) return res.status(404).json({ error: 'Game not available.' });

    const usedTrial = await models.game_sessions.findOne({ user_id: req.user.id, game_id, is_trial: true });
    const subscription = await getActiveSubscription(req.user.id, game_id);
    if (is_trial && usedTrial) return res.status(403).json({ error: 'Free trial already used for this game.' });
    if (!is_trial && !subscription) return res.status(402).json({ error: 'Purchase access before launching this game.' });

    const node = await findAvailableNode(game_id);
    if (!node) return res.status(503).json({ error: 'No GPU server is free for this game right now, or this game is not installed on any online server.' });

    const room = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = is_trial ? new Date(now.getTime() + TRIAL_SECONDS * 1000) : subscription.expires_at;
    const installedGame = (node.installed_games || []).find((g) => String(g.game_id) === String(game_id));
    const session = await models.game_sessions.create({
      user_id: req.user.id,
      game_id,
      subscription_id: subscription?._id?.toString() || null,
      gpu_node_id: node._id.toString(),
      started_at: now,
      expires_at: expiresAt,
      is_trial,
      status: 'provisioning',
      signaling_room: room,
      stream_url: `/stream/${room}`,
      connection_info: {
        mode: 'webrtc',
        signaling_ws: `/ws/signaling?room=${room}`,
        gpu_node: node.name,
        region: node.region,
        launch_path: installedGame?.launch_path || '',
        node_public_url: node.public_url || ''
      }
    });
    await models.gpu_nodes.findByIdAndUpdate(node._id, { $inc: { used_slots: 1 } });

    setTimeout(async () => {
      await models.game_sessions.findByIdAndUpdate(session._id, { status: 'active' }).catch(() => {});
    }, 1000);

    res.status(201).json(await toClient(await models.game_sessions.findById(session._id)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/game-sessions/:id/end', requireAuth, async (req, res) => {
  const session = await models.game_sessions.findOne({ _id: req.params.id, user_id: req.user.id });
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  const now = new Date();
  const duration = Math.max(0, Math.floor((now - new Date(session.started_at)) / 1000));
  session.status = req.body.status || 'ended';
  session.ended_at = now;
  session.duration_seconds = duration;
  await session.save();
  if (session.gpu_node_id) await models.gpu_nodes.findByIdAndUpdate(session.gpu_node_id, { $inc: { used_slots: -1 } });
  res.json(toClient(session));
});

router.post('/gpu-rentals/start', requireAuth, async (req, res) => {
  const { gpu_type_id, plan_type = 'hourly', workload_type = 'cloud_pc' } = req.body;
  const gpu = await models.gpu_types.findById(gpu_type_id);
  if (!gpu) return res.status(404).json({ error: 'GPU type not found.' });
  const plan = await models.gpu_plans.findOne({ gpu_type_id, plan_type });
  if (!plan) return res.status(404).json({ error: 'GPU plan not found.' });
  const user = await models.profiles.findById(req.user.id);
  if ((user.wallet_balance || 0) < plan.price) return res.status(402).json({ error: 'Insufficient wallet balance.' });
  const node = await findAvailableNode(null);
  if (!node) return res.status(503).json({ error: 'No GPU server available.' });
  const now = new Date();
  const hours = plan_type === 'hourly' ? 1 : plan_type === 'monthly' ? 720 : 8760;
  const rental = await models.gpu_rentals.create({
    user_id: req.user.id, gpu_type_id, gpu_node_id: node._id.toString(), plan_type, workload_type,
    amount_paid: plan.price, starts_at: now, expires_at: new Date(now.getTime() + hours * 3600_000),
    is_active: true, status: 'provisioning',
    connection_info: { mode: 'cloud-pc-webrtc', region: node.region, node: node.name, node_public_url: node.public_url || '' }
  });
  user.wallet_balance -= plan.price; await user.save();
  await models.wallet_transactions.create({ user_id: req.user.id, type: 'debit', amount: plan.price, description: `${gpu.name} ${plan_type} rental`, reference_type: 'gpu_rental', reference_id: rental._id.toString(), balance_after: user.wallet_balance });
  await models.gpu_nodes.findByIdAndUpdate(node._id, { $inc: { used_slots: 1 } });
  res.status(201).json(toClient(rental));
});

router.post('/payments/create-intent', requireAuth, async (req, res) => {
  const { amount, provider = 'manual', reference_type = 'wallet_topup', reference_id = null } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive.' });
  const intent = await models.payment_intents.create({ user_id: req.user.id, amount, provider, reference_type, reference_id, status: 'pending', checkout_url: provider === 'manual' ? null : `${process.env.PUBLIC_URL || ''}/checkout/mock` });
  res.status(201).json(toClient(intent));
});

export default router;
