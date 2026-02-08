import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type AppState = 
  | 'LANDING'      // Initial screen, user outside
  | 'ENTERING'     // User clicked Enter, loading
  | 'IN_MOMENT'    // User inside, audio playing
  | 'LEAVING'      // User initiated exit
  | 'EXITED';      // Exit complete, message shown

export type ConnectionStatus = 
  | 'connected' 
  | 'connecting' 
  | 'disconnected' 
  | 'error';

export type AudioState = 
  | 'idle' 
  | 'loading' 
  | 'playing' 
  | 'paused' 
  | 'error';

export interface Moment {
  id: string;
  title: string;
  description?: string;
  audioUrl?: string;
  isLive: boolean;
  startedAt?: string;
}

export interface Session {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface AppStore {
  // State
  currentState: AppState;
  currentMoment: Moment | null;
  session: Session | null;
  presenceCount: number;
  connectionStatus: ConnectionStatus;
  audioState: AudioState;
  audioVolume: number;
  microcopyIndex: number;
  error: string | null;
  
  // Actions
  setState: (state: AppState) => void;
  setMoment: (moment: Moment | null) => void;
  setSession: (session: Session | null) => void;
  setPresenceCount: (count: number) => void;
  incrementPresence: () => void;
  decrementPresence: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setAudioState: (state: AudioState) => void;
  setAudioVolume: (volume: number) => void;
  setMicrocopyIndex: (index: number) => void;
  nextMicrocopy: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  
  // Session actions
  beginSession: () => Promise<void>;
  endSession: () => Promise<void>;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  currentState: 'LANDING' as AppState,
  currentMoment: null as Moment | null,
  session: null as Session | null,
  presenceCount: 0,
  connectionStatus: 'disconnected' as ConnectionStatus,
  audioState: 'idle' as AudioState,
  audioVolume: 0.7,
  microcopyIndex: 0,
  error: null as string | null,
};

// ============================================================================
// Sanctuary Microcopy Phrases
// ============================================================================

export const SANCTUARY_PHRASES = [
  'You are not alone in this.',
  'Breathe. There is no rush here.',
  'This space is yours for as long as you need.',
  'Others are here with you, in silence.',
  'Rest is not a reward. It is a need.',
  'You don\'t have to hold everything right now.',
  'There is nothing to do here. Just be.',
  'The world can wait.',
  'You are allowed to pause.',
  'This moment belongs to you.',
];

// ============================================================================
// Store
// ============================================================================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // State setters
      setState: (state) => set({ currentState: state }),
      setMoment: (moment) => set({ currentMoment: moment }),
      setSession: (session) => set({ session }),
      setPresenceCount: (count) => set({ presenceCount: Math.max(0, count) }),
      incrementPresence: () => set((s) => ({ presenceCount: s.presenceCount + 1 })),
      decrementPresence: () => set((s) => ({ presenceCount: Math.max(0, s.presenceCount - 1) })),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setAudioState: (state) => set({ audioState: state }),
      setAudioVolume: (volume) => set({ audioVolume: Math.max(0, Math.min(1, volume)) }),
      setMicrocopyIndex: (index) => set({ microcopyIndex: index }),
      nextMicrocopy: () => set((s) => ({ 
        microcopyIndex: (s.microcopyIndex + 1) % SANCTUARY_PHRASES.length 
      })),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      // Reset to initial state
      reset: () => set({
        ...initialState,
        // Keep session if it exists for continuity
        session: get().session,
      }),
      
      // Begin a new session
      beginSession: async () => {
        const store = get();
        
        try {
          set({ currentState: 'ENTERING', error: null });
          
          // Call the API to begin a session
          const response = await fetch('/api/session/begin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to begin session');
          }
          
          const data = await response.json();
          
          set({
            session: {
              id: data.sessionId,
              token: data.token,
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
            },
            currentState: 'IN_MOMENT',
          });
          
        } catch (error) {
          set({
            currentState: 'LANDING',
            error: error instanceof Error ? error.message : 'Failed to begin session',
          });
        }
      },
      
      // End the current session
      endSession: async () => {
        const store = get();
        const { session } = store;
        
        if (!session) {
          set({ currentState: 'EXITED' });
          return;
        }
        
        try {
          set({ currentState: 'LEAVING' });
          
          // Call the API to end the session
          const response = await fetch('/api/session/end', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.token}`,
            },
          });
          
          // Even if the API fails, we still transition to exited
          // The session is cleaned up server-side eventually
          
          set({
            session: null,
            currentState: 'EXITED',
          });
          
        } catch (error) {
          // Still transition to exited on error
          set({
            session: null,
            currentState: 'EXITED',
          });
        }
      },
    }),
    {
      name: 'the-hold-storage',
      partialize: (state) => ({
        // Only persist non-sensitive data
        audioVolume: state.audioVolume,
      }),
    }
  )
);

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

export const selectCurrentState = (state: AppStore) => state.currentState;
export const selectIsInMoment = (state: AppStore) => state.currentState === 'IN_MOMENT';
export const selectPresenceCount = (state: AppStore) => state.presenceCount;
export const selectConnectionStatus = (state: AppStore) => state.connectionStatus;
export const selectIsConnected = (state: AppStore) => state.connectionStatus === 'connected';
export const selectCurrentMicrocopy = (state: AppStore) => 
  SANCTUARY_PHRASES[state.microcopyIndex];
