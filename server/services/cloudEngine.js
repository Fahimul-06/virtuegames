import { spawn } from 'child_process';
import crypto from 'crypto';

const runtime = process.env.CLOUD_RUNTIME || 'docker';
const publicHost = process.env.CLOUD_PUBLIC_HOST || 'localhost';
const portStart = Number(process.env.CLOUD_PORT_START || 18080);
const portEnd = Number(process.env.CLOUD_PORT_END || 18120);
const defaultImage = process.env.CLOUD_DEFAULT_IMAGE || 'lscr.io/linuxserver/webtop:ubuntu-xfce';
const internalPort = Number(process.env.CLOUD_INTERNAL_PORT || 3000);

const memory = new Map();

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
  const used = new Set([...memory.values()].map(s => s.port));
  for (let p = portStart; p <= portEnd; p += 1) if (!used.has(p)) return p;
  throw new Error('No cloud gaming ports available. Increase CLOUD_PORT_END or add more GPU nodes.');
}

function imageForGame(game) {
  const clean = String(game?.slug || game?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const envKey = `GAME_IMAGE_${clean.replace(/-/g, '_').toUpperCase()}`;
  return process.env[envKey] || game?.cloud_image || defaultImage;
}

export async function startCloudSession({ userId, game, sessionId, isTrial }) {
  const port = await allocatePort();
  const name = `vgz-${sessionId}-${crypto.randomBytes(3).toString('hex')}`.toLowerCase();
  const image = imageForGame(game);
  const trialSeconds = isTrial ? Number(process.env.TRIAL_SECONDS || 300) : 0;

  if (runtime !== 'docker') throw new Error(`Unsupported CLOUD_RUNTIME: ${runtime}`);

  await run('docker', [
    'run', '-d', '--rm',
    '--name', name,
    '-p', `${port}:${internalPort}`,
    '-e', `TITLE=Vertue Game Zone - ${game?.title || 'Cloud Session'}`,
    '-e', 'PUID=1000', '-e', 'PGID=1000',
    '-e', 'TZ=Asia/Dhaka',
    '--shm-size=1g',
    image
  ]);

  const session = {
    provider: 'docker-webtop',
    container_name: name,
    image,
    port,
    stream_url: `http://${publicHost}:${port}`,
    internal_port: internalPort,
    trial_seconds: trialSeconds,
    started_at: new Date().toISOString(),
    user_id: userId,
    game_id: game?.id
  };
  memory.set(sessionId, session);
  return session;
}

export async function stopCloudSession(sessionId, connectionInfo = {}) {
  const info = memory.get(sessionId) || connectionInfo;
  if (info?.container_name) {
    await run('docker', ['rm', '-f', info.container_name]).catch(() => null);
  }
  memory.delete(sessionId);
}

export async function getCloudStatus(sessionId, connectionInfo = {}) {
  const info = memory.get(sessionId) || connectionInfo;
  if (!info?.container_name) return { running: false };
  const id = await run('docker', ['ps', '-q', '-f', `name=${info.container_name}`]).catch(() => '');
  return { running: Boolean(id), ...info };
}
