import { useEffect, useState } from 'react';
import { Users, Gamepad2, Server, DollarSign, TrendingUp, Shield, Activity, BarChart2, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import type { Profile, Game, SupportTicket, GpuRental, UserGameSubscription } from '../lib/types';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { navigate } = useApp();
  const [tab, setTab] = useState<'overview' | 'users' | 'games' | 'tickets' | 'servers'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [rentals, setRentals] = useState<GpuRental[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserGameSubscription[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const loadData = async () => {
    const [usersRes, gamesRes, ticketsRes, rentalsRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('games').select('*').order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('gpu_rentals').select('*, gpu_type:gpu_types(name, model)').order('created_at', { ascending: false }).limit(50),
      supabase.from('user_game_subscriptions').select('*, game:games(title)').order('created_at', { ascending: false }).limit(50),
    ]);
    setUsers(usersRes.data ?? []);
    setGames(gamesRes.data ?? []);
    setTickets(ticketsRes.data ?? []);
    setRentals((rentalsRes.data as GpuRental[]) ?? []);
    setSubscriptions((subsRes.data as UserGameSubscription[]) ?? []);

    const rentalRevenue = (rentalsRes.data ?? []).reduce((s: number, r: GpuRental) => s + (r.amount_paid ?? 0), 0);
    const subRevenue = (subsRes.data ?? []).reduce((s: number, r: UserGameSubscription) => s + (r.amount_paid ?? 0), 0);
    setTotalRevenue(rentalRevenue + subRevenue);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadData();
  }, [profile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleToggleGame = async (gameId: string, current: boolean) => {
    await supabase.from('games').update({ is_active: !current }).eq('id', gameId);
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, is_active: !current } : g));
  };

  const handleUpdateTicket = async (ticketId: string, status: SupportTicket['status']) => {
    await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status } : t));
  };

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">Access denied. Admin only.</p>
          <button onClick={() => navigate('landing')} className="mt-4 text-cyan-400 text-sm hover:text-cyan-300">← Go home</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'users' as const, label: `Users (${users.length})`, icon: <Users size={14} /> },
    { id: 'games' as const, label: `Games (${games.length})`, icon: <Gamepad2 size={14} /> },
    { id: 'tickets' as const, label: `Tickets (${tickets.filter(t => t.status === 'open').length} open)`, icon: <Activity size={14} /> },
    { id: 'servers' as const, label: `GPUs (${rentals.filter(r => r.is_active).length} active)`, icon: <Server size={14} /> },
  ];

  const statsCards = [
    { label: 'Total Users', value: users.length, icon: <Users size={18} className="text-cyan-400" />, color: 'text-cyan-400' },
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: <DollarSign size={18} className="text-emerald-400" />, color: 'text-emerald-400' },
    { label: 'Active Rentals', value: rentals.filter(r => r.is_active).length, icon: <Server size={18} className="text-orange-400" />, color: 'text-orange-400' },
    { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: <Activity size={18} className="text-red-400" />, color: 'text-red-400' },
    { label: 'Active Subs', value: subscriptions.filter(s => s.is_active).length, icon: <TrendingUp size={18} className="text-blue-400" />, color: 'text-blue-400' },
    { label: 'Active Games', value: games.filter(g => g.is_active).length, icon: <Gamepad2 size={18} className="text-violet-400" />, color: 'text-violet-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="py-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">Admin Panel</span>
            </div>
            <h1 className="text-3xl font-black text-white">Dashboard</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-900 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {statsCards.map((s) => (
                    <div key={s.label} className="p-6 rounded-2xl bg-gray-900 border border-white/5">
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                        {s.icon} {s.label}
                      </div>
                      <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Revenue by source */}
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-5">Revenue Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Game Subscriptions', amount: subscriptions.reduce((s, r) => s + r.amount_paid, 0), icon: <Gamepad2 size={16} className="text-cyan-400" /> },
                      { label: 'GPU Rentals', amount: rentals.reduce((s, r) => s + r.amount_paid, 0), icon: <Server size={16} className="text-orange-400" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3 p-4 rounded-xl bg-gray-800 border border-white/5">
                        {row.icon}
                        <div className="flex-1">
                          <div className="text-gray-400 text-sm">{row.label}</div>
                          <div className="text-white font-bold">${row.amount.toFixed(2)}</div>
                        </div>
                        <div className="text-xs text-gray-600">
                          {totalRevenue > 0 ? ((row.amount / totalRevenue) * 100).toFixed(0) : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent signups */}
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-5">Recent Signups</h3>
                  <div className="space-y-2">
                    {users.slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {(u.username ?? 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white text-sm">{u.username ?? 'Unknown'}</div>
                            <div className="text-gray-600 text-xs">{new Date(u.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.is_admin && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">Admin</span>}
                          <span className="text-emerald-400 text-sm font-medium">${u.wallet_balance.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5">
                  <h3 className="text-white font-semibold">All Users ({users.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-gray-500">
                        <th className="text-left px-5 py-3 font-medium">User</th>
                        <th className="text-left px-5 py-3 font-medium">Joined</th>
                        <th className="text-left px-5 py-3 font-medium">Balance</th>
                        <th className="text-left px-5 py-3 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {(u.username ?? 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-300">{u.username ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-5 py-3 text-emerald-400 font-medium">${u.wallet_balance.toFixed(2)}</td>
                          <td className="px-5 py-3">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">Admin</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 text-xs">User</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* GAMES */}
            {tab === 'games' && (
              <div className="space-y-3">
                {games.map((game) => (
                  <div key={game.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-900 border border-white/5">
                    <img src={game.thumbnail_url ?? ''} alt={game.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{game.title}</div>
                      <div className="text-gray-500 text-xs">{game.genre} · {game.developer}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span>⭐ {game.rating}</span>
                        <span>👥 {(game.player_count_online / 1000).toFixed(1)}k online</span>
                        {game.is_featured && <span className="text-cyan-400">Featured</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleGame(game.id, game.is_active)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        game.is_active
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {game.is_active ? <><Check size={12} /> Active</> : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* TICKETS */}
            {tab === 'tickets' && (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-gray-900 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{ticket.subject}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {ticket.category} · {ticket.priority} priority · {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleUpdateTicket(ticket.id, e.target.value as SupportTicket['status'])}
                      className={`bg-gray-800 border rounded-xl px-3 py-1.5 text-xs font-medium transition-all focus:outline-none ${
                        ticket.status === 'open' ? 'border-blue-500/30 text-blue-400' :
                        ticket.status === 'in_progress' ? 'border-yellow-500/30 text-yellow-400' :
                        ticket.status === 'resolved' ? 'border-emerald-500/30 text-emerald-400' :
                        'border-gray-700 text-gray-400'
                      }`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* SERVERS */}
            {tab === 'servers' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Total Rentals', value: rentals.length, color: 'text-white' },
                    { label: 'Active Instances', value: rentals.filter(r => r.is_active).length, color: 'text-emerald-400' },
                    { label: 'Revenue', value: `$${rentals.reduce((s, r) => s + r.amount_paid, 0).toFixed(2)}`, color: 'text-cyan-400' },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-2xl bg-gray-900 border border-white/5">
                      <div className="text-gray-500 text-xs mb-1">{s.label}</div>
                      <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {rentals.map((rental) => (
                  <div key={rental.id} className="p-4 rounded-2xl bg-gray-900 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-white text-sm font-medium">{rental.gpu_type?.name} ({rental.gpu_type?.model})</div>
                        <div className="text-gray-500 text-xs">{rental.workload_type} · {rental.plan_type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium ${
                          rental.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' :
                          rental.status === 'provisioning' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {rental.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {rental.status}
                        </span>
                        <span className="text-emerald-400 text-sm font-semibold">${rental.amount_paid.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-gray-600 text-xs font-mono">
                      {(rental.connection_info as Record<string, string>)?.hostname ?? 'N/A'}
                      {rental.expires_at && ` · exp. ${new Date(rental.expires_at).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
