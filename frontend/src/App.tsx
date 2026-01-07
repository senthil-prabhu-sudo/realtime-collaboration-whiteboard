import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { Whiteboard } from './components/Whiteboard';
import { LandingPage } from './components/LandingPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  /* ---------------------------------------------
     Read session ID from URL (on first load)
  --------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, []);

  /* ---------------------------------------------
     Join session
  --------------------------------------------- */
  const handleJoinSession = (sessionId: string) => {
    // Hard reload ensures clean WebSocket + state
    window.location.href = `/?session=${sessionId}`;
  };

  /* ---------------------------------------------
     Back to landing
  --------------------------------------------- */
  const handleBackToLanding = () => {
    setCurrentSessionId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.pushState({}, '', url.toString());
  };

  /* ---------------------------------------------
     Loading screen
  --------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading Collaborative Whiteboard...</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------
     Auth gate
  --------------------------------------------- */
  if (!user) {
    return <AuthPage />;
  }

  /* ---------------------------------------------
     Whiteboard
  --------------------------------------------- */
  if (currentSessionId) {
    return <Whiteboard onBackToLanding={handleBackToLanding} />;
  }

  /* ---------------------------------------------
     Landing page
  --------------------------------------------- */
  return (
    <LandingPage
      onJoinSession={handleJoinSession}
    />
  );
}

export default function App() {
  return <AppContent />;
}
