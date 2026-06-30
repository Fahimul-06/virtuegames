import { useEffect, useState } from 'react';
import { Monitor, Cpu, Clock, Calendar, Activity, TrendingUp, Gamepad2, Server, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GameSession, UserGameSubscription, GpuRental } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { navigate } = useApp();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserGameSubscription[]>([]);
  const [rentals, setRentals] = useState<GpuRental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('game_sessions')
        .select('*, game:games(title, thumbnail_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('user_game_subscriptions')
        .select('*, game:games(title, thumbnail_url, genre)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('gpu_rentals')
        .select('*, gpu_type:gpu_types(name, model, tier)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]).then(([sessRes, subRes, rentalRes]) => {
      setSessions((sessRes.data as GameSession[]) ?? []);
      setSubscriptions((subRes.data as UserGameSubscription[]) ?? []);
      setRentals((rentalRes.data as GpuRental[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  const totalPlayTime = sessions.reduce((s, sess) => s + (sess.duration_seconds ?? 0), 0);
  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const stats = [
    { label: 'Wallet Balance', value: `$${(profile?.wallet_balance ?? 0).toFixed(2)}`, icon: <TrendingUp size={18} className="text-emerald-400" />, color: 'text-emerald-400' },
    { label: 'Active Subscriptions', value: subscriptions.length, icon: <Gamepad2 size={18} className="text-cyan-400" />, color: 'text-cyan-400' },
    { label: 'Active GPU Rentals', value: rentals.length, icon: <Server size={18} className="text-orange-400" />, color: 'text-orange-400' },
    { label: 'Total Play Time', value: formatDuration(totalPlayTime), icon: <Clock size={18} className="text-blue-400" />, color: 'text-blue-400' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to view your dashboard.</p>
          <button onClick={() => navigate('auth')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-lg font-black">
              {(profile?.username ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome back, {profile?.username ?? 'Gamer'}
              </h1>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="p-5 rounded-2xl bg-gray-900 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                {s.icon}
                <span className="text-gray-500 text-xs">{s.label}</span>
              </div>
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Subscriptions */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Monitor size={16} className="text-cyan-400" /> Game Subscriptions
              </h2>
              <button onClick={() => navigate('games')} className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors">
                Browse games →
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-800 animate-pulse" />)}
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No active subscriptions</p>
                <button onClick={() => navigate('games')} className="mt-3 text-cyan-400 text-xs hover:text-cyan-300">
                  Try a game free →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-white/5">
                    <img
                      src={(sub.game as Game)?.thumbnail_url ?? ''}
                      alt={(sub.game as Game)?.title ?? ''}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{(sub.game as Game)?.title}</div>
                      <div className="text-gray-500 text-xs capitalize">{sub.plan_type} plan</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </div>
                      {sub.expires_at && (
                        <div className="text-gray-600 text-xs mt-0.5">
                          {new Date(sub.expires_at) > new Date()
                            ? `exp. ${new Date(sub.expires_at).toLocaleDateString()}`
                            : 'Expired'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active GPU Rentals */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Cpu size={16} className="text-orange-400" /> GPU Rentals
              </h2>
              <button onClick={() => navigate('gpu-rentals')} className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors">
                Rent GPU →
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-800 animate-pulse" />)}
              </div>
            ) : rentals.length === 0 ? (
              <div className="text-center py-8">
                <Server size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No active GPU rentals</p>
                <button onClick={() => navigate('gpu-rentals')} className="mt-3 text-cyan-400 text-xs hover:text-cyan-300">
                  Browse GPUs →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rentals.map((rental) => (
                  <div key={rental.id} className="p-4 rounded-xl bg-gray-800 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-white text-sm font-medium">{rental.gpu_type?.name}</div>
                        <div className="text-gray-500 text-xs">{rental.gpu_type?.model} · {rental.workload_type}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <Activity size={12} />
                        Running
                      </div>
                    </div>
                    <div className="text-gray-600 text-xs font-mono">
                      {(rental.connection_info as Record<string, string>)?.hostname}
                    </div>
                    {rental.expires_at && (
                      <div className="text-gray-600 text-xs mt-1">
                        Expires: {new Date(rental.expires_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 lg:col-span-2">
            <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
              <Clock size={16} className="text-blue-400" /> Recent Game Sessions
            </h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-gray-800 animate-pulse" />)}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No sessions yet — start playing!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-white/5">
                      <th className="text-left pb-3 font-medium">Game</th>
                      <th className="text-left pb-3 font-medium">Type</th>
                      <th className="text-left pb-3 font-medium">Duration</th>
                      <th className="text-left pb-3 font-medium">Status</th>
                      <th className="text-left pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {sessions.map((sess) => (
                      <tr key={sess.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={(sess.game as Game)?.thumbnail_url ?? ''}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                            <span className="text-gray-300 truncate max-w-[120px]">{(sess.game as Game)?.title ?? 'Game'}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${sess.is_trial ? 'bg-orange-500/10 text-orange-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                            {sess.is_trial ? 'Trial' : 'Subscribed'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">{formatDuration(sess.duration_seconds)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            sess.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            sess.status === 'expired' ? 'bg-red-500/10 text-red-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            {sess.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600 text-xs">
                          {new Date(sess.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// needed for type assertion
type Game = import('../lib/types').Game;
