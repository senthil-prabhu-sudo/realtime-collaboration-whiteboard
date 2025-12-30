import { useEffect, useRef, useState } from 'react';
import { Users, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface UserPresenceProps {
  sessionId: string;
  currentTool?: string;
}

interface PresenceRecord {
  sessionId: string;
  userId: string;
  lastSeen: string;
  cursorX?: number;
  cursorY?: number;
  currentTool?: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

const PRESENCE_TTL_MS = 45_000;

export function UserPresence({ sessionId, currentTool }: UserPresenceProps) {
  const { user, loading } = useAuth();

  const [presence, setPresence] = useState<PresenceRecord[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserProfile>>({});
  const [showUsers, setShowUsers] = useState(false);

  const cursorRef = useRef({ x: 0, y: 0 });

  /* ---------------------------------------------
     Cursor tracking (NO re-render)
  --------------------------------------------- */
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  /* ---------------------------------------------
     Heartbeat + cursor upsert
  --------------------------------------------- */
  useEffect(() => {
    if (loading || !user || !sessionId) return;

    const heartbeat = async () => {
      try {
        await api<void>('/presence/upsert', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            cursorX: cursorRef.current.x,
            cursorY: cursorRef.current.y,
            currentTool,
          }),
        });
      } catch {
        /* silent */
      }
    };

    // Initial heartbeat and trigger immediate presence fetch after it completes
    heartbeat().then(() => {
      // Force an immediate fetch after first heartbeat to update count
      fetchPresenceImmediate();
    });

    const i = setInterval(heartbeat, 30_000);
    return () => clearInterval(i);
  }, [sessionId, user, loading, currentTool]);

  /* ---------------------------------------------
     Helper to fetch presence on-demand
  --------------------------------------------- */
  const fetchPresenceImmediate = async () => {
    if (!sessionId) return;
    
    try {
      const list = await api<PresenceRecord[]>(`/presence/${sessionId}`);

      const now = Date.now();
      const filtered = list.filter(
        (p) => now - new Date(p.lastSeen).getTime() < PRESENCE_TTL_MS
      );

      setPresence(filtered);
    } catch {
      /* silent */
    }
  };

  /* ---------------------------------------------
     Fetch presence list
  --------------------------------------------- */
  useEffect(() => {
    if (!sessionId) return;

    const fetchPresence = async () => {
      try {
        const list = await api<PresenceRecord[]>(`/presence/${sessionId}`);

        const now = Date.now();
        const filtered = list.filter(
          (p) => now - new Date(p.lastSeen).getTime() < PRESENCE_TTL_MS
        );

        setPresence(filtered);
      } catch {
        /* silent */
      }
    };

    fetchPresence();
    const i = setInterval(fetchPresence, 3_000); // Poll every 3 seconds for better real-time sync
    return () => clearInterval(i);
  }, [sessionId]);

  /* ---------------------------------------------
     Batch resolve users (cached)
  --------------------------------------------- */
  useEffect(() => {
    const missingIds = presence
      .map((p) => p.userId)
      .filter((id) => !userMap[id]);

    if (missingIds.length === 0) return;

    const resolve = async () => {
      try {
        const users = await api<UserProfile[]>('/users/batch', {
          method: 'POST',
          body: JSON.stringify({ ids: missingIds }),
        });

        setUserMap((prev) => {
          const copy = { ...prev };
          users.forEach((u) => (copy[u.id] = u));
          return copy;
        });
      } catch {
        /* silent */
      }
    };

    resolve();
  }, [presence]);

  return (
    <>
      {/* Presence Button */}
      <button
        onClick={() => setShowUsers(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2"
      >
        <Users className="w-4 h-4" />
        <span>{presence.length} online</span>
      </button>

      {/* Modal */}
      {showUsers && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowUsers(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md mx-4 max-h-[420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Online Users</h3>
                    <p className="text-slate-400 text-sm">
                      {presence.length} active
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowUsers(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* List */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {presence.map((p) => {
                  const profile = userMap[p.userId];
                  const isMe = p.userId === user?.id;

                  return (
                    <div
                      key={p.userId}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30"
                    >
                      <div className="relative">
                        {profile?.avatarUrl ? (
                          <img
                            src={profile.avatarUrl}
                            className="w-10 h-10 rounded-full border-2 border-slate-600"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {(profile?.displayName ||
                                profile?.email ||
                                'U')[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-800" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">
                          {isMe ? (user?.displayName || user?.email || 'You') : (profile?.displayName || profile?.email || `User ${p.userId.slice(-4)}`)}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-400 text-sm">
                            {isMe ? 'You' : 'Active now'}
                          </p>
                          {p.currentTool && (
                            <span className="bg-slate-600 text-slate-300 px-2 py-0.5 rounded text-xs font-medium">
                              {p.currentTool === 'eraser' ? '🧽' :
                               p.currentTool === 'pen' ? '✏️' :
                               p.currentTool === 'line' ? '📏' :
                               p.currentTool === 'rectangle' ? '▭' :
                               p.currentTool === 'circle' ? '○' :
                               p.currentTool === 'arrow' ? '→' :
                               p.currentTool === 'text' ? '📝' :
                               p.currentTool === 'select' ? '👆' : p.currentTool}
                            </span>
                          )}
                        </div>
                      </div>

                      {isMe && (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                          You
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowUsers(false)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
