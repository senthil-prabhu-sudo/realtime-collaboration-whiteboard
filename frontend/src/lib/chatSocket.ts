import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient: Client | null = null;
let subscription: StompSubscription | null = null;
let messageCallback: ((msg: any) => void) | null = null;

let currentSession: string | null = null;
let reconnectTimeout: number | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

let isIntentionalDisconnect = false;

let messageQueue: Array<{ message: string; sessionId: string }> = [];

/* ---------------------------------------------
   Exponential backoff
--------------------------------------------- */
const getReconnectDelay = (attempt: number) =>
  Math.min(1000 * Math.pow(2, attempt), 30000) + Math.random() * 1000;

/* ---------------------------------------------
   CONNECT
--------------------------------------------- */
export function connectChatSocket(
  sessionId: string,
  token: string,
  onMessage: (msg: any) => void
) {
  // Store callback ONCE
  messageCallback = onMessage;
  currentSession = sessionId;
  isIntentionalDisconnect = false;
  reconnectAttempts = 0;

  cleanup(); // 🔥 ensure clean state

  stompClient = new Client({
    webSocketFactory: () => new SockJS(`https://realtime-collaboration-whiteboard.onrender.com/ws?token=${encodeURIComponent(token)}`),

    connectHeaders: {
      // Authorization header may not be needed if token is in query param
      // Authorization: `Bearer ${token}`,
    },

    debug: str => console.log('[Chat STOMP]', str),

    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log('[Chat WS] ✅ Connected');
      reconnectAttempts = 0;

      if (!stompClient || !currentSession) return;

      const destination = `/topic/chat/${currentSession}`;

      // 🔥 ensure old subscription is gone
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }

      subscription = stompClient.subscribe(destination, (frame: IMessage) => {
        try {
          const data = JSON.parse(frame.body);
          messageCallback?.(data);
        } catch (e) {
          console.error('[Chat WS] Invalid message payload', e);
        }
      });

      // Flush queued messages
      messageQueue.forEach(m => sendChatMessage(m.message, m.sessionId));
      messageQueue = [];
    },

    onWebSocketClose: (event) => {
      console.warn('[Chat WS] 🔌 WebSocket closed:', event.reason || 'No reason provided');
      if (!isIntentionalDisconnect) scheduleReconnect(token, sessionId);
    },

    onStompError: (frame) => {
      console.error('[Chat WS] ❌ STOMP error:', frame.headers['message']);
      console.error('[Chat WS] Error details:', frame.body);
      if (!isIntentionalDisconnect) scheduleReconnect(token, sessionId);
    },

    onWebSocketError: (event) => {
      console.error('[Chat WS] ❌ WebSocket error:', event);
    },

    onDisconnect: () => {
      console.warn('[Chat WS] ⚠️ Disconnected');
      // Clean up subscription on disconnect
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    },
  });

  stompClient.activate();
}

/* ---------------------------------------------
   SEND
--------------------------------------------- */
export function sendChatMessage(message: string, sessionId: string) {
  console.log('[Chat WS] Attempting to send message:', { message, sessionId, connected: stompClient?.connected });

  if (stompClient?.connected) {
    try {
      const payload = { message };
      const destination = `/app/chat/${sessionId}`;

      console.log('[Chat WS] Publishing to:', destination);
      console.log('[Chat WS] Payload:', JSON.stringify(payload));

      stompClient.publish({
        destination,
        body: JSON.stringify(payload),
      });

      console.log('[Chat WS] ✅ Message published successfully');
    } catch (error) {
      console.error('[Chat WS] ❌ Failed to publish message:', error);
      messageQueue.push({ message, sessionId });
    }
  } else {
    console.warn('[Chat WS] ⚠️ Not connected, queueing message');
    messageQueue.push({ message, sessionId });
  }
}

/* ---------------------------------------------
   RECONNECT
--------------------------------------------- */
function scheduleReconnect(token: string, sessionId: string) {
  if (isIntentionalDisconnect) return;
  if (reconnectAttempts >= maxReconnectAttempts) return;

  const delay = getReconnectDelay(reconnectAttempts++);
  reconnectTimeout = window.setTimeout(
    () => connectChatSocket(sessionId, token, messageCallback!),
    delay
  );
}

/* ---------------------------------------------
   DISCONNECT
--------------------------------------------- */
export function disconnectChatSocket() {
  isIntentionalDisconnect = true;
  cleanup();
}

/* ---------------------------------------------
   STATUS
--------------------------------------------- */
export function isChatSocketConnected(): boolean {
  return !!stompClient?.connected;
}

/* ---------------------------------------------
   INTERNAL CLEANUP
--------------------------------------------- */
function cleanup() {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }

  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

/* ---------------------------------------------
   QUEUED MESSAGE COUNT
--------------------------------------------- */
export function getChatQueuedMessageCount(): number {
  return messageQueue.length;
}
