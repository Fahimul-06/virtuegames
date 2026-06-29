import { useEffect, useState } from 'react';
import { Cpu, Zap, MemoryStick, AlertCircle, Check, ChevronDown, ChevronUp, Server, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GpuType, GpuPlan, GpuRental } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/Modal';

type WorkloadType = 'gaming' | 'ai-training' | 'ai-inference' | 'rendering' | '3d-modeling' | 'video-editing' | 'programming' | 'hpc';

const WORKLOADS: { value: WorkloadType; label: string }[] = [
  { value: 'gaming', label: 'Cloud Gaming' },
  { value: 'ai-training', label: 'AI Training' },
  { value: 'ai-inference', label: 'AI Inference' },
  { value: 'rendering', label: '3D Rendering' },
  { value: '3d-modeling', label: '3D Modeling' },
  { value: 'video-editing', label: 'Video Editing' },
  { value: 'programming', label: 'Programming / Dev' },
  { value: 'hpc', label: 'HPC / Scientific' },
];

const TIER_STYLES: Record<string, { badge: string; border: string; glow: string; label: string }> = {
  budget: { badge: 'bg-gray-600 text-gray-200', border: 'border-gray-600/30 hover:border-gray-500/50', glow: '', label: 'Budget' },
  standard: { badge: 'bg-blue-600 text-white', border: 'border-blue-500/30 hover:border-blue-400/50', glow: 'hover:shadow-blue-500/10', label: 'Standard' },
  premium: { badge: 'bg-cyan-600 text-white', border: 'border-cyan-500/30 hover:border-cyan-400/50', glow: 'hover:shadow-cyan-500/10', label: 'Premium' },
  enterprise: { badge: 'bg-orange-600 text-white', border: 'border-orange-500/30 hover:border-orange-400/50', glow: 'hover:shadow-orange-500/10', label: 'Enterprise' },
};

