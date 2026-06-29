import { useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import AuthPage from './pages/AuthPage';
import GamesLibrary from './pages/GamesLibrary';
import GameDetail from './pages/GameDetail';
import GPURentals from './pages/GPURentals';
import Dashboard from './pages/Dashboard';
import WalletPage from './pages/WalletPage';
import SupportPage from './pages/SupportPage';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
  const { currentPage, selectedGameId } = useApp();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading CloudPlay...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'landing': return <Landing />;
      case 'auth': return <AuthPage />;
      case 'games': return <GamesLibrary />;
      case 'game-detail': return selectedGameId ? <GameDetail gameId={selectedGameId} /> : <GamesLibrary />;
      case 'gpu-rentals': return <GPURentals />;
      case 'dashboard': return <Dashboard />;
      case 'wallet': return <WalletPage />;
      case 'support': return <SupportPage />;
      case 'admin': return <AdminDashboard />;
      default: return <Landing />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        {renderPage()}
      </main>
      {currentPage !== 'auth' && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
