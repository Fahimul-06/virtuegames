import { Star, Users, Play } from 'lucide-react';
import type { Game } from '../lib/types';
import { useApp } from '../contexts/AppContext';

interface GameCardProps {
  game: Game;
  size?: 'normal' | 'large';
}

export default function GameCard({ game, size = 'normal' }: GameCardProps) {
  const { navigate } = useApp();

  const tierColors: Record<string, string> = {
    RPG: 'text-violet-400 bg-violet-400/10',
    FPS: 'text-red-400 bg-red-400/10',
    'Battle Royale': 'text-orange-400 bg-orange-400/10',
    MMORPG: 'text-blue-400 bg-blue-400/10',
    Racing: 'text-yellow-400 bg-yellow-400/10',
    Strategy: 'text-emerald-400 bg-emerald-400/10',
    'MOBA/Shooter': 'text-pink-400 bg-pink-400/10',
    Horror: 'text-gray-400 bg-gray-400/10',
  };

  const genreStyle = tierColors[game.genre] ?? 'text-cyan-400 bg-cyan-400/10';

  return (
    <button
      onClick={() => navigate('game-detail', game.id)}
      className={`group relative bg-gray-900 border border-white/5 rounded-xl overflow-hidden hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 text-left w-full ${size === 'large' ? 'flex flex-col' : ''}`}
    >
      <div className={`relative overflow-hidden ${size === 'large' ? 'h-52' : 'h-40'}`}>
        <img
          src={game.thumbnail_url ?? ''}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

        {game.is_featured && (
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg">
              Featured
            </span>
          </div>
        )}

        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Play size={14} className="text-white ml-0.5" fill="white" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${genreStyle}`}>
            {game.genre}
          </span>
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <Star size={11} fill="currentColor" />
            <span className="font-medium">{game.rating}</span>
          </div>
        </div>
        <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-cyan-300 transition-colors line-clamp-1">
          {game.title}
        </h3>
        {size === 'large' && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">{game.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Users size={11} />
            <span>{(game.player_count_online / 1000).toFixed(1)}k online</span>
          </div>
          <span className="text-cyan-400 text-xs font-medium">Free trial →</span>
        </div>
      </div>
    </button>
  );
}