export default function GPURentals() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigate } = useApp();
  const [gpus, setGpus] = useState<GpuType[]>([]);
  const [plans, setPlans] = useState<GpuPlan[]>([]);
  const [myRentals, setMyRentals] = useState<GpuRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGpu, setExpandedGpu] = useState<string | null>(null);
  const [rentModal, setRentModal] = useState<{ gpu: GpuType; plan: GpuPlan } | null>(null);
  const [workload, setWorkload] = useState<WorkloadType>('gaming');
  const [rentLoading, setRentLoading] = useState(false);
  const [rentError, setRentError] = useState('');
  const [rentSuccess, setRentSuccess] = useState('');
  const [filterTier, setFilterTier] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('gpu_types').select('*').order('stock_count', { ascending: false }),
      supabase.from('gpu_plans').select('*'),
    ]).then(([gpuRes, planRes]) => {
      setGpus(gpuRes.data ?? []);
      setPlans(planRes.data ?? []);
      setLoading(false);
    });

    if (user) {
      supabase
        .from('gpu_rentals')
        .select('*, gpu_type:gpu_types(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .then(({ data }) => setMyRentals((data as GpuRental[]) ?? []));
    }
  }, [user]);

  const getGpuPlans = (gpuId: string) => plans.filter((p) => p.gpu_type_id === gpuId);

  const handleRent = async () => {
    if (!rentModal || !user || !profile) return;
    const { gpu, plan } = rentModal;
    if (profile.wallet_balance < plan.price) {
      setRentError('Insufficient wallet balance. Please add funds to your wallet.');
      return;
    }
    setRentLoading(true);
    setRentError('');

    const expiresAt =
      plan.plan_type === 'hourly'
        ? new Date(Date.now() + 3600 * 1000).toISOString()
        : plan.plan_type === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const connectionInfo = {
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      port: 5900 + Math.floor(Math.random() * 100),
      region: 'us-east-1',
      hostname: `gpu-${Math.random().toString(36).slice(2, 8)}.cloudplay.io`,
    };

    const { error: rentalError } = await supabase.from('gpu_rentals').insert({
      gpu_type_id: gpu.id,
      plan_type: plan.plan_type,
      workload_type: workload,
      amount_paid: plan.price,
      expires_at: expiresAt,
      status: 'running',
      connection_info: connectionInfo,
    });

    if (rentalError) { setRentError('Rental failed. Please try again.'); setRentLoading(false); return; }

    const newBalance = profile.wallet_balance - plan.price;
    await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
    await supabase.from('wallet_transactions').insert({
      type: 'debit',
      amount: plan.price,
      description: `${gpu.name} (${gpu.model}) — ${plan.plan_type} rental`,
      reference_type: 'gpu_rental',
      balance_after: newBalance,
    });

    await refreshProfile();
    setRentSuccess(`${gpu.name} provisioned successfully! Your GPU is ready.`);
    setRentLoading(false);
    setTimeout(() => { setRentModal(null); setRentSuccess(''); navigate('dashboard'); }, 2000);
  };

  const tiers = ['all', 'budget', 'standard', 'premium', 'enterprise'];
  const filteredGpus = filterTier === 'all' ? gpus : gpus.filter((g) => g.tier === filterTier);

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-4">
            <Cpu size={12} /> Bare-metal GPU instances — no virtualization overhead
          </div>
          <h1 className="text-4xl font-black text-white mb-2">GPU Rentals</h1>
          <p className="text-gray-500 max-w-xl">
            Provision professional-grade GPUs in seconds. Pay only for what you use.
          </p>
        </div>

        {/* Active rentals */}
        {myRentals.length > 0 && (
          <div className="mb-10 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              Your Active GPUs ({myRentals.length})
            </h3>
            <div className="space-y-3">
              {myRentals.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-900 border border-white/5">
                  <div>
                    <div className="text-white text-sm font-medium">{r.gpu_type?.name ?? 'GPU'}</div>
                    <div className="text-gray-500 text-xs">
                      {r.workload_type} · expires {r.expires_at ? new Date(r.expires_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Running
                    </span>
                    <span className="text-gray-500 text-xs font-mono">
                      {(r.connection_info as Record<string, string>)?.hostname ?? ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier filter */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
                filterTier === t
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-900 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {t === 'all' ? 'All Tiers' : t}
            </button>
          ))}
        </div>

        {/* GPU Cards */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-900 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGpus.map((gpu) => {
              const tier = TIER_STYLES[gpu.tier] ?? TIER_STYLES.budget;
              const gpuPlans = getGpuPlans(gpu.id);
              const isExpanded = expandedGpu === gpu.id;

              return (
                <div
                  key={gpu.id}
                  className={`bg-gray-900 border rounded-2xl overflow-hidden hover:shadow-xl transition-all ${tier.border} ${tier.glow}`}
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                        <img src={gpu.thumbnail_url ?? ''} alt={gpu.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-white font-bold text-lg">{gpu.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tier.badge}`}>{tier.label}</span>
                          {!gpu.is_available && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600/20 text-red-400">Out of Stock</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm font-medium mb-1">{gpu.model}</div>
                        <p className="text-gray-500 text-sm line-clamp-1">{gpu.description}</p>
                      </div>

                      {/* Specs */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-white font-bold text-lg">{gpu.vram_gb}GB</div>
                          <div className="text-gray-600 text-xs">VRAM</div>
                        </div>
                        {gpu.tflops && (
                          <div className="text-center">
                            <div className="text-white font-bold text-lg">{gpu.tflops >= 100 ? Math.round(gpu.tflops) : gpu.tflops}</div>
                            <div className="text-gray-600 text-xs">TFLOPS</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-white font-bold text-lg">{gpu.stock_count}</div>
                          <div className="text-gray-600 text-xs">Available</div>
                        </div>
                        <button
                          onClick={() => setExpandedGpu(isExpanded ? null : gpu.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
                        >
                          {isExpanded ? 'Less' : 'Rent'}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/5 p-6 bg-gray-900/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Specs detail */}
                        <div>
                          <h4 className="text-white font-medium text-sm mb-3">Full Specifications</h4>
                          <div className="space-y-2">
                            {[
                              { label: 'Model', value: gpu.model },
                              { label: 'VRAM', value: `${gpu.vram_gb} GB` },
                              { label: 'CUDA Cores', value: gpu.cuda_cores?.toLocaleString() },
                              { label: 'Memory BW', value: gpu.memory_bandwidth_gbps ? `${gpu.memory_bandwidth_gbps} GB/s` : undefined },
                              { label: 'Performance', value: gpu.tflops ? `${gpu.tflops} TFLOPS` : undefined },
                            ].filter((r) => r.value).map((r) => (
                              <div key={r.label} className="flex justify-between text-sm">
                                <span className="text-gray-500">{r.label}</span>
                                <span className="text-gray-300 font-medium">{r.value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4">
                            <h4 className="text-white font-medium text-sm mb-2">Best For</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {gpu.use_cases.map((uc) => (
                                <span key={uc} className="px-2 py-0.5 rounded-lg bg-gray-800 border border-white/5 text-gray-400 text-xs capitalize">
                                  {uc.replace(/-/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Plans */}
                        <div>
                          <h4 className="text-white font-medium text-sm mb-3">Select Plan</h4>
                          <div className="space-y-2">
                            {gpuPlans.map((plan) => (
                              <button
                                key={plan.id}
                                onClick={() => gpu.is_available ? (user ? setRentModal({ gpu, plan }) : navigate('auth')) : undefined}
                                disabled={!gpu.is_available}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                  gpu.is_available
                                    ? 'border-white/10 bg-gray-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 cursor-pointer'
                                    : 'border-white/5 bg-gray-800/50 opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <div className="text-left">
                                  <div className="text-white text-sm font-medium capitalize">
                                    {plan.plan_type === 'hourly' ? 'Pay Per Hour' : plan.plan_type === 'monthly' ? 'Monthly' : 'Yearly'}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    {plan.plan_type === 'hourly' ? 'Billed hourly, cancel anytime' : plan.plan_type === 'monthly' ? '30 days unlimited access' : '365 days — best value'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-white font-bold">${plan.price.toFixed(2)}</div>
                                  <div className="text-gray-600 text-xs">/{plan.plan_type === 'hourly' ? 'hr' : plan.plan_type === 'monthly' ? 'mo' : 'yr'}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rent Modal */}
      <Modal
        open={!!rentModal}
        onClose={() => { setRentModal(null); setRentError(''); setRentSuccess(''); }}
        title="Confirm GPU Rental"
        size="md"
      >
        {rentModal && (
          <div className="p-6 space-y-5">
            {rentSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <Check size={14} /> {rentSuccess}
              </div>
            )}
            {rentError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={14} />
                {rentError}
                {rentError.includes('balance') && (
                  <button onClick={() => { setRentModal(null); navigate('wallet'); }} className="ml-auto text-xs underline">
                    Add funds
                  </button>
                )}
              </div>
            )}

            <div className="p-4 rounded-xl bg-gray-800 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <Server size={18} className="text-cyan-400" />
                <div>
                  <div className="text-white font-semibold">{rentModal.gpu.name}</div>
                  <div className="text-gray-500 text-xs">{rentModal.gpu.model} · {rentModal.gpu.vram_gb}GB VRAM</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Plan</span>
                  <div className="text-white font-medium capitalize">{rentModal.plan.plan_type}</div>
                </div>
                <div>
                  <span className="text-gray-500">Cost</span>
                  <div className="text-white font-bold">${rentModal.plan.price.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Workload Type</label>
              <select
                value={workload}
                onChange={(e) => setWorkload(e.target.value as WorkloadType)}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                {WORKLOADS.filter((w) => rentModal.gpu.use_cases.some((uc) => uc === w.value) || w.value === 'gaming').map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Wallet balance</span>
              <span className={`font-semibold ${(profile?.wallet_balance ?? 0) >= rentModal.plan.price ? 'text-emerald-400' : 'text-red-400'}`}>
                ${(profile?.wallet_balance ?? 0).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleRent}
              disabled={rentLoading || !!rentSuccess}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rentLoading ? 'Provisioning...' : `Confirm & Pay $${rentModal.plan.price.toFixed(2)}`}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
