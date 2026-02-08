# THE HOLD

> A sanctuary-first cultural infrastructure product. Anonymous ephemeral connection spaces for simply being.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Bgman508/the-hold)

**Live Demo**: *Coming soon* | **Repository**: https://github.com/Bgman508/the-hold

## Overview

**THE HOLD** is not a music streaming app. It is a sanctuary-first cultural infrastructure product that uses continuous adaptive audio to regulate and connect humans through shared time.

### Core Principles

- **No social features**: No feeds, likes, comments, followers, shares
- **Anonymous only**: No PII, no accounts, no tracking
- **Presence, not identity**: Only signal is an anonymous count
- **Sacred UX**: Calm, minimal, no gamification
- **Continuous audio**: Procedural ambient that evolves imperceptibly

### Phase I: Sanctuary (MVP)

The MVP includes only the Sanctuary phase:
- One primary action: "Enter"
- Live moment: "You Are Held"
- Anonymous presence counter
- Continuous adaptive audio
- One exit: "Leave quietly"

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (optional, for containerized deployment)

### Local Development

```bash
# 1. Clone the repository
git clone <repository-url>
cd the-hold

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your secrets (see Environment Variables)

# 4. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 5. Run development server
npm run dev
```

The application will be available at:
- **App**: http://localhost:3000
- **WebSocket**: ws://localhost:3001

### Docker Deployment

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with production values

# 2. Start all services
docker compose up -d

# 3. View logs
docker compose logs -f

# 4. Stop services
docker compose down
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite database path |
| `JWT_SECRET` | Yes | Secret for JWT tokens (generate with `openssl rand -base64 32`) |
| `IP_HASH_SECRET` | Yes | Salt for IP hashing (generate with `openssl rand -base64 32`) |
| `COUNCIL_EMAIL` | Yes | Admin email for Council access |
| `COUNCIL_PASSWORD` | Yes | Admin password for Council access |
| `WS_PORT` | No | WebSocket server port (default: 3001) |
| `ALLOWED_ORIGINS` | No | CORS allowed origins |
| `NEXT_PUBLIC_WS_URL` | No | Public WebSocket URL |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  WebSocket API  │────▶│     SQLite      │
│   (Port 3000)   │     │  (Port 3001)    │     │   (Prisma)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  PWA Frontend   │     │  Presence Sync  │
│  (React/TS)     │     │  (Real-time)    │
└─────────────────┘     └─────────────────┘
```

### Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Framer Motion
- **Backend**: Next.js API Routes, WebSocket (`ws`)
- **Database**: SQLite + Prisma ORM
- **Audio**: Web Audio API (procedural synthesis)
- **Tests**: Vitest (unit), Playwright (e2e)

## Project Structure

```
the-hold/
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Prisma schema
│   └── seed.ts             # Database seed script
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── moment/         # Moment page
│   │   ├── page.tsx        # Home page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── ui/             # UI components
│   │   └── ...             # Feature components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── audio/          # Audio engine
│   │   ├── prisma.ts       # Database client
│   │   └── ...             # Other utilities
│   ├── types/              # TypeScript types
│   └── websocket/          # WebSocket server
├── public/                 # Static assets
│   ├── audio/loops/        # Audio loop assets
│   └── icons/              # PWA icons
├── e2e/                    # Playwright E2E tests
├── src/__tests__/          # Vitest unit tests
└── docker-compose.yml      # Docker orchestration
```

## Available Scripts

```bash
# Development
npm run dev              # Start development servers
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests (Vitest)
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Run E2E tests with UI

# Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript check
npm run security:audit   # Run npm audit
```

## Testing

### Unit Tests

```bash
npm run test:unit
```

Tests cover:
- Session management
- Rate limiting
- RBAC permissions
- Input validation
- Audio engine state machine

### E2E Tests

```bash
# Install Playwright browsers (first time)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui
```

E2E tests cover:
- Home page loads
- Enter/leave moment flow
- Audio playback
- Real-time presence (two tabs)
- WebSocket reconnection
- Error states

## Deployment

### Single VPS (Docker)

```bash
# On your server
git clone <repository-url>
cd the-hold

cp .env.example .env
# Edit .env with production values

docker compose up -d
```

### Render

1. Create a new Web Service
2. Connect your repository
3. Set environment variables
4. Deploy

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set JWT_SECRET="..." IP_HASH_SECRET="..."

# Deploy
fly deploy
```

## Governance

THE HOLD uses a three-tier governance model:

- **Council**: Full governance (create/activate moments, manage architects)
- **Architect**: Create moments (future)
- **Community**: Basic access (future)

In the MVP, only Council is active. Access the admin features by logging in with Council credentials.

## Security

- No PII storage
- Anonymous sessions only
- Rate limiting on all endpoints
- Input validation with Zod
- CSP headers
- Audit logging for governance actions

See [SECURITY.md](./SECURITY.md) for details.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**NEVER ADD**:
- User profiles or social features
- Tracking or analytics
- PII storage
- Chat or messaging
- Likes, comments, followers

## License

[License TBD]

---

<p align="center">
  <em>You are held.</em>
</p>
