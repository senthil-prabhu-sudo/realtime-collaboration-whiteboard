import { useEffect, useState } from 'react';
import { Plus, Share2, Lock, Globe } from 'lucide-react';
import { api } from '../lib/api';

interface Session {
  id: string;
  name: string;
  createdAt: string;
  isPublic: boolean;
  creatorId: string;
}

interface SessionListProps {
  userId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  currentSessionId?: string;
}

export function SessionList({
  userId,
  onSelectSession,
  onCreateSession,
  currentSessionId,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------
     Load sessions
  --------------------------------------------- */
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const data = await api<Session[]>('/sessions');
        setSessions(data);
      } catch (error) {
        console.error('Failed to load sessions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  /* ---------------------------------------------
     Handlers
  --------------------------------------------- */
  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Delete this session?')) return;

    try {
      await api<void>(`/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // If user deleted the active session, reset view
      if (sessionId === currentSessionId) {
        onSelectSession('');
      }
    } catch (error) {
      console.error('Failed to delete session', error);
    }
  };

  const handleCopyLink = async (sessionId: string) => {
    try {
      const link = `${window.location.origin}?session=${sessionId}`;
      await navigator.clipboard.writeText(link);
    } catch {
      console.error('Clipboard copy failed');
    }
  };

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-slate-400">Loading sessions...</p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-slate-500" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No Sessions Yet</h4>
            <p className="text-slate-400 mb-6 text-sm">Create your first whiteboard session</p>
            <button
              onClick={onCreateSession}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
            >
              Create Session
            </button>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = currentSessionId === session.id;

            return (
              <div
                key={session.id}
                className={`rounded-xl transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-400 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50'
                }`}
              >
                <div
                  onClick={() => onSelectSession(session.id)}
                  className="p-4 relative"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <h4 className={`font-semibold text-sm truncate flex-1 ${
                      isActive ? 'text-white' : 'text-slate-200'
                    }`}>
                      {session.name}
                    </h4>
                    {isActive && (
                      <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium border border-green-500/30 whitespace-nowrap mr-20">
                        Active
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-3">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {session.isPublic ? (
                        <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30 whitespace-nowrap">
                          <Globe className="w-3 h-3" />
                          Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded-full border border-slate-500/30 whitespace-nowrap">
                          <Lock className="w-3 h-3" />
                          Private
                        </span>
                      )}
                    </div>

                    {/* Copy link button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(session.id);
                      }}
                      className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-600/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy session link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
