import { useEffect, useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, TrendingUp, AlertCircle, Check, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WalletTransaction } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/Modal';

const ADD_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function WalletPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigate } = useApp();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const loadTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadTransactions(); }, [user]);

  const handleAddFunds = async () => {
    const amount = selectedAmount ?? parseFloat(customAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      setAddError('Please enter a valid amount between $1 and $10,000.');
      return;
    }
    if (!user || !profile) return;
    setAddLoading(true);
    setAddError('');

    const newBalance = profile.wallet_balance + amount;
    const { error } = await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
    if (error) { setAddError('Failed to add funds. Please try again.'); setAddLoading(false); return; }

    await supabase.from('wallet_transactions').insert({
      type: 'credit',
      amount,
      description: `Funds added via payment`,
      reference_type: 'deposit',
      balance_after: newBalance,
    });

    await refreshProfile();
    await loadTransactions();
    setAddSuccess(`$${amount.toFixed(2)} added to your wallet!`);
    setAddLoading(false);
    setTimeout(() => { setAddModal(false); setAddSuccess(''); setSelectedAmount(null); setCustomAmount(''); }, 2000);
  };

  const totalCredits = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to manage your wallet.</p>
          <button onClick={() => navigate('auth')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="py-10">
          <h1 className="text-4xl font-black text-white mb-1">Wallet</h1>
          <p className="text-gray-500 text-sm">Manage funds for games and GPU rentals.</p>
        </div>

        {/* Balance card */}
        <div className="relative p-8 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
              <Wallet size={16} />
              Available Balance
            </div>
            <div className="text-5xl font-black text-white mb-6">
              ${(profile?.wallet_balance ?? 0).toFixed(2)}
            </div>
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
            >
              <Plus size={16} /> Add Funds
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-gray-900 border border-white/5">
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-2">
              <ArrowDownLeft size={14} />
              Total Added
            </div>
            <div className="text-2xl font-black text-white">${totalCredits.toFixed(2)}</div>
          </div>
          <div className="p-5 rounded-2xl bg-gray-900 border border-white/5">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
              <ArrowUpRight size={14} />
              Total Spent
            </div>
            <div className="text-2xl font-black text-white">${totalDebits.toFixed(2)}</div>
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400" />
            Transaction History
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-800 animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10">
              <DollarSign size={32} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No transactions yet.</p>
              <button onClick={() => setAddModal(true)} className="mt-3 text-cyan-400 text-sm hover:text-cyan-300">
                Add funds to get started →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-800 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{tx.description}</div>
                      <div className="text-gray-600 text-xs">{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </div>
                    {tx.balance_after !== null && (
                      <div className="text-gray-600 text-xs">bal. ${tx.balance_after.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Funds Modal */}
      <Modal open={addModal} onClose={() => { setAddModal(false); setAddError(''); setAddSuccess(''); setSelectedAmount(null); setCustomAmount(''); }} title="Add Funds" size="sm">
        <div className="p-6 space-y-5">
          {addSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <Check size={14} /> {addSuccess}
            </div>
          )}
          {addError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={14} /> {addError}
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-3">Select Amount</label>
            <div className="grid grid-cols-3 gap-2">
              {ADD_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    selectedAmount === amt
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-white/10 bg-gray-800 text-gray-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-medium mb-1.5">Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                placeholder="Enter amount"
                className="w-full bg-gray-800 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 py-1">
            <span>Amount to add</span>
            <span className="text-white font-semibold">
              ${(selectedAmount ?? (parseFloat(customAmount) || 0)).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleAddFunds}
            disabled={addLoading || (!selectedAmount && !customAmount) || !!addSuccess}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addLoading ? 'Processing...' : 'Add Funds'}
          </button>

          <p className="text-gray-600 text-xs text-center">
            This is a demo platform. No real payment is processed.
          </p>
        </div>
      </Modal>
    </div>
  );
}
