import { createContext, useContext, useState, ReactNode } from 'react';
import type { Page } from '../lib/types';

interface AppContextValue {
  currentPage: Page;
  selectedGameId: string | null;
  selectedSessionId: string | null;
  navigate: (page: Page, gameId?: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const navigate = (page: Page, gameId?: string) => {
    setCurrentPage(page);
    if (gameId !== undefined) {
      if (page === 'cloud-player') setSelectedSessionId(gameId);
      else setSelectedGameId(gameId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppContext.Provider value={{ currentPage, selectedGameId, selectedSessionId, navigate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
