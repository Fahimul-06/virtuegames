import { useState } from 'react';
import { Monitor, Cpu, LayoutDashboard, Wallet, HelpCircle, LogOut, Menu, X, Zap, ChevronDown, User, Settings, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import type { Page } from '../lib/types';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { currentPage, navigate } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks: { label: string; page: Page; icon?: React.ReactNode }[] = [
    { label: 'Games', page: 'games', icon: <Monitor size={16} /> },
    { label: 'GPU Rentals', page: 'gpu-rentals', icon: <Cpu size={16} /> },
  ];

  const handleNav = (page: Page) => {
    navigate(page);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('landing');
    setUserMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNav('landing')}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Cloud<span className="text-cyan-400">Play</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === link.page
                    ? 'text-cyan-400 bg-cyan-400/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.icon}
                {link.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => handleNav('wallet')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all"
                >
                  <Wallet size={14} />
                  ${(profile?.wallet_balance ?? 0).toFixed(2)}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {(profile?.username ?? profile?.full_name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-24 truncate">{profile?.username ?? 'User'}</span>
                    <ChevronDown size={14} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-gray-900 border border-white/10 shadow-xl shadow-black/50 overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-white text-sm font-medium truncate">{profile?.username ?? 'User'}</p>
                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { label: 'Dashboard', page: 'dashboard' as Page, icon: <LayoutDashboard size={14} /> },
                          { label: 'Wallet', page: 'wallet' as Page, icon: <Wallet size={14} /> },
                          { label: 'Support', page: 'support' as Page, icon: <HelpCircle size={14} /> },
                        ].map((item) => (
                          <button
                            key={item.page}
                            onClick={() => { handleNav(item.page); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        ))}
                        {profile?.is_admin && (
                          <button
                            onClick={() => { handleNav('admin'); setUserMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-amber-400 hover:text-amber-300 hover:bg-white/5 transition-all"
                          >
                            <Shield size={14} />
                            Admin Panel
                          </button>
                        )}
                        <div className="border-t border-white/5 mt-1 pt-1">
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-all"
                          >
                            <LogOut size={14} />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('auth')}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('auth')}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu btn */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-950/95 border-t border-white/5 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => handleNav(link.page)}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                currentPage === link.page ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.icon} {link.label}
            </button>
          ))}
          {user ? (
            <>
              <button onClick={() => handleNav('dashboard')} className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button onClick={() => handleNav('wallet')} className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-emerald-400 hover:bg-white/5 transition-all">
                <Wallet size={16} /> Wallet — ${(profile?.wallet_balance ?? 0).toFixed(2)}
              </button>
              <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-white/5 transition-all">
                <LogOut size={16} /> Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => handleNav('auth')} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold text-center">
              Sign In / Get Started
            </button>
          )}
        </div>
      )}

      {/* Overlay to close user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </nav>
  );
}
