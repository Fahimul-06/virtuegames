import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Star, Users, Play, Clock, Check, AlertCircle, Tag, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import type { Game, GameScreenshot, GamePlan, UserGameSubscription, GameSession } from '../lib/types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import SessionTimer from '../components/SessionTimer';

interface GameDetailProps {
  gameId: string;
}

export default function GameDetail({ gameId }: GameDetailProps) {
  const { navigate } = useApp();
  const { user, profile, refreshProfile } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [screenshots, setScreenshots] = useState<GameScreenshot[]>([]);
  const [plans, setPlans] = useState<GamePlan[]>([]);
  const [subscription, setSubscription] = useState<UserGameSubscription | null>(null);
  const [trialSession, setTrialSession] = useState<GameSession | null>(null);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<GamePlan | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [trialExpired, setTrialExpired] = useState(false);
  const [screenshotIdx, setScreenshotIdx] = useState(0);
  const [sessionEndLoading, setSessionEndLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [gameRes, ssRes, plansRes] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).maybeSingle(),
      supabase.from('game_screenshots').select('*').eq('game_id', gameId).order('sort_order'),
      supabase.from('game_plans').select('*').eq('game_id', gameId),
    ]);
    setGame(gameRes.data);
    setScreenshots(ssRes.data ?? []);
    setPlans(plansRes.data ?? []);

    if (user) {
      const [subRes, sessionsRes] = await Promise.all([
        supabase
          .from('user_game_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('game_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setSubscription(subRes.data);

      const sessions = sessionsRes.data ?? [];
      const active = sessions.find((s) => s.status === 'active');
      const trial = sessions.find((s) => s.is_trial);

      setActiveSession(active ?? null);
      setTrialSession(trial ?? null);
      if (trial && trial.duration_seconds >= 300) setTrialExpired(true);
    }
    setLoading(false);
  }, [gameId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const canPlay = subscription?.is_active || (trialSession && !trialExpired && activeSession?.status === 'active');
  const hasUsedTrial = !!trialSession;

  const startSession = async (isTrial: boolean) => {
    if (!user) { navigate('auth'); return; }
    try {
      const data = await apiRequest('/cloud/game-sessions/start', {
        method: 'POST',
        body: JSON.stringify({ game_id: gameId, is_trial: isTrial }),
      });
      setActiveSession(data);
      if (isTrial) setTrialSession(data);
      navigate('stream', gameId, data);
    } catch (err: any) {
      setPurchaseError(err.message || 'Could not launch game session.');
      if (!isTrial) setPurchaseModal(true);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setSessionEndLoading(true);
    const started = new Date(activeSession.started_at).getTime();
    const duration = Math.floor((Date.now() - started) / 1000);
    await apiRequest(`/cloud/game-sessions/${activeSession.id}/end`, {
      method: 'POST',
      body: JSON.stringify({ status: 'ended', duration_seconds: duration }),
    }).catch(async () => {
      await supabase
        .from('game_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString(), duration_seconds: duration })
        .eq('id', activeSession.id);
    });
    setActiveSession(null);
    setSessionEndLoading(false);
  };

  const handleTrialExpire = async () => {
    setTrialExpired(true);
    if (activeSession) {
      await supabase
        .from('game_sessions')
        .update({ status: 'expired', ended_at: new Date().toISOString(), duration_seconds: 300 })
        .eq('id', activeSession.id);
      setActiveSession(null);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !user || !profile) return;
    if (profile.wallet_balance < selectedPlan.price) {
      setPurchaseError('Insufficient wallet balance. Please add funds.');
      return;
    }
    setPurchaseLoading(true);
    setPurchaseError('');

    const expiresAt =
      selectedPlan.plan_type === 'hourly'
        ? new Date(Date.now() + 3600 * 1000).toISOString()
        : selectedPlan.plan_type === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const { error: subError } = await supabase.from('user_game_subscriptions').insert({
      game_id: gameId,
      plan_type: selectedPlan.plan_type,
      amount_paid: selectedPlan.price,
      expires_at: expiresAt,
    });
    if (subError) { setPurchaseError('Purchase failed. Please try again.'); setPurchaseLoading(false); return; }

    const newBalance = profile.wallet_balance - selectedPlan.price;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
    await supabase.from('wallet_transactions').insert({
      type: 'debit',
      amount: selectedPlan.price,
      description: `${game?.title} — ${selectedPlan.plan_type} access`,
      reference_type: 'game_subscription',
      balance_after: newBalance,
    });

    await refreshProfile();
    setPurchaseLoading(false);
    setPurchaseModal(false);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center text-gray-500">
        Game not found.
      </div>
    );
  }

  const planLabels: Record<string, string> = { hourly: '1 Hour', monthly: '30 Days', yearly: '1 Year' };
  const planDesc: Record<string, string> = { hourly: 'Perfect for a quick session', monthly: 'Most popular', yearly: 'Best value — save 33%' };

  return (
    <div className="min-h-screen bg-gray-950 pt-16 pb-16">
      {/* Banner */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        <img
          src={game.banner_url ?? game.thumbnail_url ?? ''}
          alt={game.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-transparent to-transparent" />

        {/* Active session indicator */}
        {activeSession && (
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <SessionTimer
              startedAt={activeSession.started_at}
              isTrial={activeSession.is_trial}
              onExpire={handleTrialExpire}
            />
            <button
              onClick={endSession}
              disabled={sessionEndLoading}
              className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-all"
            >
              End Session
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('games')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-3"
          >
            <ArrowLeft size={16} /> Back to Library
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                  {game.genre}
                </span>
                {game.is_featured && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium">
                    Featured
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-black text-white mb-2">{game.title}</h1>
              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Star size={14} fill="currentColor" />
                  <span className="font-semibold">{game.rating}</span>
                  <span className="text-gray-600">/10</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{(game.player_count_online / 1000).toFixed(1)}k</span> playing now
                </div>
                {game.developer && (
                  <div className="flex items-center gap-1.5">
                    <Tag size={14} />
                    {game.developer}
                  </div>
                )}
                {game.release_year && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {game.release_year}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-white font-semibold mb-3">About</h2>
              <p className="text-gray-400 leading-relaxed">{game.description}</p>
              {game.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {game.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg bg-gray-800 border border-white/5 text-gray-400 text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Screenshots */}
            {screenshots.length > 0 && (
              <div>
                <h2 className="text-white font-semibold mb-3">Screenshots</h2>
                <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
                  <img
                    src={screenshots[screenshotIdx]?.url}
                    alt={screenshots[screenshotIdx]?.caption ?? ''}
                    className="w-full h-full object-cover"
                  />
                  {screenshots.length > 1 && (
                    <>
                      <button
                        onClick={() => setScreenshotIdx((i) => (i - 1 + screenshots.length) % screenshots.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setScreenshotIdx((i) => (i + 1) % screenshots.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {screenshots.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setScreenshotIdx(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === screenshotIdx ? 'bg-white w-4' : 'bg-white/40'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {screenshots[screenshotIdx]?.caption && (
                  <p className="text-gray-600 text-xs mt-2 text-center">{screenshots[screenshotIdx].caption}</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Play card */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
              <img
                src={game.thumbnail_url ?? ''}
                alt={game.title}
                className="w-full h-40 object-cover rounded-xl mb-5"
              />

              {trialExpired && !subscription && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs mb-4">
                  <AlertCircle size={14} />
                  Your 5-minute free trial has ended. Purchase access to keep playing.
                </div>
              )}

              {subscription ? (
                <div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-4">
                    <Check size={14} />
                    <span>
                      Active {subscription.plan_type} subscription
                      {subscription.expires_at && (
                        <> · expires {new Date(subscription.expires_at).toLocaleDateString()}</>
                      )}
                    </span>
                  </div>
                  {activeSession ? (
                    <button
                      onClick={endSession}
                      disabled={sessionEndLoading}
                      className="w-full py-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-all"
                    >
                      End Session
                    </button>
                  ) : (
                    <button
                      onClick={() => startSession(false)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                    >
                      <Play size={18} fill="white" /> Play Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {!hasUsedTrial && !activeSession && (
                    <button
                      onClick={() => user ? startSession(true) : navigate('auth')}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                    >
                      <Play size={18} fill="white" />
                      {user ? 'Play Free (5 min trial)' : 'Sign In to Play Free'}
                    </button>
                  )}
                  {activeSession && activeSession.is_trial && (
                    <button
                      onClick={endSession}
                      disabled={sessionEndLoading}
                      className="w-full py-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/30 transition-all"
                    >
                      End Trial Session
                    </button>
                  )}
                  <button
                    onClick={() => user ? setPurchaseModal(true) : navigate('auth')}
                    className={`w-full py-3.5 rounded-xl border font-semibold text-sm transition-all ${
                      trialExpired
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-transparent text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {user ? 'Purchase Access' : 'Sign Up to Purchase'}
                  </button>
                </div>
              )}

              {/* Plan prices preview */}
              {plans.length > 0 && !subscription && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  {plans.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 capitalize">{planLabels[p.plan_type]}</span>
                      <span className="text-white font-semibold">${p.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Game info */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
              {[
                { label: 'Developer', value: game.developer },
                { label: 'Publisher', value: game.publisher },
                { label: 'Genre', value: game.genre },
                { label: 'Released', value: game.release_year?.toString() },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">{row.label}</span>
                  <span className="text-gray-300 text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      <Modal open={purchaseModal} onClose={() => { setPurchaseModal(false); setPurchaseError(''); }} title={`Purchase Access — ${game.title}`} size="md">
        <div className="p-6 space-y-4">
          {purchaseError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={14} />
              {purchaseError}
              {purchaseError.includes('balance') && (
                <button
                  onClick={() => { setPurchaseModal(false); navigate('wallet'); }}
                  className="ml-auto text-xs underline"
                >
                  Add funds
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Wallet balance</span>
            <span className="text-emerald-400 font-semibold">${(profile?.wallet_balance ?? 0).toFixed(2)}</span>
          </div>

          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-white/10 bg-gray-800 hover:border-white/20'
                }`}
              >
                <div className="text-left">
                  <div className="text-white font-semibold text-sm capitalize">{planLabels[plan.plan_type]}</div>
                  <div className="text-gray-500 text-xs">{planDesc[plan.plan_type]}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">${plan.price.toFixed(2)}</div>
                  {selectedPlan?.id === plan.id && <Check size={14} className="text-cyan-400 ml-auto mt-1" />}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handlePurchase}
            disabled={!selectedPlan || purchaseLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purchaseLoading ? 'Processing...' : selectedPlan ? `Pay $${selectedPlan.price.toFixed(2)}` : 'Select a Plan'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
