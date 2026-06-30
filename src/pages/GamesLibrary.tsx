import { useEffect, useState } from 'react';
import { Search, Filter, Grid, List, Users, Star, Gamepad2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Game } from '../lib/types';
import GameCard from '../components/GameCard';

export default function GamesLibrary() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'players' | 'title'>('rating');

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        setGames(data ?? []);
        setLoading(false);
      });
  }, []);

  const genres = ['All', ...Array.from(new Set(games.map((g) => g.genre)))];

  const filtered = games
    .filter((g) => {
      const q = search.toLowerCase();
      const matchSearch = !q || g.title.toLowerCase().includes(q) || (g.genre || '').toLowerCase().includes(q);
      const matchGenre = selectedGenre === 'All' || g.genre === selectedGenre;
      return matchSearch && matchGenre;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'players') return b.player_count_online - a.player_count_online;
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="py-10">
          <h1 className="text-4xl font-black text-white mb-2">Game Library</h1>
          <p className="text-gray-500">Try every game free for 5 minutes — no credit card required.</p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-6 mb-8 p-4 rounded-xl bg-gray-900 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Gamepad2 size={16} className="text-cyan-400" />
            <span className="font-medium text-white">{games.length}</span> games
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Users size={16} className="text-emerald-400" />
            <span className="font-medium text-white">
              {(games.reduce((s, g) => s + g.player_count_online, 0) / 1000).toFixed(0)}k
            </span>{' '}
            online now
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Star size={16} className="text-yellow-400" />
            <span className="font-medium text-white">
              {games.length ? (games.reduce((s, g) => s + g.rating, 0) / games.length).toFixed(1) : '—'}
            </span>{' '}
            avg rating
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2.5 text-gray-300 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="rating">Sort: Rating</option>
              <option value="players">Sort: Players</option>
              <option value="title">Sort: Name</option>
            </select>
          </div>
        </div>

        {/* Genre tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedGenre === genre
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-900 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-gray-900 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No games found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} size="large" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
