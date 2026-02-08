/**
 * THE HOLD - Audio Engine Demo Component
 * 
 * Example component demonstrating audio engine integration.
 * Shows state visualization and basic controls.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAudio, useAudioState, useIsPlaying, useSessionTime } from '../hooks/use-audio';
import { AudioState } from '../lib/audio/types';

// State display names
const STATE_DISPLAY: Record<AudioState, string> = {
  idle: 'Idle',
  entry: 'Entry (Fade In)',
  settle: 'Settle (Establish)',
  hold: 'Hold (Sustain)',
  soften: 'Soften (Fade Out)',
  exit: 'Exit (Silent)',
  suspended: 'Suspended',
  error: 'Error',
};

// State colors for visualization
const STATE_COLORS: Record<AudioState, string> = {
  idle: '#666',
  entry: '#4a9',
  settle: '#49a',
  hold: '#a49',
  soften: '#a94',
  exit: '#944',
  suspended: '#888',
  error: '#f00',
};

interface AudioDemoProps {
  showVisualizer?: boolean;
  compact?: boolean;
}

export function AudioDemo({ showVisualizer = true, compact = false }: AudioDemoProps) {
  // Audio hook
  const audio = useAudio({
    onStateChange: (from, to, sessionData) => {
      console.log(`Audio state: ${from} -> ${to}`, sessionData);
    },
    onAdaptation: (level, sessionData) => {
      console.log(`Adaptation level: ${(level * 100).toFixed(1)}%`);
    },
  });

  // Local state
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle start
  const handleStart = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      await audio.initialize();
      audio.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audio');
      console.error('Audio initialization failed:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [audio]);

  // Handle stop
  const handleStop = useCallback(() => {
    audio.stop();
  }, [audio]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Compact mode
  if (compact) {
    return (
      <div className="audio-demo-compact">
        <button
          onClick={audio.isPlaying ? handleStop : handleStart}
          disabled={isInitializing}
          className={`audio-button ${audio.isPlaying ? 'playing' : ''}`}
        >
          {isInitializing ? 'Initializing...' : audio.isPlaying ? 'Stop' : 'Start'}
        </button>
        
        {audio.isPlaying && (
          <span className="session-time">
            {formatTime(audio.sessionTime)}
          </span>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="audio-demo">
      <h2>THE HOLD - Audio Engine</h2>
      
      {/* State Visualization */}
      {showVisualizer && (
        <div className="state-visualizer">
          <div 
            className="state-indicator"
            style={{ backgroundColor: STATE_COLORS[audio.state] }}
          />
          <span className="state-label">
            {STATE_DISPLAY[audio.state]}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        {!audio.isInitialized ? (
          <button
            onClick={handleStart}
            disabled={isInitializing}
            className="btn-primary"
          >
            {isInitializing ? 'Initializing...' : 'Initialize Audio'}
          </button>
        ) : (
          <>
            {audio.isPlaying ? (
              <button onClick={handleStop} className="btn-stop">
                Stop Audio
              </button>
            ) : (
              <button onClick={audio.start} className="btn-primary">
                Start Audio
              </button>
            )}
            
            <button 
              onClick={audio.state === 'suspended' ? audio.resume : audio.pause}
              className="btn-secondary"
            >
              {audio.state === 'suspended' ? 'Resume' : 'Pause'}
            </button>
          </>
        )}
      </div>

      {/* Status Display */}
      {audio.isInitialized && (
        <div className="status-display">
          <div className="status-row">
            <span className="label">Session Time:</span>
            <span className="value">{formatTime(audio.sessionTime)}</span>
          </div>
          
          <div className="status-row">
            <span className="label">Adaptation:</span>
            <span className="value">
              {(audio.adaptationLevel * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="status-row">
            <span className="label">Initialized:</span>
            <span className="value">{audio.isInitialized ? 'Yes' : 'No'}</span>
          </div>
        </div>
      )}

      {/* Volume Control */}
      {audio.isInitialized && (
        <div className="volume-control">
          <label htmlFor="master-gain">Master Volume</label>
          <input
            id="master-gain"
            type="range"
            min="0"
            max="1"
            step="0.01"
            defaultValue="0.7"
            onChange={(e) => audio.setMasterGain(parseFloat(e.target.value))}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {/* State Flow Visualization */}
      {showVisualizer && (
        <div className="state-flow">
          <h3>State Flow</h3>
          <div className="flow-diagram">
            {(['idle', 'entry', 'settle', 'hold', 'soften', 'exit'] as AudioState[]).map((state, index) => (
              <React.Fragment key={state}>
                <div 
                  className={`flow-node ${audio.state === state ? 'active' : ''}`}
                  style={{ 
                    borderColor: STATE_COLORS[state],
                    backgroundColor: audio.state === state ? STATE_COLORS[state] : 'transparent'
                  }}
                >
                  {STATE_DISPLAY[state]}
                </div>
                {index < 5 && <div className="flow-arrow">→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        .audio-demo {
          padding: 2rem;
          max-width: 600px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
        }

        h2 {
          margin-bottom: 1.5rem;
          color: #333;
        }

        .state-visualizer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .state-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }

        .state-label {
          font-weight: 500;
          color: #333;
        }

        .controls {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #4a9;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3a8;
        }

        .btn-stop {
          background: #a44;
          color: white;
        }

        .btn-stop:hover {
          background: #933;
        }

        .btn-secondary {
          background: #888;
          color: white;
        }

        .btn-secondary:hover {
          background: #777;
        }

        .status-display {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }

        .status-row:last-child {
          border-bottom: none;
        }

        .label {
          color: #666;
        }

        .value {
          font-weight: 500;
          color: #333;
          font-family: monospace;
        }

        .volume-control {
          margin-bottom: 1.5rem;
        }

        .volume-control label {
          display: block;
          margin-bottom: 0.5rem;
          color: #666;
        }

        .volume-control input {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          outline: none;
        }

        .error-message {
          padding: 1rem;
          background: #fee;
          color: #c00;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .state-flow {
          margin-top: 2rem;
        }

        .state-flow h3 {
          margin-bottom: 1rem;
          color: #666;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .flow-diagram {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .flow-node {
          padding: 0.5rem 0.75rem;
          border: 2px solid;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #666;
          transition: all 0.3s ease;
        }

        .flow-node.active {
          color: white;
          font-weight: 500;
        }

        .flow-arrow {
          color: #ccc;
          font-size: 1rem;
        }

        /* Compact mode */
        .audio-demo-compact {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .audio-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          background: #4a9;
          color: white;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .audio-button:hover:not(:disabled) {
          background: #3a8;
        }

        .audio-button.playing {
          background: #a44;
        }

        .audio-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .session-time {
          font-family: monospace;
          color: #666;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

// Simple standalone button component
export function AudioButton() {
  const audio = useAudio();
  const [isInitializing, setIsInitializing] = useState(false);

  const handleClick = useCallback(async () => {
    if (!audio.isInitialized) {
      setIsInitializing(true);
      try {
        await audio.initialize();
        audio.start();
      } finally {
        setIsInitializing(false);
      }
    } else if (audio.isPlaying) {
      audio.stop();
    } else {
      audio.start();
    }
  }, [audio]);

  return (
    <button
      onClick={handleClick}
      disabled={isInitializing}
      className={`audio-control-button ${audio.isPlaying ? 'active' : ''}`}
    >
      {isInitializing ? '...' : audio.isPlaying ? '◼' : '▶'}
      
      <style jsx>{`
        .audio-control-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: #333;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .audio-control-button:hover:not(:disabled) {
          background: #444;
          transform: scale(1.05);
        }

        .audio-control-button.active {
          background: #a44;
        }

        .audio-control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}

export default AudioDemo;
