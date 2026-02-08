'use client';

import { useCallback, useEffect } from 'react';
import { useAppStore, type Session } from '@/lib/store';

// ============================================================================
// Types
// ============================================================================

interface UseSessionReturn {
  session: Session | null;
  isAuthenticated: boolean;
  beginSession: () => Promise<void>;
  endSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useSession(): UseSessionReturn {
  const { 
    session, 
    setSession, 
    beginSession: storeBeginSession, 
    endSession: storeEndSession,
    setError,
  } = useAppStore();

  const isAuthenticated = !!session?.token;

  // Refresh session if it's about to expire
  const refreshSession = useCallback(async () => {
    if (!session?.token) return;
    
    try {
      // Check if session is about to expire (within 5 minutes)
      const expiresAt = new Date(session.expiresAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (expiresAt - now < fiveMinutes) {
        // Session is about to expire, refresh it
        const response = await fetch('/api/session/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setSession({
            ...session,
            token: data.token,
            expiresAt: data.expiresAt,
          });
        }
      }
    } catch (error) {
      // Silently fail - session refresh is not critical
      console.warn('Failed to refresh session:', error);
    }
  }, [session, setSession]);

  // Auto-refresh session periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      refreshSession();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshSession]);

  // Handle session expiration
  useEffect(() => {
    if (!session?.expiresAt) return;
    
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    if (timeUntilExpiry <= 0) {
      // Session has already expired
      setSession(null);
      setError('Your session has expired. Please enter again.');
      return;
    }
    
    // Set timeout to clear session when it expires
    const timeout = setTimeout(() => {
      setSession(null);
      setError('Your session has expired. Please enter again.');
    }, timeUntilExpiry);
    
    return () => clearTimeout(timeout);
  }, [session, setSession, setError]);

  return {
    session,
    isAuthenticated,
    beginSession: storeBeginSession,
    endSession: storeEndSession,
    refreshSession,
  };
}
