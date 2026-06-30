import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const token = process.env.ENGINE_TOKEN || '';
const runtime = process.env.CLOUD_RUNTIME || 'docker';
const portStart = Number(process.env.CLOUD_PORT_START || 18080);
const portEnd = Number(process.env.CLOUD_PORT_END || 18120);
const defaultImage = process.env.CLOUD_DEFAULT_IMAGE || 'lscr.io/linuxserver/webtop:ubuntu-xfce';
const internalPort = Number(process.env.CLOUD_INTERNAL_PORT || 3000);
const enginePublicUrl = (process.env.ENGINE_PUBLIC_URL || '').replace(/\/$/, '');
const trialSecondsDefault = Number(process.env.TRIAL_SECONDS || 300);

const sessions = new Map();

function requireEngineToken(req, res, next) {
  if (!token) return next();
  if (req.headers['x-engine-token'] !== token) return res.status(401).json({ error: 'Invalid engine token' });
  next();
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err || out || `${cmd} failed`)));
  });
}

async function allocatePort() {
  const used = new Set([...sessions.values()].map(s => s.port));
  for (let p = portStart; p <= portEnd; p += 1) if (!used.has(p)) return p;
  throw new Error('No free PC engine ports. Increase CLOUD_PORT_END.');
}

function imageForGame(game) {
  const clean = String(game?.slug || game?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const envKey = `GAME_IMAGE_${clean.replace(/-/g, '_').toUpperCase()}`;
  return process.env[envKey] || game?.cloud_image || defaultImage;
}

async function startDockerSession({ userId, game, sessionId, isTrial }) {
  if (runtime !== 'docker') throw new Error(`Unsupported CLOUD_RUNTIME: ${runtime}`);
  const port = await allocatePort();
  const name = `vgz-${sessionId}-${crypto.randomBytes(3).toString('hex')}`.toLowerCase();
  const image = imageForGame(game);

  await run('docker', [
    'run', '-d', '--rm',
    '--name', name,
    '-p', `${port}:${internalPort}`,
    '-e', `TITLE=Vertue Game Zone - ${game?.title || 'Cloud Session'}`,
    '-e', 'PUID=1000',
    '-e', 'PGID=1000',
    '-e', 'TZ=Asia/Dhaka',
    '--shm-size=1g',
    image
  ]);

  const session = {
    provider: 'pc-engine-agent-docker-webtop',
    engine_mode: 'pc-agent',
    container_name: name,
    image,
    port,
    internal_port: internalPort,
    stream_url: enginePublicUrl ? `${enginePublicUrl}/stream/${sessionId}/` : `http://localhost:${port}`,
    direct_stream_url: `http://localhost:${port}`,
    trial_seconds: isTrial ? trialSecondsDefault : 0,
    started_at: new Date().toISOString(),
    user_id: userId,
    game_id: game?.id
  };
  sessions.set(sessionId, session);
  return session;
}

app.get('/health', async (_req, res) => {
  const docker = await run('docker', ['--version']).then(v => ({ ok: true, version: v })).catch(e => ({ ok: false, error: e.message }));
  res.json({ ok: true, service: 'Vertue Game Zone PC Engine Agent', docker, sessions: sessions.size });
});

app.post('/engine/sessions', requireEngineToken, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.sessionId) return res.status(400).json({ error: 'sessionId is required' });
    if (sessions.has(payload.sessionId)) return res.json(sessions.get(payload.sessionId));
    const session = await startDockerSession(payload);
    res.status(201).json(session);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/engine/sessions/:id/status', requireEngineToken, async (req, res) => {
  try {
    const info = sessions.get(req.params.id) || req.body?.connectionInfo || null;
    if (!info?.container_name) return res.json({ running: false });
    const id = await run('docker', ['ps', '-q', '-f', `name=${info.container_name}`]).catch(() => '');
    res.json({ running: Boolean(id), ...info });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/engine/sessions/:id/stop', requireEngineToken, async (req, res) => {
  try {
    const info = sessions.get(req.params.id) || req.body?.connectionInfo || null;
    if (info?.container_name) await run('docker', ['rm', '-f', info.container_name]).catch(() => null);
    sessions.delete(req.params.id);
    res.json({ stopped: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.use('/stream/:sessionId', (req, res, next) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).send('Cloud session not found or expired.');
  return createProxyMiddleware({
    target: `http://127.0.0.1:${session.port}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: { [`^/stream/${req.params.sessionId}`]: '' }
  })(req, res, next);
});

process.on('SIGINT', async () => {
  for (const [id, session] of sessions.entries()) {
    if (session.container_name) await run('docker', ['rm', '-f', session.container_name]).catch(() => null);
    sessions.delete(id);
  }
  process.exit(0);
});

const port = Number(process.env.PORT || 7070);
app.listen(port, '0.0.0.0', () => {
  console.log(`Vertue Game Zone PC Engine Agent running on http://0.0.0.0:${port}`);
});
