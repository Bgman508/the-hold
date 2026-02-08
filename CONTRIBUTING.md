# Contributing to THE HOLD

Thank you for your interest in contributing to THE HOLD. This document outlines our principles and guidelines.

## Core Principles

THE HOLD is a **sanctuary-first** product. All contributions must respect:

1. **Anonymity**: No PII, no accounts, no tracking
2. **Sacred UX**: Calm, minimal, no gamification
3. **Presence over Identity**: Only anonymous count as social signal
4. **Continuous Audio**: Seamless, adaptive, never jarring

## NEVER ADD List

The following features are **explicitly prohibited** and will not be merged:

### Social Features (NEVER)
- User profiles or avatars
- Friend/follower systems
- Direct messaging or chat
- Comments or reactions
- Likes, shares, reposts
- Leaderboards or rankings
- Social login (Google, Facebook, etc.)
- User-generated content feeds

### Tracking & Analytics (NEVER)
- Google Analytics
- Mixpanel, Amplitude, Segment
- Facebook Pixel
- Hotjar, FullStory, session recording
- Fingerprinting libraries
- Behavioral tracking
- A/B testing frameworks

### PII Storage (NEVER)
- Email addresses (except Council admin)
- Phone numbers
- Real names
- Raw IP addresses
- Device IDs or fingerprints
- Location data
- Social media handles

### Engagement Bait (NEVER)
- Push notifications
- Email newsletters
- "Rate this moment" prompts
- Share buttons
- Replay functionality
- Download options
- Playlist creation

### Chat Features (NEVER)
- Text chat
- Voice chat
- Reactions/emojis
- Typing indicators
- Message persistence

## What We Welcome

### Audio Improvements
- Better procedural synthesis
- Smoother crossfades
- New contemplative textures
- CPU optimizations

### UX Refinements
- Accessibility improvements
- Reduced-motion support
- Better error states
- Calmer animations

### Performance
- Faster load times
- Lower memory usage
- Better offline support
- Smaller bundle size

### Security
- Vulnerability fixes
- Rate limiting improvements
- Audit logging enhancements
- Dependency updates

### Infrastructure
- Deployment improvements
- Monitoring (non-invasive)
- Health checks
- Documentation

## Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/description`
3. **Make** your changes
4. **Test**: `npm run test`
5. **Lint**: `npm run lint`
6. **Commit** with clear message
7. **Push** and create Pull Request

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types

### Components
- Functional components
- Custom hooks for logic
- Props interfaces defined

### Styling
- TailwindCSS only
- Design tokens from spec
- Dark-first palette

### Testing
- Unit tests for utilities
- E2E tests for flows
- All tests must pass

## Commit Messages

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(audio): add breath-paced rhythm generator

Implements procedural breath cycle with 4s inhale, 6s exhale.
```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Describe changes clearly
4. Reference any related issues
5. Wait for review

## Questions?

Open a discussion (not an issue) for:
- Feature proposals
- Architecture questions
- Clarifications

## Code of Conduct

- Be respectful
- Assume good intent
- Focus on the work
- Welcome newcomers

---

By contributing, you agree to uphold THE HOLD's principles of anonymity, sacred UX, and presence over identity.
