import { useState } from 'react';
import { Zap, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const { navigate } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) { setError(error); return; }
        navigate('games');
      } else {
        if (!username.trim()) { setError('Username is required.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        const { error } = await signUp(email, password, username);
        if (error) { setError(error); return; }
        setSuccess('Account created! Signing you in...');
        setTimeout(() => navigate('games'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 pt-16">
      {/* BG */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('landing')} className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">Cloud<span className="text-cyan-400">Play</span></span>
          </button>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/50">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
              <CheckCircle size={16} className="flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-1.5">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                    className="w-full bg-gray-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-gray-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  required
                  className="w-full bg-gray-800 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-gray-600 text-xs text-center mt-4">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
