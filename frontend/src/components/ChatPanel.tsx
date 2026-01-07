import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import {
  connectChatSocket,
  sendChatMessage,
  disconnectChatSocket,
  isChatSocketConnected,
} from '../lib/chatSocket';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  message: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ChatPanelProps {
  sessionId: string;
  userId: string;
  userName: string;
}

export function ChatPanel({ sessionId, userId }: ChatPanelProps) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectedRef = useRef(false);

  /* ---------------------------------------------
     Load messages (REST)
  --------------------------------------------- */
  const loadMessages = async () => {
    if (!sessionId || !user) return;

    try {
      setError(null);
      console.log('[ChatPanel] Loading messages for session:', sessionId);
      const data = await api<Message[]>(`/chat/${sessionId}`);
      console.log('[ChatPanel] Loaded messages:', data.length, 'messages');
      setMessages(data);
    } catch (e) {
      console.error('[ChatPanel] Failed to load messages', e);
      setError('Failed to load messages');
    }
  };

  /* ---------------------------------------------
     Fetch user profiles
  --------------------------------------------- */
  const fetchUserProfiles = async (ids: string[]) => {
    const missing = ids.filter(id => !userProfiles.has(id));
    if (missing.length === 0) return;

    console.log('[ChatPanel] Fetching profiles for user IDs:', missing);

    try {
      const profiles = await api<UserProfile[]>('/users/batch', {
        method: 'POST',
        body: JSON.stringify({ ids: missing }),
      });

      console.log('[ChatPanel] Fetched profiles:', profiles);

      setUserProfiles(prev => {
        const map = new Map(prev);
        profiles.forEach(profile => map.set(profile.id, profile));
        console.log('[ChatPanel] Updated profiles, total profiles in map:', map.size);
        return map;
      });
    } catch (e) {
      console.error('[ChatPanel] Failed to fetch profiles:', e);
    }
  };

  /* ---------------------------------------------
     WebSocket connection
  --------------------------------------------- */
  useEffect(() => {
    if (!sessionId || !user?.id) return;

    loadMessages();

    const token = localStorage.getItem('token');
    if (!token) return;

    console.log('[ChatPanel] Connecting WebSocket:', sessionId);

    connectChatSocket(sessionId, token, msg => {
      console.log('[ChatPanel] WS message received:', msg);

      setMessages(prev => {
        // Check if this message already exists (by ID if available)
        if (msg.id && prev.some(m => m.id === msg.id)) {
          console.log('[ChatPanel] Ignoring duplicate message:', msg.id);
          return prev;
        }

        // Prevent echo: don't add our own messages that we already optimistically added
        if (msg.userId === user?.id && prev.some(m => m.message === msg.message && m.userId === msg.userId)) {
          console.log('[ChatPanel] Ignoring echo message');
          return prev;
        }

        console.log('[ChatPanel] Adding new message from WebSocket');
        return [...prev, msg].sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      if (msg.userId) fetchUserProfiles([msg.userId]);
    });

    return () => {
      disconnectChatSocket();
    };
  }, [sessionId, user?.id]);

  /* ---------------------------------------------
     Fallback polling for real-time sync (every 3 seconds)
  --------------------------------------------- */
  useEffect(() => {
    if (!sessionId || !user?.id) return;

    const pollMessages = async () => {
      try {
        const data = await api<Message[]>(`/chat/${sessionId}`);
        setMessages(prevMessages => {
          // Only update if we have new messages
          if (data.length > prevMessages.length) {
            console.log('[ChatPanel] Polling found new messages:', data.length - prevMessages.length);
            return data.sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return prevMessages;
        });

        // Also fetch any missing user profiles
        const userIds = data.map(m => m.userId).filter(id => !userProfiles.has(id));
        if (userIds.length > 0) {
          fetchUserProfiles(userIds);
        }
      } catch (e) {
        // Silent fail for polling
      }
    };

    // Start polling after initial load
    const pollTimer = setTimeout(() => {
      pollMessages();
      const interval = setInterval(pollMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }, 1000);

    return () => clearTimeout(pollTimer);
  }, [sessionId, user?.id]);

  /* ---------------------------------------------
     Track WS connection status
  --------------------------------------------- */
  useEffect(() => {
    const id = setInterval(() => {
      setIsWebSocketConnected(isChatSocketConnected());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------------------------------------------
     Auto-scroll
  --------------------------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------------------------------------------
     Send message
  --------------------------------------------- */
  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    // Create optimistic message for immediate display
    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}-${Math.random()}`,
      sessionId,
      userId: user.id,
      message: text,
      createdAt: new Date().toISOString()
    };

    // Add to UI immediately for better UX
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Try WebSocket first for real-time sync (like strokes)
      if (isChatSocketConnected()) {
        console.log('[ChatPanel] Sending via WebSocket:', text);
        sendChatMessage(text, sessionId);

        // Also persist via REST for reliability
        api(`/chat/${sessionId}`, {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        }).catch(e => console.warn('[ChatPanel] REST backup failed:', e));
      } else {
        // Fallback to REST only
        console.log('[ChatPanel] WebSocket not connected, using REST');
        await api(`/chat/${sessionId}`, {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        });
        // Reload messages to get the real message with server ID
        loadMessages();
      }
    } catch (e) {
      console.error('[ChatPanel] Send failed:', e);
      setNewMessage(text);
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
  };

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <div className="flex flex-col h-full bg-white border-t lg:border-t-0 lg:border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between">
        <div className="flex gap-2 items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Chat</h3>
            <p className="text-xs text-gray-500">{messages.length} messages</p>
          </div>
        </div>
        <span className={`text-xs ${isWebSocketConnected ? 'text-green-600' : 'text-yellow-600'}`}>
          {isWebSocketConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-1">
        {messages.map((m, i) => {
          const isMe = m.userId === userId;
          const userProfile = userProfiles.get(m.userId);
          const displayName = isMe
            ? (user?.displayName || user?.email || 'You')
            : (userProfile?.displayName || userProfile?.email || 'Anonymous');

          // Group consecutive messages from same user
          const prevMessage = i > 0 ? messages[i - 1] : null;
          const isFirstInGroup = !prevMessage || prevMessage.userId !== m.userId;

          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {/* Sender name - only show for first message in group */}
              {isFirstInGroup && (
                <div className={`text-[10px] font-medium px-1 mb-0.5 ${
                  isMe ? 'text-blue-600 self-end' : 'text-gray-600 self-start'
                }`}>
                  {displayName}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`max-w-[80%] px-2.5 py-1.5 rounded-md text-sm leading-relaxed ${
                  isMe
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}
              >
                {m.message}
                <div className={`text-[9px] mt-0.5 opacity-60 ${
                  isMe ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border rounded-xl px-4 py-2"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
