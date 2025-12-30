/* ==================================================
   strokeSocket.ts
   - STOMP over SockJS WebSocket
   - Auth-aware with JWT token
   - Enhanced auto reconnect with exponential backoff
   - Connection state management
   - Message queuing during disconnection
 ================================================== */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient: Client | null = null;
let currentSession: string | null = null;
let reconnectTimeout: number | null = null;
let subscription: StompSubscription | null = null;
let sessionSubscription: StompSubscription | null = null;
let messageCallback: ((msg: any) => void) | null = null;
let sessionCallback: ((msg: any) => void) | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let isIntentionalDisconnect = false;
let messageQueue: any[] = [];

// Exponential backoff calculation
const getReconnectDelay = (attempt: number): number => {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  return delay + Math.random() * 1000; // Add jitter
};

export function connectStrokeSocket(
  sessionId: string,
  token: string,
  onMessage: (msg: any) => void,
  onSessionUpdate?: (msg: any) => void
) {
  // Clean up existing connection
  if (stompClient && stompClient.connected) {
    console.log('[Stroke WS] Cleaning up existing connection');
    isIntentionalDisconnect = true;
    stompClient.deactivate();
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  currentSession = sessionId;
  messageCallback = onMessage;
  sessionCallback = onSessionUpdate || null;
  isIntentionalDisconnect = false;
  reconnectAttempts = 0;

  // Create STOMP client with SockJS
  stompClient = new Client({
    webSocketFactory: () => {
      console.log('[Stroke WS] Creating new SockJS connection');
      return new SockJS('https://realtime-collaboration-whiteboard-production.up.railway.app/ws');
    },
    
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },

    debug: (str) => {
      console.log('[Stroke STOMP]', str);
    },

    // Disable automatic reconnection - we'll handle it manually
    reconnectDelay: 0,

    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log('[Stroke WS] ✅ Connected successfully');
      reconnectAttempts = 0; // Reset on successful connection
      
      // Subscribe to stroke updates for this session
      if (stompClient && currentSession) {
        subscription = stompClient.subscribe(
          `/topic/strokes/${currentSession}`,
          (message: IMessage) => {
            try {
              const data = JSON.parse(message.body);
              if (messageCallback) {
                messageCallback(data);
              }
            } catch (err) {
              console.warn('[Stroke WS] Failed to parse message:', err);
            }
          }
        );
        console.log('[Stroke WS] Subscribed to /topic/strokes/' + currentSession);

        // Subscribe to session updates for this session
        if (sessionCallback) {
          sessionSubscription = stompClient.subscribe(
            `/topic/sessions/${currentSession}`,
            (message: IMessage) => {
              try {
                const data = JSON.parse(message.body);
                if (sessionCallback) {
                  sessionCallback(data);
                }
              } catch (err) {
                console.warn('[Stroke WS] Failed to parse session message:', err);
              }
            }
          );
          console.log('[Stroke WS] Subscribed to /topic/sessions/' + currentSession);
        }

        // Send any queued messages
        if (messageQueue.length > 0) {
          console.log(`[Stroke WS] Sending ${messageQueue.length} queued messages`);
          messageQueue.forEach(msg => sendStroke(msg));
          messageQueue = [];
        }
      }
    },

    onStompError: (frame) => {
      console.error('[Stroke WS] ❌ STOMP error:', frame.headers['message']);
      console.error('[Stroke WS] Error details:', frame.body);
      
      // Attempt reconnection on STOMP errors
      scheduleReconnect(token, sessionId);
    },

    onWebSocketError: (event) => {
      console.error('[Stroke WS] ❌ WebSocket error:', event);
    },

    onWebSocketClose: (event) => {
      console.warn('[Stroke WS] 🔌 WebSocket closed:', event.reason || 'No reason provided');
      
      // Only attempt reconnect if not intentionally disconnected
      if (!isIntentionalDisconnect) {
        scheduleReconnect(token, sessionId);
      }
    },

    onDisconnect: () => {
      console.warn('[Stroke WS] ⚠️ Disconnected');

      // Clean up subscriptions
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
      if (sessionSubscription) {
        sessionSubscription.unsubscribe();
        sessionSubscription = null;
      }
    }
  });

  // Activate the STOMP client
  console.log('[Stroke WS] Activating STOMP client...');
  stompClient.activate();
}

// Manual reconnection with exponential backoff
function scheduleReconnect(token: string, sessionId: string) {
  if (isIntentionalDisconnect || !messageCallback) {
    console.log('[Stroke WS] Skipping reconnect (intentional disconnect or no callback)');
    return;
  }

  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('[Stroke WS] ❌ Max reconnection attempts reached. Please refresh the page.');
    return;
  }

  const delay = getReconnectDelay(reconnectAttempts);
  reconnectAttempts++;

  console.log(`[Stroke WS] 🔄 Scheduling reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${Math.round(delay / 1000)}s`);

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  reconnectTimeout = window.setTimeout(() => {
    console.log(`[Stroke WS] Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts}...`);
    connectStrokeSocket(sessionId, token, messageCallback!);
  }, delay);
}

export function sendStroke(data: any) {
  if (stompClient?.connected && currentSession) {
    try {
      stompClient.publish({
        destination: `/app/strokes/${currentSession}`,
        body: JSON.stringify(data)
      });
      console.log('[Stroke WS] ✅ Stroke sent successfully');
    } catch (error) {
      console.error('[Stroke WS] ❌ Failed to send stroke:', error);
      // Queue message for retry
      messageQueue.push(data);
    }
  } else {
    console.warn('[Stroke WS] ⚠️ Not connected, queueing message');
    // Queue message to send when reconnected
    messageQueue.push(data);
  }
}

export function sendSessionUpdate(data: any) {
  if (stompClient?.connected && currentSession) {
    try {
      stompClient.publish({
        destination: `/app/sessions/${currentSession}`,
        body: JSON.stringify(data)
      });
      console.log('[Stroke WS] ✅ Session update sent successfully');
    } catch (error) {
      console.error('[Stroke WS] ❌ Failed to send session update:', error);
    }
  } else {
    console.warn('[Stroke WS] ⚠️ Not connected, cannot send session update');
  }
}

// Get connection status
export function isStrokeSocketConnected(): boolean {
  return stompClient?.connected ?? false;
}

// Get queued message count
export function getQueuedMessageCount(): number {
  return messageQueue.length;
}

export function disconnectStrokeSocket() {
  console.log('[Stroke WS] Disconnecting intentionally');
  isIntentionalDisconnect = true;

  // Clean up subscriptions
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }
  if (sessionSubscription) {
    sessionSubscription.unsubscribe();
    sessionSubscription = null;
  }

  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  currentSession = null;
  messageCallback = null;
  sessionCallback = null;
  reconnectAttempts = 0;
  messageQueue = [];
  isIntentionalDisconnect = false;
}
