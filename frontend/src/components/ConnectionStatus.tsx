/* ==================================================
   ConnectionStatus.tsx
   - Real-time WebSocket connection status indicator
   - Shows connection state for both Stroke and Chat sockets
   - Visual feedback for users
 ================================================== */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { isStrokeSocketConnected, getQueuedMessageCount } from '../lib/strokeSocket';
import { isChatSocketConnected, getChatQueuedMessageCount } from '../lib/chatSocket';

interface ConnectionStatusProps {
  sessionId: string;
}

export function ConnectionStatus({ sessionId }: ConnectionStatusProps) {
  const [strokeConnected, setStrokeConnected] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const [strokeQueue, setStrokeQueue] = useState(0);
  const [chatQueue, setChatQueue] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // Check connection status every second
    const interval = setInterval(() => {
      setStrokeConnected(isStrokeSocketConnected());
      setChatConnected(isChatSocketConnected());
      setStrokeQueue(getQueuedMessageCount());
      setChatQueue(getChatQueuedMessageCount());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const allConnected = strokeConnected && chatConnected;
  const anyDisconnected = !strokeConnected || !chatConnected;
  const hasQueuedMessages = strokeQueue > 0 || chatQueue > 0;

  return (
    <div className="relative">
      {/* Connection Status Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          allConnected
            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            : anyDisconnected
            ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 animate-pulse'
            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
        }`}
        title={allConnected ? 'Connected' : 'Connection Issues'}
      >
        {allConnected ? (
          <Wifi className="w-4 h-4" />
        ) : anyDisconnected ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {allConnected ? 'Connected' : anyDisconnected ? 'Reconnecting...' : 'Disconnected'}
        </span>
        {hasQueuedMessages && (
          <span className="bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {strokeQueue + chatQueue}
          </span>
        )}
      </button>

      {/* Detailed Status Dropdown */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          
          {/* Details Panel */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Connection Status
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {/* Stroke WebSocket Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Drawing (Stroke)</p>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time drawing sync</p>
                </div>
                <div className="flex items-center gap-2">
                  {strokeQueue > 0 && (
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                      {strokeQueue} queued
                    </span>
                  )}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      strokeConnected ? 'bg-green-500' : 'bg-red-500'
                    } ${!strokeConnected && 'animate-pulse'}`}
                  />
                </div>
              </div>

              {/* Chat WebSocket Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Chat</p>
                  <p className="text-xs text-gray-500 mt-0.5">Real-time messaging</p>
                </div>
                <div className="flex items-center gap-2">
                  {chatQueue > 0 && (
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                      {chatQueue} queued
                    </span>
                  )}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      chatConnected ? 'bg-green-500' : 'bg-red-500'
                    } ${!chatConnected && 'animate-pulse'}`}
                  />
                </div>
              </div>

              {/* Status Messages */}
              <div className="pt-3 border-t border-gray-200">
                {allConnected && !hasQueuedMessages && (
                  <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                    <span>✓</span>
                    <span>All systems operational. Your changes are syncing in real-time.</span>
                  </div>
                )}
                {anyDisconnected && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>
                      Connection interrupted. Attempting to reconnect automatically...
                    </span>
                  </div>
                )}
                {hasQueuedMessages && (
                  <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 p-2 rounded mt-2">
                    <span>ℹ️</span>
                    <span>
                      {strokeQueue + chatQueue} message(s) will be sent when connection is restored.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
