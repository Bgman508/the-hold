# THE HOLD - Frontend Documentation

## Overview

THE HOLD is a sanctuary-first Progressive Web App (PWA) built with Next.js 14, TypeScript, and TailwindCSS. It provides an anonymous, ephemeral space for quiet connection.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS with custom design tokens
- **Animation**: Framer Motion
- **State Management**: Zustand
- **Fonts**: Cormorant Garamond (primary), Inter (secondary)
- **PWA**: Custom service worker with offline support

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (backend)
│   ├── moment/            # Moment page
│   ├── error.tsx          # Error boundary
│   ├── global-error.tsx   # Global error handler
│   ├── layout.tsx         # Root layout with fonts
│   ├── loading.tsx        # Loading state
│   ├── not-found.tsx      # 404 page
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── sw.ts              # Service worker
├── components/            # React components
│   ├── ui/               # UI primitives
│   │   └── button.tsx    # Button component
│   ├── audio-engine.tsx  # Audio management
│   ├── error-state.tsx   # Error displays
│   ├── loading-state.tsx # Loading states
│   ├── presence-indicator.tsx
│   └── sanctuary-text.tsx
├── hooks/                 # Custom React hooks
│   ├── use-audio.ts
│   ├── use-presence.ts
│   ├── use-service-worker.ts
│   ├── use-session.ts
│   └── use-websocket.ts
├── lib/                   # Utilities and store
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript types
│   └── index.ts
└── middleware.ts          # Next.js middleware

public/
├── icons/                # PWA icons
├── manifest.json         # PWA manifest
└── ...
```

## Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-primary` | `#0D0D0F` | Main background |
| `--color-bg-secondary` | `#141416` | Elevated surfaces |
| `--color-text-primary` | `#F5F5F7` | Primary text |
| `--color-text-secondary` | `#A1A1A6` | Secondary text |
| `--color-accent` | `#C4A77D` | CTA, focus states |

### Typography

- **Primary**: Cormorant Garamond (300, 400, 500)
- **Secondary**: Inter (400, 500, 600)
- **Display**: 48px desktop, 36px mobile

### Motion

- **Easing**: `cubic-bezier(0.22, 1, 0.36, 1)` for entrances
- **Durations**: 150ms (fast), 300ms (normal), 500ms (slow), 800ms (slower)
- **No bounce effects** - ever

## State Management

The app uses Zustand for state management with the following structure:

```typescript
interface AppStore {
  currentState: 'LANDING' | 'ENTERING' | 'IN_MOMENT' | 'LEAVING' | 'EXITED';
  currentMoment: Moment | null;
  session: Session | null;
  presenceCount: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  audioState: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  // ... actions
}
```

## Key Features

### 1. Home Screen
- Centered "You Are Held" title
- "Enter" button with loading state
- Optional presence count display
- Fade-in animations on load

### 2. Moment Page
- Live presence indicator with pulsing dot
- Rotating sanctuary microcopy (30s interval)
- "Leave quietly" pill button
- Audio auto-plays on entry with fade-in
- Escape key to leave

### 3. Exit Screen
- "You were held." message
- Auto-redirect to home after 4 seconds
- Progress indicator

### 4. Error States
- Calm, non-alarming error messages
- WebSocket disconnected: retry option
- Audio failed: continue without audio option
- Server error: refresh option

## WebSocket Integration

Real-time presence updates via WebSocket:

```typescript
const { presenceCount, isConnected } = usePresence({ enabled: true });
```

WebSocket URL: `ws://localhost:3001` (development)

## Audio Engine

Automatic audio management with fade in/out:

```typescript
<AudioEngine
  audioUrl="/audio/ambient.mp3"
  autoPlay={true}
  onError={handleAudioError}
/>
```

## PWA Features

- Offline shell caching
- Service worker with auto-update
- Installable on mobile/desktop
- Custom icons and splash screen

## Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation (Tab, Escape)
- Focus indicators (2px solid accent)
- `prefers-reduced-motion` support
- Screen reader friendly

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Type Check

```bash
npm run type-check
```

### Generate Icons

```bash
npm install sharp
node scripts/generate-icons.js
```

## Environment Variables

```env
# WebSocket server port (client-side)
NEXT_PUBLIC_WS_PORT=3001
```

## API Endpoints

- `GET /api/moment/current` - Get live moment
- `POST /api/session/begin` - Begin session
- `POST /api/session/end` - End session
- `WS /ws` - Real-time presence

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Android (last 2 versions)

## License

Private - All rights reserved.
