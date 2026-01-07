import { useEffect, useState, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { connectStrokeSocket, sendStroke, sendSessionUpdate, disconnectStrokeSocket } from '../lib/strokeSocket';
import { Canvas, Stroke, Cursor } from './Canvas';
import { DrawingToolbar, ToolType } from './DrawingToolbar';
import { ChatPanel } from './ChatPanel';
import { SessionList } from './SessionList';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';

/* ---------------------------------------------
   Helpers
--------------------------------------------- */
const userColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${hash % 360},70%,55%)`;
};

const normalizeStroke = (s: any): Stroke => {
  // Parse strokeData if it's a JSON string
  let parsedData = null;
  if (s.strokeData) {
    try {
      parsedData = typeof s.strokeData === 'string' 
        ? JSON.parse(s.strokeData) 
        : s.strokeData;
    } catch {
      console.warn('Failed to parse strokeData:', s.strokeData);
    }
  }

  return {
    id: s.id,
    points: Array.isArray(s.points) ? s.points : parsedData?.points ?? [],
    color: s.color ?? parsedData?.color ?? '#000000',
    size: s.size ?? parsedData?.size ?? 3,
    tool: s.tool ?? parsedData?.tool ?? 'pen',
    userId: s.userId,
    senderId: s.senderId ?? s.userId,
    createdAt: new Date(s.createdAt ?? Date.now()).getTime(),
    text: s.text ?? parsedData?.text,
  };
};

/* ---------------------------------------------
   Whiteboard
--------------------------------------------- */
export function Whiteboard({ onBackToLanding }: { onBackToLanding?: () => void }) {
  const { user } = useAuth();

  /* ---------------------------------------------
     Session state
  --------------------------------------------- */
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionCreatorId, setSessionCreatorId] = useState('');
  const [allowCollaborativeDrawing, setAllowCollaborativeDrawing] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  /* ---------------------------------------------
     Drawing state
  --------------------------------------------- */
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(3);
  const [showMobileChat, setShowMobileChat] = useState(false);

  /* ---------------------------------------------
     Undo (OWNER ONLY)
  --------------------------------------------- */
  const undoStack = useRef<Stroke[]>([]);

  /* ---------------------------------------------
     Permissions
  --------------------------------------------- */
  const isOwner = !!user && !!sessionCreatorId && user.id === sessionCreatorId;
  const canDraw = !!user && (isOwner || allowCollaborativeDrawing);

  // Debug logging
  useEffect(() => {
    console.log('Whiteboard permissions debug:', {
      user: user,
      sessionCreatorId: sessionCreatorId,
      isOwner: isOwner,
      allowCollaborativeDrawing: allowCollaborativeDrawing,
      canDraw: canDraw
    });
  }, [user, sessionCreatorId, isOwner, allowCollaborativeDrawing, canDraw]);

  /* ---------------------------------------------
     Load session from URL
  --------------------------------------------- */
  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('session');
    if (sid) selectSession(sid);
  }, []);

  /* ---------------------------------------------
     Refresh session metadata (2s - for real-time session updates)
  --------------------------------------------- */
  useEffect(() => {
    if (!currentSessionId) return;

    const refresh = async () => {
      try {
        const s = await api<{
          id: string;
          name: string;
          creatorId: string;
          allowCollaborativeDrawing: boolean;
        }>(`/sessions/${currentSessionId}`);

        // Only update if values actually changed to avoid unnecessary re-renders
        setSessionName(prev => prev !== s.name ? s.name : prev);
        setSessionCreatorId(prev => prev !== s.creatorId ? s.creatorId : prev);
        setAllowCollaborativeDrawing(prev => prev !== s.allowCollaborativeDrawing ? s.allowCollaborativeDrawing : prev);
      } catch {
        /* silent */
      }
    };

    refresh();
    // Poll for session updates every 2 seconds for better real-time sync
    const i = setInterval(refresh, 2000);
    return () => clearInterval(i);
  }, [currentSessionId]);

  /* ---------------------------------------------
     Refresh strokes (2s - for real-time stroke updates)
  --------------------------------------------- */
  useEffect(() => {
    if (!currentSessionId) return;

    const refreshStrokes = async () => {
      try {
        const data = await api<any[]>(`/strokes/session/${currentSessionId}`);
        const normalizedData = data.map(normalizeStroke);

        // Only update if the stroke count changed (indicating undo/clear operations)
        setStrokes(prevStrokes => {
          if (prevStrokes.length !== normalizedData.length) {
            console.log('[Whiteboard] Stroke count changed, updating:', prevStrokes.length, '->', normalizedData.length);
            return normalizedData;
          }
          return prevStrokes;
        });
      } catch {
        /* silent */
      }
    };

    // Start polling after a short delay
    const pollTimer = setTimeout(() => {
      const i = setInterval(refreshStrokes, 2000);
      return () => clearInterval(i);
    }, 500);

    return () => clearTimeout(pollTimer);
  }, [currentSessionId]);

  /* ---------------------------------------------
     Presence heartbeat (30s)
  --------------------------------------------- */
  useEffect(() => {
    if (!currentSessionId || !user) return;

    const heartbeat = async () => {
      try {
        await api('/presence/upsert', {
          method: 'POST',
          body: JSON.stringify({
            sessionId: currentSessionId,
            currentTool,
          }),
        });
      } catch {
        /* silent */
      }
    };

    heartbeat();
    const i = setInterval(heartbeat, 30000);
    return () => clearInterval(i);
  }, [currentSessionId, user?.id, currentTool]);

  /* ---------------------------------------------
     Broadcast tool changes in real-time
  --------------------------------------------- */
  useEffect(() => {
    if (!currentSessionId || !user) return;

    // Send tool change via WebSocket for instant sync
    sendSessionUpdate({
      type: 'tool-changed',
      userId: user.id,
      currentTool,
      sessionId: currentSessionId,
      senderId: user.id
    });
  }, [currentTool, currentSessionId, user?.id]);

  /* ---------------------------------------------
     Load strokes (REST)
  --------------------------------------------- */
  const loadStrokes = async (sessionId: string) => {
    try {
      const data = await api<any[]>(`/strokes/session/${sessionId}`);
      setStrokes(data.map(normalizeStroke));
    } catch {
      /* silent */
    }
  };

  /* ---------------------------------------------
     WebSocket connections (REAL-TIME)
  --------------------------------------------- */
  useEffect(() => {
    if (!currentSessionId || !user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Add small delay to ensure authentication is complete
    const timeoutId = setTimeout(() => {
      console.log('[Whiteboard] Connecting to WebSockets for session:', currentSessionId);

      // Connect to stroke WebSocket with session update handler
      connectStrokeSocket(currentSessionId, token, (msg) => {
        console.log('[Whiteboard] Received stroke via WebSocket:', msg);

        // Handle stroke deletion
        if (msg.deleted) {
          console.log('[Whiteboard] Deleting stroke via WebSocket:', msg.id);
          setStrokes((prev) => prev.filter(s => s.id !== msg.id));
          return;
        }

        const stroke = normalizeStroke(msg);
        console.log('[Whiteboard] Normalized stroke:', stroke);

        setStrokes((prev) => {
          // Check if this stroke already exists (update case)
          const existingIndex = prev.findIndex(s => s.id === stroke.id);
          if (existingIndex >= 0) {
            // Always update existing strokes from WebSocket (from any user)
            // This ensures real-time sync for all stroke modifications
            console.log('[Whiteboard] Updating existing stroke:', stroke.id);
            const updated = [...prev];
            updated[existingIndex] = stroke;
            return updated;
          } else {
            // Add new stroke from WebSocket (prevent echo by checking if we just created it)
            // Use a more robust echo prevention that works with server-generated IDs
            const isRecentEcho = stroke.userId === user.id &&
              stroke.createdAt &&
              Date.now() - stroke.createdAt < 1000; // Within last second

            if (isRecentEcho) {
              console.log('[Whiteboard] Ignoring recent echo for stroke:', stroke.id);
              return prev;
            }

            console.log('[Whiteboard] Adding new stroke from WebSocket, previous count:', prev.length);
            return [...prev, stroke];
          }
        });
      }, (msg) => {
        // Handle session updates (collaborative drawing toggle, tool changes, undo, clear)
        console.log('[Whiteboard] Received session update via WebSocket:', msg);
        if (msg.type === 'collaborative-drawing-toggled') {
          setAllowCollaborativeDrawing(msg.allowCollaborativeDrawing);
        } else if (msg.type === 'undo-performed') {
          // Reload strokes when undo is performed by another user
          console.log('[Whiteboard] Undo performed by another user, reloading strokes');
          loadStrokes(currentSessionId);
        } else if (msg.type === 'board-cleared') {
          // Clear board when cleared by another user
          console.log('[Whiteboard] Board cleared by another user');
          setStrokes([]);
        }
        // Tool changes are handled by UserPresence component polling
      });


    }, 100);

    // Cleanup on unmount or when session changes
    return () => {
      clearTimeout(timeoutId);
      console.log('[Whiteboard] Disconnecting WebSockets');
      disconnectStrokeSocket();
    };
  }, [currentSessionId, user?.id]);

  /* ---------------------------------------------
     Stroke handlers
  --------------------------------------------- */
  const handleStroke = async (stroke: Stroke) => {
    if (!canDraw || !currentSessionId || !user) return;

    // OWNER-ONLY undo tracking
    if (isOwner) {
      undoStack.current.push(stroke);
    }

    // REST persistence first to get the server-generated ID
    try {
      const response = await api<{ id: string }>('/strokes', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: currentSessionId,
          points: stroke.points,
          color: stroke.color,
          size: stroke.size,
          tool: stroke.tool,
          text: stroke.text,
        }),
      });

      // Update the stroke with the server-generated ID
      const persistedStroke = { ...stroke, id: response.id };

      // Optimistic UI with the correct ID
      setStrokes((prev) => [...prev, persistedStroke]);

      // WebSocket broadcast with the server ID
      sendStroke({
        ...persistedStroke,
        sessionId: currentSessionId,
        senderId: user.id,
      });
    } catch (error) {
      console.error('Failed to create stroke:', error);
    }
  };

  /* ---------------------------------------------
     Update stroke (for move/select tool)
  --------------------------------------------- */
  const handleUpdateStroke = async (stroke: Stroke) => {
    if (!canDraw || !currentSessionId || !user) return;

    // Optimistic UI update
    setStrokes((prev) => prev.map((s) => (s.id === stroke.id ? stroke : s)));

    // REST persistence
    try {
      await api(`/strokes/${stroke.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          sessionId: currentSessionId,
          points: stroke.points,
          color: stroke.color,
          size: stroke.size,
          tool: stroke.tool,
          text: stroke.text,
        }),
      });
    } catch (error) {
      console.error('Failed to update stroke:', error);
      // Revert on failure
      await loadStrokes(currentSessionId);
    }
  };

  /* ---------------------------------------------
     Undo (OWNER ONLY)
  --------------------------------------------- */
  const undo = async () => {
    if (!isOwner || !currentSessionId) return;

    try {
      await api(`/strokes/undo/${currentSessionId}`, { method: 'POST' });

      // Broadcast undo action via WebSocket for real-time sync
      sendSessionUpdate({
        type: 'undo-performed',
        sessionId: currentSessionId,
        senderId: user?.id
      });

      // Force immediate reload for all users via polling
      console.log('[Whiteboard] Undo completed, forcing stroke reload');
      setTimeout(() => loadStrokes(currentSessionId), 500);

      // Reload strokes locally after undo
      await loadStrokes(currentSessionId);
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  /* ---------------------------------------------
     Clear board (OWNER ONLY)
  --------------------------------------------- */
  const clearBoard = async () => {
    if (!isOwner || !currentSessionId) return;

    setStrokes([]);
    undoStack.current = [];

    try {
      await api(`/strokes/session/${currentSessionId}`, { method: 'DELETE' });

      // Broadcast clear action via WebSocket for real-time sync
      sendSessionUpdate({
        type: 'board-cleared',
        sessionId: currentSessionId,
        senderId: user?.id
      });
    } catch (error) {
      console.error('Failed to clear board:', error);
    }
  };

  /* ---------------------------------------------
     Delete Session (OWNER ONLY)
  --------------------------------------------- */
  const deleteSession = async () => {
    if (!isOwner || !currentSessionId) return;
    
    const confirmDelete = confirm('Are you sure you want to delete this session? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      await api(`/sessions/${currentSessionId}`, { method: 'DELETE' });
      // Redirect back to landing page after deletion
      setCurrentSessionId('');
      setSessionName('');
      setSessionCreatorId('');
      setStrokes([]);
      undoStack.current = [];
      
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.replaceState({}, '', url.toString());
      
      onBackToLanding?.();
    } catch (error) {
      console.error('Failed to delete session', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  /* ---------------------------------------------
     Session management
  --------------------------------------------- */
  const selectSession = async (sessionId: string) => {
    try {
      setSessionLoading(true);

      const s = await api<{
        id: string;
        name: string;
        creatorId: string;
        allowCollaborativeDrawing: boolean;
      }>(`/sessions/${sessionId}`);

      console.log('Session data from API:', s);

      setCurrentSessionId(s.id);
      setSessionName(s.name);
      setSessionCreatorId(s.creatorId);
      setAllowCollaborativeDrawing(s.allowCollaborativeDrawing);

      await loadStrokes(s.id);

      const url = new URL(window.location.href);
      url.searchParams.set('session', s.id);
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to load session:', error);
      // If session loading fails, redirect back to landing
      setCurrentSessionId('');
      const url = new URL(window.location.href);
      url.searchParams.delete('session');
      window.history.replaceState({}, '', url.toString());
      onBackToLanding?.();
    } finally {
      setSessionLoading(false);
    }
  };

  const createSession = async () => {
    try {
      console.log('Creating session with user:', user);
      console.log('Token in localStorage:', localStorage.getItem('token'));

      const s = await api<{ id: string; name: string }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Session', isPublic: true }),
      });
      
      console.log('Created session:', s);
      console.log('Current user:', user);

      // Set the current user as the session creator immediately
      setCurrentSessionId(s.id);
      setSessionName(s.name);
      setSessionCreatorId(user?.id || '');
      setAllowCollaborativeDrawing(false); // Default to false
      
      await loadStrokes(s.id);
      
      const url = new URL(window.location.href);
      url.searchParams.set('session', s.id);
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const leaveSession = () => {
    setCurrentSessionId('');
    setSessionName('');
    setSessionCreatorId('');
    setStrokes([]);
    undoStack.current = [];

    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.replaceState({}, '', url.toString());

    onBackToLanding?.();
  };

  /* ---------------------------------------------
     Cursor (local only)
  --------------------------------------------- */
  const cursors: Cursor[] = user
    ? [{ userId: user.id, x: 0, y: 0, color: userColor(user.id) }]
    : [];

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">✏️</span>
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg">
                {currentSessionId ? sessionName : 'Collaborative Whiteboard'}
              </h1>
              {currentSessionId && (
                <p className="text-xs text-gray-500">Session ID: {currentSessionId.slice(0, 8)}...</p>
              )}
            </div>
          </div>

          {currentSessionId && (
            <div className="flex gap-3 items-center flex-wrap">
              <UserPresence sessionId={currentSessionId} currentTool={currentTool} />

              {/* WebSocket Connection Status */}
              <ConnectionStatus sessionId={currentSessionId} />

              {/* Drawing Status Indicator */}
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                canDraw
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${canDraw ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                {canDraw ? 'Drawing Enabled' : 'Drawing Disabled'}
              </div>

              <button
                onClick={() => setShowMobileChat(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Open Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Session Info Sidebar - Only show when session is active */}
        {currentSessionId && (
          <aside className="hidden md:flex w-80 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Current Session
              </h3>
              
              <div className="space-y-4">
                {/* Session Name */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Session Name</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{sessionName}</p>
                </div>

                {/* Creator Badge */}
                {isOwner && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="text-lg">👑</span>
                      <span className="font-semibold text-sm">You are the owner</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Controls Section */}
            {isOwner && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Session Settings
                </h3>
                
                <div className="space-y-3">
                  {/* Collaborative Drawing Toggle */}
                  <label className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-amber-300 hover:bg-amber-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Allow Collaboration</p>
                      <p className="text-xs text-gray-500 mt-0.5">Let others draw on canvas</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowCollaborativeDrawing}
                      onChange={async () => {
                        try {
                          const v = await api<boolean>(
                            `/sessions/${currentSessionId}/toggle-collaborative-drawing`,
                            { method: 'POST' }
                          );
                          setAllowCollaborativeDrawing(v);

                          // Broadcast the change via WebSocket for real-time sync
                          sendSessionUpdate({
                            type: 'collaborative-drawing-toggled',
                            allowCollaborativeDrawing: v,
                            sessionId: currentSessionId,
                            senderId: user?.id
                          });
                        } catch (error) {
                          console.error('Failed to toggle collaborative drawing', error);
                        }
                      }}
                      className="w-5 h-5 accent-amber-600"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Actions Section */}
            <div className="p-6 mt-auto space-y-3">
              {/* Delete Session - Only for owner */}
              {isOwner && (
                <button
                  onClick={deleteSession}
                  className="w-full px-4 py-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🗑️</span>
                  Delete Session
                </button>
              )}

              {/* Leave Session */}
              <button
                onClick={leaveSession}
                className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Leave Session
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {sessionLoading ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Session</h3>
                <p className="text-gray-600">Connecting to collaborative whiteboard...</p>
              </div>
            </div>
          ) : currentSessionId ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <DrawingToolbar
                  currentTool={currentTool}
                  currentColor={currentColor}
                  currentSize={currentSize}
                  onToolChange={setCurrentTool}
                  onColorChange={setCurrentColor}
                  onSizeChange={setCurrentSize}
                  onUndo={undo}
                  onClear={clearBoard}
                />
              </div>

              <div className="flex-1 bg-gray-50 relative">
                {/* Canvas Watermark/Hint - Hidden when strokes exist */}
                {strokes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div className="text-center text-gray-300">
                      <div className="text-6xl mb-4">✏️</div>
                      <p className="text-lg font-medium">Start drawing to collaborate</p>
                      <p className="text-sm mt-2">Select a tool from the toolbar above</p>
                    </div>
                  </div>
                )}
                
                <Canvas
                  strokes={strokes}
                  cursors={cursors}
                  currentTool={currentTool}
                  currentColor={currentColor}
                  currentSize={currentSize}
                  currentUserId={String(user?.id || '')}
                  canDraw={canDraw}
                  onStroke={handleStroke}
                  onUpdateStroke={handleUpdateStroke}
                  onDeleteStroke={async (strokeId: string) => {
                    console.log('[Whiteboard] Deleting stroke:', strokeId);
                    // Remove from local state immediately
                    setStrokes(prev => prev.filter(s => s.id !== strokeId));

                    // Send deletion via REST API and WebSocket
                    try {
                      await api(`/strokes/${strokeId}`, { method: 'DELETE' });
                      // Broadcast deletion via WebSocket
                      sendStroke({
                        id: strokeId,
                        deleted: true,
                        sessionId: currentSessionId,
                        senderId: user?.id
                      });
                    } catch (error) {
                      console.error('Failed to delete stroke:', error);
                      // Revert on failure
                      await loadStrokes(currentSessionId);
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Whiteboard</h3>
                <p className="text-gray-600 mb-6">Select or create a session to start collaborating</p>
                <button
                  onClick={createSession}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Create New Session
                </button>
              </div>
            </div>
          )}
        </main>

        {currentSessionId && (
          <aside className="hidden lg:flex flex-col w-80 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <ChatPanel
              sessionId={currentSessionId}
              userId={String(user?.id || '')}
              userName={user?.email || 'User'}
            />
          </aside>
        )}
      </div>

      {/* Mobile Chat */}
      {currentSessionId && showMobileChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden" onClick={() => setShowMobileChat(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="text-gray-900 font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Chat
              </h3>
              <button 
                onClick={() => setShowMobileChat(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <ChatPanel
              sessionId={currentSessionId}
              userId={String(user?.id || '')}
              userName={user?.email || 'User'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
