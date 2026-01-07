import { useEffect, useState } from 'react';
import { Video, Users, Plus, Settings, LogOut, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Session {
  id: string;
  name: string;
  createdAt: string;
  isPublic: boolean;
  creatorId: string;
}

export function LandingPage({
  onJoinSession
}: {
  onJoinSession: (sessionId: string) => void;
}) {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api<Session[]>('/sessions');
      // Filter for public sessions only for landing page
      setSessions(data.filter(s => s.isPublic));
    } catch (error) {
      console.error('Failed to load sessions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;

    try {
      setIsCreating(true);
      setError(null);
      const newSession = await api<{
        id: string;
        name: string;
      }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          name: newSessionName.trim(),
          isPublic: true, // Public sessions for easy access
        }),
      });

      onJoinSession(newSession.id);
    } catch (error) {
      console.error('Failed to create session', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setNewSessionName('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">✏️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Collaborative Whiteboard</h1>
                <p className="text-gray-600 text-sm">Real-time drawing & collaboration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <button
                  onClick={signOut}
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
            Live Collaboration
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Draw Together,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Create Together</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Experience seamless real-time collaborative whiteboarding with professional drawing tools,
            powered by WebSocket technology
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105"
            >
              <Plus className="w-6 h-6" />
              <span>Create New Session</span>
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Active Sessions</h3>
              <p className="text-gray-600">Join existing collaborative sessions</p>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{sessions.length} active</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading sessions...</p>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">No Active Sessions</h4>
              <p className="text-gray-600 mb-6">Be the first to create a collaborative whiteboard session</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl transition-colors"
              >
                Start Creating
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => {
                const isOwner = user && session.creatorId === user.id;
                
                return (
                  <div
                    key={session.id}
                    className="bg-gradient-to-br from-gray-50 to-white hover:from-white hover:to-gray-50 rounded-xl p-6 border border-gray-200 hover:border-blue-300 transition-all duration-200 group shadow-sm hover:shadow-md relative"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        // Redirect to whiteboard page with session ID
                        window.location.href = `/?session=${session.id}`;
                      }}
                    >
                      {/* Header with badges */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="text-gray-900 font-bold text-lg truncate">
                              {session.name}
                            </h4>
                            {isOwner && (
                              <span className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-2 py-1 rounded-lg font-semibold border border-blue-200 flex items-center gap-1">
                                <span>👑</span>
                                Owner
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm flex items-center gap-1.5">
                            <span className="text-gray-400">📅</span>
                            {new Date(session.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isOwner && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200 flex items-center gap-1.5 shrink-0">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                              Live
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-gray-600">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">Join Session</span>
                        </div>
                        <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-sm font-semibold">Enter →</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button - Only for owner */}
                    {isOwner && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmDelete = confirm(`Are you sure you want to delete "${session.name}"?`);
                          if (!confirmDelete) return;

                          try {
                            await api(`/sessions/${session.id}`, { method: 'DELETE' });
                            // Refresh sessions list
                            fetchSessions();
                          } catch (error) {
                            console.error('Failed to delete session', error);
                            alert('Failed to delete session. Please try again.');
                          }
                        }}
                        className="absolute top-3 right-3 p-2 bg-red-50 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all z-10 border border-red-200"
                        title="Delete session (Owner only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-blue-200 group-hover:border-blue-300 transition-colors">
              <Video className="w-10 h-10 text-blue-600" />
            </div>
            <h4 className="text-gray-900 font-semibold text-xl mb-3">Real-time Sync</h4>
            <p className="text-gray-600 leading-relaxed">See changes instantly as multiple users draw together in perfect synchronization</p>
          </div>
          <div className="text-center group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-green-200 group-hover:border-green-300 transition-colors">
              <Users className="w-10 h-10 text-green-600" />
            </div>
            <h4 className="text-gray-900 font-semibold text-xl mb-3">Multi-user Sessions</h4>
            <p className="text-gray-600 leading-relaxed">Invite unlimited collaborators to join your whiteboard sessions seamlessly</p>
          </div>
          <div className="text-center group bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-purple-200 group-hover:border-purple-300 transition-colors">
              <Settings className="w-10 h-10 text-purple-600" />
            </div>
            <h4 className="text-gray-900 font-semibold text-xl mb-3">Professional Tools</h4>
            <p className="text-gray-600 leading-relaxed">Access a complete suite of drawing tools including pens, shapes, text, and selection</p>
          </div>
        </div>
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Create New Session
            </h3>

            <div className="mb-6">
              <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-2">
                Session Name
              </label>
              <input
                id="sessionName"
                type="text"
                value={newSessionName}
                onChange={(e) => {
                  setNewSessionName(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter session name"
                autoFocus
                autoComplete="off"
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreateSession();
                  } else if (e.key === 'Escape') {
                    closeModal();
                  }
                }}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={isCreating}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newSessionName.trim() || isCreating}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  'Create & Join'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
