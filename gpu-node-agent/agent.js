import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function arg(name, fallback = '') {
  const flag = `--${name}=`;
  const found = process.argv.find((v) => v.startsWith(flag));
  return found ? found.slice(flag.length) : fallback;
}

const API_BASE = arg('api', process.env.API_BASE || 'http://localhost:5000/api/cloud');
const NODE_NAME = arg('name', process.env.NODE_NAME || os.hostname());
const REGION = arg('region', process.env.NODE_REGION || 'Bangladesh');
const PUBLIC_URL = arg('public-url', process.env.PUBLIC_URL || '');
const AGENT_TOKEN = process.env.AGENT_SHARED_SECRET || process.env.AGENT_TOKEN || 'change-this-agent-secret';
const TOTAL_SLOTS = Number(arg('slots', process.env.TOTAL_SLOTS || '1'));
const GAMES_CONFIG = arg('games', process.env.GAMES_CONFIG || path.resolve('games.config.json'));
const HEARTBEAT_SECONDS = Number(process.env.HEARTBEAT_SECONDS || '30');

function safeExec(command) {
  try { return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return ''; }
}

function getGpuInfo() {
  const nvidia = safeExec('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
  if (nvidia) {
    const first = nvidia.split(/\r?\n/)[0];
    const [name, vram] = first.split(',').map((x) => x.trim());
    return { gpu_model: name, vram_gb: Math.round(Number(vram || 0) / 1024) };
  }
  return { gpu_model: process.env.GPU_MODEL || 'Unknown GPU', vram_gb: Number(process.env.VRAM_GB || 0) };
}

function getRamGb() {
  return Math.round(os.totalmem() / 1024 / 1024 / 1024);
}

function loadConfiguredGames() {
  if (!fs.existsSync(GAMES_CONFIG)) return [];
  const raw = JSON.parse(fs.readFileSync(GAMES_CONFIG, 'utf8'));
  return raw.map((g) => ({
    ...g,
    executable_found: g.launch_path ? fs.existsSync(g.launch_path) : true
  }));
}

async function heartbeat() {
  const gpu = getGpuInfo();
  const installed_games = loadConfiguredGames();
  const payload = {
    name: NODE_NAME,
    region: REGION,
    public_url: PUBLIC_URL,
    gpu_model: gpu.gpu_model,
    total_slots: TOTAL_SLOTS,
    hardware: {
      gpu_model: gpu.gpu_model,
      vram_gb: gpu.vram_gb,
      cpu: os.cpus()[0]?.model || 'Unknown CPU',
      cpu_threads: os.cpus().length,
      ram_gb: getRamGb(),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname()
    },
    system: {
      uptime_seconds: Math.round(os.uptime()),
      free_ram_gb: Math.round(os.freemem() / 1024 / 1024 / 1024),
      agent_version: '1.0.0'
    },
    capabilities: ['webrtc', 'game-streaming', 'gpu-rental'],
    installed_games
  };

  const res = await fetch(`${API_BASE}/nodes/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-token': AGENT_TOKEN },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Heartbeat failed: ${res.status}`);
  console.log(`[VGZ Agent] ${new Date().toISOString()} connected as ${json.name}. Games: ${installed_games.length}. GPU: ${gpu.gpu_model}`);
}

await heartbeat().catch((err) => console.error('[VGZ Agent]', err.message));
setInterval(() => heartbeat().catch((err) => console.error('[VGZ Agent]', err.message)), HEARTBEAT_SECONDS * 1000);
