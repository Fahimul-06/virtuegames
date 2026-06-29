import { Zap, Github, Twitter, Monitor, Cpu, HelpCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Page } from '../lib/types';

export default function Footer() {
  const { navigate } = useApp();

  const links: { label: string; page: Page }[][] = [
    [
      { label: 'Cloud Gaming', page: 'games' },
      { label: 'GPU Rentals', page: 'gpu-rentals' },
    ],
    [
      { label: 'Dashboard', page: 'dashboard' },
      { label: 'Support', page: 'support' },
    ],
  ];

  return (
    <footer className="bg-gray-950 border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">
                Cloud<span className="text-cyan-400">Play</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              The world's most powerful cloud gaming and GPU compute platform. Play anywhere, render anything.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <Twitter size={14} />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <Github size={14} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              {links[0].map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Account</h4>
            <ul className="space-y-2">
              {links[1].map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">© 2024 CloudPlay. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">Privacy</a>
            <a href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">Terms</a>
            <a href="#" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
