import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { models, toClient } from '../models/index.js';
import { startCloudSession, stopCloudSession, getCloudStatus } from '../services/cloudEngine.js';

const router = express.Router();
router.use(requireAuth);

async function assertPlayable(userId, gameId, isTrial) {
  if (isTrial) {
    const usedTrial = await models.game_sessions.findOne({ user_id: userId, game_id: gameId, is_trial: true });
    if (usedTrial) throw new Error('Free trial already used for this game. Purchase access to continue.');
    return null;
  }
  const now = new Date();
  const sub = await models.user_game_subscriptions.findOne({
    user_id: userId,
    game_id: gameId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }]
  });
  if (!sub) throw new Error('No active subscription for this game.');
  return sub;
}

router.post('/game-sessions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { game_id, is_trial = false } = req.body;
    const game = await models.games.findById(game_id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const sub = await assertPlayable(userId, game_id, Boolean(is_trial));

    const doc = await models.game_sessions.create({
      user_id: userId,
      game_id,
      subscription_id: sub?.id ?? null,
      started_at: new Date(),
      duration_seconds: 0,
      is_trial: Boolean(is_trial),
      status: 'provisioning'
    });

    const connection = await startCloudSession({ userId, game: { ...toClient(game), cloud_image: game.cloud_image }, sessionId: doc.id, isTrial: Boolean(is_trial) });
    doc.status = 'active';
    doc.connection_info = connection;
    await doc.save();
    res.status(201).json(toClient(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/game-sessions/:id/status', async (req, res) => {
  try {
    const doc = await models.game_sessions.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Session not found' });
    res.json(await getCloudStatus(doc.id, doc.connection_info));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/game-sessions/:id/stop', async (req, res) => {
  try {
    const doc = await models.game_sessions.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Session not found' });
    await stopCloudSession(doc.id, doc.connection_info);
    const started = doc.started_at ? new Date(doc.started_at).getTime() : Date.now();
    doc.status = req.body.status || 'ended';
    doc.ended_at = new Date();
    doc.duration_seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
    await doc.save();
    res.json(toClient(doc));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;
