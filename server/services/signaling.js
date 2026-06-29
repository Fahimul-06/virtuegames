
import { WebSocketServer } from 'ws';
import url from 'url';

export function attachSignaling(server) {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = url.parse(req.url);
    if (pathname !== '/ws/signaling') return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws, req) => {
    const { query } = url.parse(req.url, true);
    const room = String(query.room || 'lobby');
    if (!rooms.has(room)) rooms.set(room, new Set());
    const peers = rooms.get(room);
    peers.add(ws);
    ws.on('message', (message) => {
      for (const peer of peers) {
        if (peer !== ws && peer.readyState === 1) peer.send(message.toString());
      }
    });
    ws.on('close', () => { peers.delete(ws); if (peers.size === 0) rooms.delete(room); });
    ws.send(JSON.stringify({ type: 'joined', room }));
  });
}
