'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useWebSocket, getWebSocketUrl } from './use-websocket';

// ============================================================================
// Types
// ============================================================================

interface PresenceMessage {
  type: 'presence' | 'user_joined' | 'user_left' | 'ping' | 'pong';
  payload?: {
    count?: number;
    timestamp?: string;
  };
}

interface UsePresenceOptions {
  enabled?: boolean;
}

interface UsePresenceReturn {
  presenceCount: number;
  isConnected: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function usePresence({ enabled = true }: UsePresenceOptions = {}): UsePresenceReturn {
  const { 
    presenceCount, 
    setPresenceCount, 
    incrementPresence, 
    decrementPresence,
    session,
  } = useAppStore();

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: PresenceMessage) => {
    switch (message.type) {
      case 'presence':
        if (typeof message.payload?.count === 'number') {
          setPresenceCount(message.payload.count);
        }
        break;
        
      case 'user_joined':
        incrementPresence();
        break;
        
      case 'user_left':
        decrementPresence();
        break;
        
      case 'ping':
        // Respond to keep-alive ping
        // This is handled automatically by the WebSocket connection
        break;
        
      default:
        // Ignore unknown message types
        break;
    }
  }, [setPresenceCount, incrementPresence, decrementPresence]);

  // Connect to WebSocket for presence updates
  const { isConnected, sendMessage } = useWebSocket({
    url: getWebSocketUrl(),
    onMessage: handleMessage,
    enabled: enabled && !!session,
    reconnectAttempts: 10,
    reconnectInterval: 2000,
  });

  // Send presence announcement when connected
  useEffect(() => {
    if (isConnected && session) {
      sendMessage({
        type: 'announce',
        payload: {
          sessionId: session.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [isConnected, session, sendMessage]);

  // Fetch initial presence count when enabled
  useEffect(() => {
    if (!enabled) return;
    
    const fetchPresence = async () => {
      try {
        const response = await fetch('/api/moment/current');
        if (response.ok) {
          const data = await response.json();
          if (typeof data.presenceCount === 'number') {
            setPresenceCount(data.presenceCount);
          }
        }
      } catch (error) {
        // Silently fail - presence is not critical
        console.warn('Failed to fetch presence count:', error);
      }
    };
    
    fetchPresence();
  }, [enabled, setPresenceCount]);

  return {
    presenceCount,
    isConnected,
  };
}
