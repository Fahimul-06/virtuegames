import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { models, toClient } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const signToken = (user) => jwt.sign({ id: user._id.toString(), email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const exists = await models.profiles.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await models.profiles.create({ email, password: hashed, username, wallet_balance: 0, is_admin: false });
    const token = signToken(user);
    res.json({ token, user: { id: user._id.toString(), email: user.email }, profile: toClient(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await models.profiles.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = signToken(user);
    res.json({ token, user: { id: user._id.toString(), email: user.email }, profile: toClient(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await models.profiles.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: { id: user._id.toString(), email: user.email }, profile: toClient(user) });
});

export default router;
