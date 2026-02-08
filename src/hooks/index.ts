// ============================================================================
// THE HOLD - Hook Exports
// ============================================================================

export { useWebSocket, getWebSocketUrl } from './use-websocket';
export { usePresence } from './use-presence';
export { useSession } from './use-session';

// Audio hooks
export {
  useAudio,
  useAudioState,
  useIsPlaying,
  useSessionTime,
  useAudioButton,
  type UseAudioOptions,
} from './use-audio';

// Legacy exports (for backward compatibility)
export { useAudioEngine } from '@/components/audio-engine';
