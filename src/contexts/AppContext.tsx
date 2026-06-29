import { createContext, useContext, useState, ReactNode } from 'react';
import type { Page } from '../lib/types';

interface AppContextValue {
  currentPage: Page;
  selectedGameId: string | null;
  selectedSession: any | null;
  navigate: (page: Page, gameId?: string, session?: any) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const navigate = (page: Page, gameId?: string, session?: any) => {
    setCurrentPage(page);
    if (gameId !== undefined) setSelectedGameId(gameId);
    if (session !== undefined) setSelectedSession(session);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppContext.Provider value={{ currentPage, selectedGameId, selectedSession, navigate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
