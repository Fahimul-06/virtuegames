import { useEffect, useState } from 'react';
import { Play, Zap, Shield, Globe, Star, Users, ArrowRight, Cpu, Monitor, ChevronRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Game } from '../lib/types';
import GameCard from '../components/GameCard';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const { navigate } = useApp();
  const { user } = useAuth();

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .eq('is_featured', true)
      .limit(4)
      .then(({ data }) => setFeaturedGames(data ?? []));
  }, []);

  const stats = [
    { value: '50M+', label: 'Active Players' },
    { value: '200+', label: 'Cloud Games' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '<20ms', label: 'Avg Latency' },
  ];

  const features = [
    {
      icon: <Zap className="text-cyan-400" size={22} />,
      title: 'Instant Streaming',
      desc: 'Zero download. Play any game in under 5 seconds from any device with a browser.',
    },
    {
      icon: <Shield className="text-blue-400" size={22} />,
      title: 'Enterprise Security',
      desc: 'End-to-end encrypted streams, SOC2-compliant infrastructure, and GDPR-ready data handling.',
    },
    {
      icon: <Globe className="text-emerald-400" size={22} />,
      title: 'Global Edge Network',
      desc: '50+ data centers worldwide for sub-20ms latency wherever you are.',
    },
    {
      icon: <Cpu className="text-orange-400" size={22} />,
      title: 'GPU Compute',
      desc: 'Rent professional-grade GPUs for AI training, 3D rendering, and scientific workloads.',
    },
  ];

  const gpuTiers = [
    { name: 'CloudPlay Entry', model: 'RTX 3060', price: '$0.49', per: '/hr', color: 'from-gray-700 to-gray-600', tag: 'Budget' },
    { name: 'CloudPlay Pro', model: 'RTX 4070', price: '$0.89', per: '/hr', color: 'from-blue-700 to-blue-600', tag: 'Popular' },
    { name: 'CloudPlay Ultra', model: 'RTX 4090', price: '$1.99', per: '/hr', color: 'from-cyan-700 to-cyan-600', tag: 'Premium' },
    { name: 'CloudPlay AI', model: 'H100 SXM5', price: '$4.99', per: '/hr', color: 'from-violet-700 to-violet-600', tag: 'Enterprise' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* BG effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Now streaming 200+ games at 4K 60fps
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-6">
            Play AAA Games
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Anywhere, Instantly
            </span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            No downloads, no hardware limits. Stream the world's best games from any device.
            Try every game free for 5 minutes, then choose a plan that fits you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(user ? 'games' : 'auth')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-base hover:from-cyan-400 hover:to-blue-500 transition-all shadow-2xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
            >
              <Play size={18} fill="white" />
              Start Playing Free
            </button>
            <button
              onClick={() => navigate('gpu-rentals')}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold text-base hover:bg-white/10 hover:text-white transition-all"
            >
              <Cpu size={18} />
              Rent a GPU
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 mt-10">
            <div className="flex -space-x-2">
              {['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-950" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="text-yellow-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-gray-500 text-xs">Trusted by 50M+ gamers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Games */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Featured Games</h2>
              <p className="text-gray-500 text-sm">Try every game free for 5 minutes</p>
            </div>
            <button
              onClick={() => navigate('games')}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              View all games <ChevronRight size={16} />
            </button>
          </div>

          {featuredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredGames.map((game) => (
                <GameCard key={game.id} game={game} size="large" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-gray-900 border border-white/5 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Why CloudPlay?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Built from the ground up for the best cloud gaming experience on the planet.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 p-6 rounded-xl bg-gray-900 border border-white/5 hover:border-white/10 transition-all">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GPU Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-4">
              <Cpu size={12} /> Professional GPU Compute
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Cloud GPUs for Every Workload</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From casual gaming to enterprise AI training. Provision a GPU in seconds.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gpuTiers.map((gpu) => (
              <div key={gpu.name} className="relative p-5 rounded-xl bg-gray-900 border border-white/5 hover:border-white/10 transition-all group">
                <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r ${gpu.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${gpu.color} text-white`}>
                    {gpu.tag}
                  </span>
                </div>
                <div className="text-white font-bold text-sm mb-0.5">{gpu.name}</div>
                <div className="text-gray-500 text-xs mb-4">{gpu.model}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-white font-black text-2xl">{gpu.price}</span>
                  <span className="text-gray-500 text-xs">{gpu.per}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => navigate('gpu-rentals')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 hover:text-white transition-all"
            >
              See full GPU specs & plans <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-10 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 pointer-events-none" />
            <h2 className="text-3xl font-black text-white mb-3">Ready to Play?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Create a free account and get 5 minutes to try every game in our library — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                onClick={() => navigate(user ? 'games' : 'auth')}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
              >
                Create Free Account
              </button>
            </div>
            <div className="flex items-center justify-center gap-6 text-gray-500 text-xs">
              {['No credit card required', 'Cancel anytime', '5-min free trial on all games'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-400" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
