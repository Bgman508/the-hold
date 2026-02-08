# THE HOLD - Build Verification Checklist

## Quality Gates

### 1. Docker Compose Up
```bash
docker compose up --build
```
**Expected Result**: Both services start without errors
- Next.js on http://localhost:3000
- WebSocket on ws://localhost:3001

### 2. Two Tabs Presence Test
```bash
# Open http://localhost:3000 in two browser tabs
# Click "Enter" in both
```
**Expected Result**: Presence count shows "2 present" in both tabs within 1 second

### 3. Audio Playback Test
```bash
# Enter a moment
# Listen for 10 minutes
```
**Expected Result**: 
- Audio plays continuously
- No clipping or hard stops
- Smooth, evolving ambient sound

### 4. CPU Usage Check
```bash
# While audio is playing
htop or Activity Monitor
```
**Expected Result**: CPU usage remains reasonable (< 20% on modern hardware)

### 5. No Social Features Verification
**Expected Result**:
- No user profiles
- No likes, comments, shares
- Only presence count visible
- No feeds or catalogs

### 6. No Placeholder Text
```bash
grep -r "TODO\|FIXME\|placeholder\|coming soon" src/ --include="*.tsx" --include="*.ts"
```
**Expected Result**: No matches found

### 7. Tests Pass
```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run test:unit
npm run test:e2e
```
**Expected Result**: All tests pass

## File Completeness Check

### Required Files Exist
- [x] `package.json` - Dependencies and scripts
- [x] `tsconfig.json` - TypeScript configuration
- [x] `next.config.js` - Next.js configuration with `output: 'standalone'`
- [x] `tailwind.config.ts` - Tailwind with design tokens
- [x] `docker-compose.yml` - Multi-service orchestration
- [x] `Dockerfile` - Next.js container
- [x] `Dockerfile.ws` - WebSocket container
- [x] `.env.example` - Environment template
- [x] `.gitignore` - Git ignore rules
- [x] `prisma/schema.prisma` - Database schema
- [x] `prisma/seed.ts` - Database seed
- [x] `.github/workflows/ci.yml` - CI pipeline

### Source Files
- [x] `src/app/page.tsx` - Home screen
- [x] `src/app/moment/page.tsx` - Moment page
- [x] `src/app/layout.tsx` - Root layout with fonts
- [x] `src/app/api/health/route.ts` - Health check
- [x] `src/app/api/moment/current/route.ts` - Get live moment
- [x] `src/app/api/session/begin/route.ts` - Start session
- [x] `src/app/api/session/end/route.ts` - End session
- [x] `src/websocket/ws-server.ts` - WebSocket server
- [x] `src/websocket/presence-service.ts` - Presence tracking
- [x] `src/lib/audio/engine.ts` - Audio engine
- [x] `src/lib/prisma.ts` - Database client
- [x] `src/lib/session.ts` - Session management
- [x] `src/lib/rate-limiter.ts` - Rate limiting
- [x] `src/hooks/use-websocket.ts` - WebSocket hook
- [x] `src/hooks/use-audio.ts` - Audio hook
- [x] `src/hooks/use-presence.ts` - Presence hook
- [x] `src/components/ui/button.tsx` - Button component
- [x] `src/components/presence-indicator.tsx` - Presence UI
- [x] `src/components/sanctuary-text.tsx` - Microcopy rotator
- [x] `public/manifest.json` - PWA manifest

### Test Files
- [x] `vitest.config.ts` - Vitest configuration
- [x] `playwright.config.ts` - Playwright configuration
- [x] `e2e/home.spec.ts` - Home page E2E test
- [x] `e2e/moment.spec.ts` - Moment page E2E test
- [x] `e2e/websocket.spec.ts` - WebSocket E2E test
- [x] `e2e/audio.spec.ts` - Audio E2E test
- [x] `src/__tests__/lib/session.test.ts` - Session unit tests
- [x] `src/__tests__/lib/rate-limiter.test.ts` - Rate limiter tests
- [x] `src/__tests__/types/rbac.test.ts` - RBAC tests

### Documentation
- [x] `README.md` - Main documentation
- [x] `SECURITY.md` - Security policy
- [x] `CONTRIBUTING.md` - Contribution guidelines
- [x] `THE_HOLD_Design_System_v1.md` - Design system

## Manual Testing Steps

### Home Page
1. Navigate to http://localhost:3000
2. Verify:
   - [ ] "You Are Held" title visible
   - [ ] "A quiet space to simply be." subtitle
   - [ ] "Enter" button present
   - [ ] Dark background (#0D0D0F)
   - [ ] Premium typography (Cormorant Garamond)
   - [ ] Fade-in animation on load

### Enter Moment
1. Click "Enter" button
2. Verify:
   - [ ] Transition to moment page
   - [ ] Audio starts playing
   - [ ] Presence count shows "1 present"
   - [ ] Rotating microcopy appears
   - [ ] "Leave quietly" button visible

### Two-Tab Presence
1. Open second tab to same URL
2. Click "Enter" in second tab
3. Verify:
   - [ ] Both tabs show "2 present"
   - [ ] Updates within 1 second

### Leave Moment
1. Click "Leave quietly"
2. Verify:
   - [ ] Exit screen shows "You were held."
   - [ ] Auto-returns to home after 4s
   - [ ] Audio fades out smoothly

### Error Handling
1. Stop WebSocket server
2. Refresh page
3. Verify:
   - [ ] Graceful error message
   - [ ] "Enter" button disabled
   - [ ] Calm, non-alarming message

## Security Verification

- [ ] No PII in database
- [ ] Session tokens are random
- [ ] IP addresses are hashed
- [ ] CSP headers active
- [ ] Rate limiting enabled
- [ ] No external trackers

## Performance Checks

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 500KB (gzipped)

## Sign-Off

| Check | Status | Notes |
|-------|--------|-------|
| Docker Compose | ⬜ | |
| Two Tabs | ⬜ | |
| Audio 10min | ⬜ | |
| CPU Usage | ⬜ | |
| No Social Features | ⬜ | |
| No Placeholders | ⬜ | |
| Tests Pass | ⬜ | |

**Verified By**: _________________ **Date**: _________________
