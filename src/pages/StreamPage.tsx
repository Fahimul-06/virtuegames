
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Gamepad2, Monitor, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function StreamPage({ session }: { session: any }) {
  const { navigate } = useApp();
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!session?.connection_info?.signaling_ws) return;
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${scheme}://${window.location.host}${session.connection_info.signaling_ws}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => { setConnected(true); setLog((x) => ['Connected to signaling room.', ...x]); };
    ws.onmessage = (event) => setLog((x) => [`Signal: ${event.data}`, ...x].slice(0, 5));
    ws.onclose = () => { setConnected(false); setLog((x) => ['Disconnected.', ...x]); };
    return () => ws.close();
  }, [session]);

  const sendInput = (type: string, payload: any) => {
    wsRef.current?.send(JSON.stringify({ type, payload, t: Date.now() }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => sendInput('keyboard', { key: e.key, code: e.code, down: e.type === 'keydown' });
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        <div className="relative bg-gray-950 flex items-center justify-center overflow-hidden" onMouseMove={(e) => sendInput('mouse', { x: e.clientX, y: e.clientY })}>
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button onClick={() => navigate('game-detail', session?.game_id)} className="px-3 py-2 rounded-xl bg-white/10 text-white flex items-center gap-2 text-sm hover:bg-white/20"><ArrowLeft size={16}/> Exit Stream</button>
            <span className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 ${connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{connected ? <Wifi size={16}/> : <WifiOff size={16}/>} {connected ? 'Signaling online' : 'Offline'}</span>
          </div>
          <div className="w-[92%] aspect-video rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/10">
            <Monitor className="text-cyan-400 mb-4" size={64}/>
            <h1 className="text-white text-2xl font-black mb-2">Cloud Game Stream Placeholder</h1>
            <p className="text-gray-400 max-w-xl text-center px-6">The MERN backend now creates sessions, assigns a GPU node, and opens a WebRTC signaling room. Connect your GPU agent here to send real encoded video/audio and receive keyboard/mouse/gamepad input.</p>
          </div>
        </div>
        <aside className="bg-gray-950 border-l border-white/10 p-5 overflow-y-auto">
          <div className="flex items-center gap-2 text-white font-bold mb-4"><Gamepad2 className="text-cyan-400"/> Live Session</div>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl bg-white/5"><div className="text-gray-500">Status</div><div className="text-white capitalize">{session?.status}</div></div>
            <div className="p-3 rounded-xl bg-white/5"><div className="text-gray-500">GPU Node</div><div className="text-white">{session?.connection_info?.gpu_node || 'waiting'}</div></div>
            <div className="p-3 rounded-xl bg-white/5"><div className="text-gray-500">Region</div><div className="text-white">{session?.connection_info?.region || 'local'}</div></div>
          </div>
          <h2 className="text-white font-semibold mt-6 mb-3">Signal Log</h2>
          <div className="space-y-2 text-xs text-gray-400">{log.map((l,i)=><div key={i} className="p-2 rounded-lg bg-black/40 border border-white/5">{l}</div>)}</div>
        </aside>
      </div>
    </div>
  );
}
