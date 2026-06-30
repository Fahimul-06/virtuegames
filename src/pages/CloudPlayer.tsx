import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, Monitor, Square } from 'lucide-react';
import { cloud, supabase } from '../lib/supabase';
import type { GameSession } from '../lib/types';
import { useApp } from '../contexts/AppContext';

interface CloudPlayerProps { sessionId: string; }

export default function CloudPlayer({ sessionId }: CloudPlayerProps) {
  const { navigate } = useApp();
  const [session, setSession] = useState<GameSession | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.from('game_sessions').select('*').eq('id', sessionId).maybeSingle();
      const stat = await cloud.getGameSessionStatus(sessionId);
      if (!alive) return;
      setSession(data);
      setStatus(stat.data);
      setLoading(false);
    }
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [sessionId]);

  const streamUrl = session?.connection_info?.stream_url || status?.stream_url;

  async function stop() {
    setStopping(true);
    await cloud.stopGameSession(sessionId, 'ended');
    setStopping(false);
    navigate('game-detail', session?.game_id);
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2" /> Starting cloud session...</div>;
  }

  return (
    <div className="min-h-screen bg-black pt-16">
      <div className="h-14 bg-gray-950 border-b border-white/10 flex items-center justify-between px-4">
        <button onClick={() => navigate('game-detail', session?.game_id)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"><ArrowLeft size={16}/> Back</button>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <Monitor size={16} className="text-cyan-400" /> Cloud session {status?.running ? 'running' : 'starting'}
        </div>
        <button onClick={stop} disabled={stopping} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 disabled:opacity-50"><Square size={14}/> {stopping ? 'Stopping...' : 'Stop'}</button>
      </div>

      {!streamUrl ? (
        <div className="h-[calc(100vh-7.5rem)] flex items-center justify-center text-gray-500">No stream URL returned by the engine.</div>
      ) : (
        <div className="h-[calc(100vh-7.5rem)] bg-black">
          <iframe src={streamUrl} title="Vertue Cloud Game Stream" className="w-full h-full border-0" allow="fullscreen; clipboard-read; clipboard-write" />
          <div className="absolute bottom-4 right-4">
            <a href={streamUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs hover:bg-white/20"><ExternalLink size={14}/> Open stream directly</a>
          </div>
        </div>
      )}
    </div>
  );
}
