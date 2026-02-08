'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore, type ConnectionStatus } from '@/lib/store';

// ============================================================================
// Types
// ============================================================================

interface WebSocketMessage {
  type: string;
  payload?: unknown;
  timestamp?: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  sendMessage: (message: WebSocketMessage) => void;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  
  const { setConnectionStatus, connectionStatus } = useAppStore();
  const [isConnected, setIsConnected] = useState(false);

  // Clear reconnect timer
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || isUnmountingRef.current) return;
    
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    try {
      setConnectionStatus('connecting');
      
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        if (isUnmountingRef.current) {
          ws.close();
          return;
        }
        
        reconnectCountRef.current = 0;
        setConnectionStatus('connected');
        setIsConnected(true);
        onConnect?.();
      };
      
      ws.onmessage = (event) => {
        if (isUnmountingRef.current) return;
        
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        if (isUnmountingRef.current) return;
        
        setConnectionStatus('disconnected');
        setIsConnected(false);
        onDisconnect?.();
        
        // Attempt reconnection if enabled and under max attempts
        if (enabled && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * reconnectCountRef.current); // Exponential backoff
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          setConnectionStatus('error');
        }
      };
      
      ws.onerror = (error) => {
        if (isUnmountingRef.current) return;
        
        setConnectionStatus('error');
        onError?.(error);
      };
      
    } catch (error) {
      setConnectionStatus('error');
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, enabled, reconnectAttempts, reconnectInterval, onMessage, onConnect, onDisconnect, onError, setConnectionStatus]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearReconnectTimer();
    
    if (wsRef.current) {
      // Remove event listeners to prevent reconnection attempts
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setIsConnected(false);
  }, [clearReconnectTimer, setConnectionStatus]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }, []);

  // Connect on mount and when enabled changes
  useEffect(() => {
    isUnmountingRef.current = false;
    
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      isUnmountingRef.current = true;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Handle visibility change - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && !isConnected) {
        reconnectCountRef.current = 0;
        connect();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isConnected, connect]);

  return {
    sendMessage,
    connectionStatus,
    isConnected,
  };
}

// ============================================================================
// Default WebSocket URL helper
// ============================================================================

export function getWebSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Use the WebSocket server port from environment or default
  const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '3001';
  
  // In development, connect to the separate WebSocket server
  if (process.env.NODE_ENV === 'development') {
    return `${protocol}//${host.split(':')[0]}:${wsPort}`;
  }
  
  // In production, use the same host
  return `${protocol}//${host}/ws`;
}
