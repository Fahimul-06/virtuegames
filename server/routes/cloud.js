
import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { models, toClient } from '../models/index.js';

const router = express.Router();
const TRIAL_SECONDS = Number(process.env.TRIAL_SECONDS || 300);

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
    if (!node) return res.status(503).json({ error: 'No GPU server is free for this game right now.' });

    const room = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = is_trial ? new Date(now.getTime() + TRIAL_SECONDS * 1000) : subscription.expires_at;
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
        region: node.region
      }
    });
    await models.gpu_nodes.findByIdAndUpdate(node._id, { $inc: { used_slots: 1 } });

    // Real production: enqueue a command for the GPU agent to start Windows game process/capture.
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
    connection_info: { mode: 'cloud-pc-webrtc', region: node.region, node: node.name }
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

// Admin/GPU-agent heartbeat. In production this must use a separate agent token.
router.post('/nodes/heartbeat', async (req, res) => {
  const { name, region='local', public_url='', gpu_model='RTX GPU', total_slots=1, installed_game_ids=[] } = req.body;
  const node = await models.gpu_nodes.findOneAndUpdate(
    { name },
    { name, region, public_url, gpu_model, total_slots, installed_game_ids, status: 'online', last_heartbeat_at: new Date() },
    { upsert: true, new: true }
  );
  res.json(toClient(node));
});

export default router;
