'use client';

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ServiceWorkerState {
  isRegistered: boolean;
  isUpdating: boolean;
  error: Error | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  update: () => Promise<void>;
  unregister: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isUpdating: false,
    error: null,
  });

  // Register service worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, error: new Error('Service Worker not supported') }));
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const registerSW = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        
        setState(prev => ({ ...prev, isRegistered: true }));

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                setState(prev => ({ ...prev, isUpdating: true }));
              }
            });
          }
        });

      } catch (err) {
        setState(prev => ({ 
          ...prev, 
          error: err instanceof Error ? err : new Error('Failed to register Service Worker') 
        }));
      }
    };

    registerSW();

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Update service worker
  const update = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;

    setState(prev => ({ ...prev, isUpdating: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      
      // Force reload to activate new service worker
      window.location.reload();
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isUpdating: false,
        error: err instanceof Error ? err : new Error('Failed to update Service Worker') 
      }));
    }
  }, []);

  // Unregister service worker
  const unregister = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      setState({ isRegistered: false, isUpdating: false, error: null });
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err : new Error('Failed to unregister Service Worker') 
      }));
    }
  }, []);

  return {
    ...state,
    update,
    unregister,
  };
}

// ============================================================================
// Utility: Check if app is installable
// ============================================================================

export function usePwaInstall(): {
  isInstallable: boolean;
  promptInstall: () => void;
} {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferredPrompt) return;

    // Show the install prompt
    (deferredPrompt as unknown as { prompt: () => void }).prompt();

    // Wait for the user to respond
    (deferredPrompt as unknown as { userChoice: Promise<{ outcome: string }> }).userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    });
  }, [deferredPrompt]);

  return { isInstallable, promptInstall };
}
