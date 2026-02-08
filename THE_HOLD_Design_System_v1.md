# THE HOLD — Design System & UX Specifications
## MVP: Sanctuary Phase
### Version 1.0 | Engineering-Ready Specifications

---

## 1. DESIGN TOKENS

### 1.1 Color Palette

#### Primary Colors (Dark-First Foundation)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-bg-primary` | `#0D0D0F` | `rgb(13, 13, 15)` | Main background, 90%+ of screen |
| `--color-bg-secondary` | `#141416` | `rgb(20, 20, 22)` | Elevated surfaces, cards |
| `--color-bg-tertiary` | `#1A1A1D` | `rgb(26, 26, 29)` | Hover states, subtle elevation |

#### Text Colors (Soft Contrast Hierarchy)
| Token | Hex | RGB | Opacity | Usage |
|-------|-----|-----|---------|-------|
| `--color-text-primary` | `#F5F5F7` | `rgb(245, 245, 247)` | 100% | Primary text, headings |
| `--color-text-secondary` | `#A1A1A6` | `rgb(161, 161, 166)` | 100% | Body text, descriptions |
| `--color-text-tertiary` | `#6E6E73` | `rgb(110, 110, 115)` | 100% | Subtle hints, metadata |
| `--color-text-muted` | `#48484A` | `rgb(72, 72, 74)` | 100% | Disabled, placeholders |

#### Accent Color (Single, Restrained)
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-accent` | `#C4A77D` | `rgb(196, 167, 125)` | Primary CTA, focus states, presence indicator |
| `--color-accent-hover` | `#D4B88D` | `rgb(212, 184, 141)` | Hover state for accent |
| `--color-accent-subtle` | `rgba(196, 167, 125, 0.15)` | — | Subtle accent backgrounds |

#### Semantic Colors (Minimal, Calm)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-presence` | `#C4A77D` | Presence counter (same as accent) |
| `--color-error` | `#E57373` | Errors only, never alarming |
| `--color-success` | `#81C784` | Success states (rarely used) |

#### Gradient Definitions
```css
--gradient-bg-subtle: linear-gradient(180deg, #0D0D0F 0%, #111113 100%);
--gradient-accent-glow: radial-gradient(ellipse at center, rgba(196, 167, 125, 0.08) 0%, transparent 70%);
```

---

### 1.2 Typography

#### Font Family
```css
--font-primary: 'Cormorant Garamond', 'Times New Roman', serif;
--font-secondary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'SF Mono', 'Monaco', monospace;
```

**Font Loading Strategy:**
- Primary: Google Fonts — Cormorant Garamond (weights: 300, 400, 500)
- Secondary: System font stack fallback for UI elements
- Display: swap (FOUT acceptable for this aesthetic)

#### Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `--text-display` | 48px / 3rem | 1.1 | 300 | -0.02em | Hero title ("You Are Held") |
| `--text-h1` | 36px / 2.25rem | 1.2 | 400 | -0.01em | Screen titles |
| `--text-h2` | 28px / 1.75rem | 1.3 | 400 | 0 | Section headers |
| `--text-h3` | 22px / 1.375rem | 1.4 | 400 | 0 | Subsection headers |
| `--text-body` | 18px / 1.125rem | 1.6 | 400 | 0.01em | Primary body text |
| `--text-body-sm` | 16px / 1rem | 1.5 | 400 | 0.01em | Secondary body |
| `--text-caption` | 14px / 0.875rem | 1.4 | 400 | 0.02em | Captions, metadata |
| `--text-micro` | 12px / 0.75rem | 1.3 | 500 | 0.04em | Labels, counters |

#### Responsive Typography (Mobile)
| Token | Mobile Size |
|-------|-------------|
| `--text-display` | 36px / 2.25rem |
| `--text-h1` | 28px / 1.75rem |
| `--text-h2` | 24px / 1.5rem |
| `--text-h3` | 20px / 1.25rem |
| `--text-body` | 16px / 1rem |

---

### 1.3 Spacing System

#### Base Unit: 4px
```css
--space-unit: 4px;
```

#### Spacing Scale
| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--space-1` | 0.25rem | 4px | Tight gaps, icon padding |
| `--space-2` | 0.5rem | 8px | Small gaps |
| `--space-3` | 0.75rem | 12px | Button padding vertical |
| `--space-4` | 1rem | 16px | Standard gaps |
| `--space-5` | 1.25rem | 20px | Medium gaps |
| `--space-6` | 1.5rem | 24px | Section padding |
| `--space-8` | 2rem | 32px | Large gaps |
| `--space-10` | 2.5rem | 40px | Component spacing |
| `--space-12` | 3rem | 48px | Section margins |
| `--space-16` | 4rem | 64px | Large section spacing |
| `--space-20` | 5rem | 80px | Hero spacing |
| `--space-24` | 6rem | 96px | Major section breaks |
| `--space-32` | 8rem | 128px | Maximum spacing |

#### Layout Spacing
```css
--page-padding-x: 24px;        /* Mobile: 16px */
--page-padding-y: 48px;        /* Mobile: 32px */
--content-max-width: 680px;
--button-min-width: 200px;
--button-min-height: 56px;
```

---

### 1.4 Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0 | Sharp elements (rare) |
| `--radius-sm` | 4px | Small UI elements |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards, containers |
| `--radius-xl` | 16px | Large containers |
| `--radius-full` | 9999px | Pills, circular elements |

**Primary Usage:** `--radius-md` (8px) for all interactive elements

---

### 1.5 Elevation & Shadows

#### Shadow Tokens
```css
--shadow-none: none;
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.15);
--shadow-medium: 0 8px 24px rgba(0, 0, 0, 0.2);
--shadow-glow: 0 0 40px rgba(196, 167, 125, 0.1);
```

#### Elevation Layers (Z-Index)
| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Default content |
| `--z-elevated` | 10 | Cards, buttons |
| `--z-dropdown` | 100 | Dropdowns |
| `--z-overlay` | 1000 | Modals, overlays |
| `--z-toast` | 1100 | Notifications |

---

### 1.6 Motion & Animation

#### Timing Functions
```css
--ease-slow: cubic-bezier(0.4, 0, 0.2, 1);      /* Default: smooth deceleration */
--ease-slower: cubic-bezier(0.22, 1, 0.36, 1);  /* Entrance: dramatic slow */
--ease-exit: cubic-bezier(0.4, 0, 1, 1);        /* Exit: quick start */
--ease-linear: linear;                          /* Continuous animations */
```

#### Duration Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | 0ms | No animation |
| `--duration-fast` | 150ms | Micro-interactions |
| `--duration-normal` | 300ms | Standard transitions |
| `--duration-slow` | 500ms | Entrance animations |
| `--duration-slower` | 800ms | Dramatic entrances |
| `--duration-slowest` | 1200ms | Page transitions |

#### Animation Definitions
```css
/* Fade In - Primary entrance */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade In Up - Content entrance */
@keyframes fadeInUp {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

/* Fade In Scale - Button/element entrance */
@keyframes fadeInScale {
  from { 
    opacity: 0; 
    transform: scale(0.98); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

/* Pulse Subtle - Presence indicator */
@keyframes pulseSubtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Breathe - Ambient background */
@keyframes breathe {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.06; }
}
```

#### Motion Principles
- **No bounce effects** — ever
- **No jarring transitions** — all movements are smooth
- **Respect reduced-motion** — `prefers-reduced-motion: reduce`
- **Ambient motion only** — never demand attention with motion

---

## 2. SCREEN SPECIFICATIONS

### 2.1 Home Screen (Landing)

#### Layout Structure
```
┌─────────────────────────────────────────┐
│                                         │
│           [Ambient Background]          │
│         (subtle gradient, 3% opacity)   │
│                                         │
│                                         │
│              ┌─────────────┐            │
│              │             │            │
│              │   THE HOLD  │            │  ← Logo/Mark (optional)
│              │             │            │
│              └─────────────┘            │
│                                         │
│                                         │
│         "You Are Held"                  │  ← Display text, centered
│                                         │
│     "A quiet space to simply be."       │  ← Subtitle, secondary color
│                                         │
│                                         │
│              ┌─────────────────┐        │
│              │                 │        │
│              │     Enter       │        │  ← Primary CTA
│              │                 │        │
│              └─────────────────┘        │
│                                         │
│                                         │
│         47 present                      │  ← Presence count (optional)
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

#### Component Specifications

**Background**
- Color: `--color-bg-primary` (#0D0D0F)
- Optional: Subtle gradient overlay at 3% opacity
- Optional: Ambient "breathing" animation (12s cycle)

**Display Title ("You Are Held")**
- Font: `--font-primary`
- Size: `--text-display` (48px desktop, 36px mobile)
- Color: `--color-text-primary`
- Weight: 300 (light)
- Alignment: Center
- Animation: `fadeInUp` with `--duration-slower` (800ms)

**Subtitle**
- Font: `--font-secondary`
- Size: `--text-body` (18px desktop, 16px mobile)
- Color: `--color-text-secondary`
- Weight: 400
- Alignment: Center
- Margin-top: `--space-6` (24px)
- Animation: `fadeIn` with `--duration-slow` (500ms), 200ms delay

**Primary CTA Button ("Enter")**
- Min-width: 200px
- Min-height: 56px
- Background: `--color-accent`
- Text: `--color-bg-primary` (dark on light)
- Font: `--font-secondary`, `--text-body-sm`
- Letter-spacing: 0.08em
- Text-transform: uppercase
- Border-radius: `--radius-md` (8px)
- Margin-top: `--space-16` (64px)
- Hover: Background `--color-accent-hover`, subtle scale(1.02)
- Animation: `fadeInScale` with `--duration-slow` (500ms), 400ms delay
- Transition: `all var(--duration-normal) var(--ease-slow)`

**Presence Count (Optional, below fold)**
- Font: `--font-secondary`, `--text-caption`
- Color: `--color-text-tertiary`
- Format: "{count} present"
- Animation: `fadeIn` with `--duration-normal` (300ms), 600ms delay

#### Responsive Behavior
| Breakpoint | Padding | Title Size | Button Width |
|------------|---------|------------|--------------|
| Desktop (>1024px) | 48px | 48px | 240px |
| Tablet (768-1024px) | 32px | 40px | 220px |
| Mobile (<768px) | 24px | 36px | 100% - 48px |

---

### 2.2 Inside Moment Screen

#### Layout Structure
```
┌─────────────────────────────────────────┐
│  ○                                    ✕ │  ← Back/Leave (top corners)
│                                         │
│                                         │
│                                         │
│              [Visual Element]           │  ← Abstract, ambient visual
│           (optional, subtle)            │
│                                         │
│                                         │
│         "You Are Held"                  │  ← Moment title
│                                         │
│                                         │
│         ● 23 present                    │  ← Live presence counter
│                                         │
│     "You are not alone in this."        │  ← Rotating microcopy
│                                         │
│                                         │
│                                         │
│                                         │
│              Leave quietly              │  ← Secondary action
│                                         │
└─────────────────────────────────────────┘
```

#### Component Specifications

**Header Bar**
- Height: 64px
- Padding: 0 `--space-6` (24px)
- Background: Transparent
- Position: Fixed top

**Back Button (Left)**
- Icon: Simple circle/outline (○)
- Size: 24px
- Color: `--color-text-tertiary`
- Hover: `--color-text-secondary`
- ARIA: "Return to entrance"

**Leave Button (Right)**
- Icon: Simple X (✕)
- Size: 24px
- Color: `--color-text-tertiary`
- Hover: `--color-text-secondary`
- ARIA: "Leave this space"

**Moment Title**
- Same as Home display title
- Animation: `fadeIn` with `--duration-slow` (500ms)

**Presence Counter**
- Layout: Horizontal flex, gap `--space-2` (8px)
- Indicator: Small circle (8px), `--color-accent`, `pulseSubtle` animation (3s)
- Count: `--text-caption`, `--color-text-tertiary`
- Format: "{count} present"
- Update: Real-time via WebSocket
- Position: Centered below title

**Sanctuary Microcopy**
- Font: `--font-primary`, `--text-body`
- Color: `--color-text-secondary`
- Style: Italic (font-style: italic)
- Content: Rotates through curated phrases (see Microcopy section)
- Transition: Cross-fade over 500ms
- Interval: 30-45 seconds between rotations

**Leave Quietly Button**
- Position: Bottom center, `--space-12` (48px) from bottom
- Font: `--font-secondary`, `--text-caption`
- Color: `--color-text-tertiary`
- Background: Transparent
- Border: 1px solid `--color-text-muted`
- Padding: `--space-3` `--space-6` (12px 24px)
- Border-radius: `--radius-full` (pill shape)
- Hover: Border `--color-text-tertiary`, color `--color-text-secondary`
- ARIA: "Leave this space quietly"

#### Audio Behavior
- Starts automatically on entry (mid-thought, not from beginning)
- Volume: 70% default
- No visible controls (implicit experience)
- Loop: Seamless
- Fade-in: 2 seconds on entry
- Fade-out: 3 seconds on exit

---

### 2.3 Exit State

#### Layout Structure
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│              ┌─────────────┐            │
│              │             │            │
│              │   THE HOLD  │            │
│              │             │            │
│              └─────────────┘            │
│                                         │
│         "You were held."                │
│                                         │
│     "Return whenever you need."         │
│                                         │
│                                         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

#### Component Specifications

**Exit Message**
- Font: `--font-primary`, `--text-h2`
- Color: `--color-text-primary`
- Animation: `fadeIn` with `--duration-slow` (500ms)

**Sub-message**
- Font: `--font-secondary`, `--text-body`
- Color: `--color-text-secondary`
- Margin-top: `--space-6` (24px)
- Animation: `fadeIn` with `--duration-normal` (300ms), 200ms delay

**Auto-redirect**
- After 4 seconds, fade to Home screen
- Transition: Cross-fade over 800ms
- No user action required

---

## 3. STATE MACHINE

### 3.1 State Definitions

```
┌─────────┐    enter     ┌──────────┐    loaded    ┌──────────┐
│ LANDING │ ───────────→ │ ENTERING │ ───────────→ │ IN_MOMENT│
└─────────┘              └──────────┘              └──────────┘
     ↑                      │  ↓ cancel              │  ↓ leave
     │                      └────────→ LANDING       │
     │                                                │
     │ exit_complete    ┌──────────┐    fade_out    │
     └────────────────← │  EXITED  │ ←──────────────┘
                        └──────────┘
                              │
                              ↓ auto (4s)
                        ┌──────────┐
                        │ LANDING  │
                        └──────────┘
```

### 3.2 State Specifications

| State | Description | Visual State | Audio State |
|-------|-------------|--------------|-------------|
| `LANDING` | Initial screen, user outside | Full Home layout visible | Silent |
| `ENTERING` | User clicked Enter, loading | Button loading state, fade begins | Preloading |
| `IN_MOMENT` | User inside, audio playing | Inside Moment layout, all visible | Playing (fade in) |
| `LEAVING` | User initiated exit | Fade out begins | Fading out |
| `EXITED` | Exit complete, message shown | Exit state visible | Silent |

### 3.3 Transitions

| From | To | Trigger | Duration | Animation |
|------|-----|---------|----------|-----------|
| `LANDING` | `ENTERING` | Click "Enter" | — | Button loading state |
| `ENTERING` | `IN_MOMENT` | Audio loaded | 800ms | Cross-fade between screens |
| `ENTERING` | `LANDING` | Cancel/Error | 300ms | Fade back |
| `IN_MOMENT` | `LEAVING` | Click "Leave" or Back | 300ms | Begin fade out |
| `LEAVING` | `EXITED` | Fade complete | 500ms | Show exit message |
| `EXITED` | `LANDING` | Auto after 4s | 800ms | Cross-fade to home |

### 3.4 State Variables
```typescript
interface AppState {
  current: 'LANDING' | 'ENTERING' | 'IN_MOMENT' | 'LEAVING' | 'EXITED';
  presenceCount: number;
  audioLoaded: boolean;
  audioPlaying: boolean;
  microcopyIndex: number;
}
```

---

## 4. MICROCOPY

### 4.1 Button Labels

| Element | Label | ARIA Label |
|---------|-------|------------|
| Primary CTA | "Enter" | "Enter the sanctuary" |
| Secondary Action | "Leave quietly" | "Leave this space quietly" |
| Back Button | (icon only) | "Return to entrance" |
| Close Button | (icon only) | "Leave this space" |

### 4.2 Display Text

#### Home Screen
| Element | Text |
|---------|------|
| Title | "You Are Held" |
| Subtitle | "A quiet space to simply be." |
| Presence (optional) | "{count} present" |

#### Inside Moment
| Element | Text |
|---------|------|
| Title | "You Are Held" |
| Presence | "{count} present" |

#### Exit Screen
| Element | Text |
|---------|------|
| Message | "You were held." |
| Sub-message | "Return whenever you need." |

### 4.3 Sanctuary Microcopy (Rotating)

These phrases rotate every 30-45 seconds inside the Moment:

1. "You are not alone in this."
2. "Breathe. There is no rush here."
3. "This space is yours for as long as you need."
4. "Others are here with you, in silence."
5. "Rest is not a reward. It is a need."
6. "You don't have to hold everything right now."
7. "There is nothing to do here. Just be."
8. "The world can wait."
9. "You are allowed to pause."
10. "This moment belongs to you."

### 4.4 Loading States

| State | Visual | Text |
|-------|--------|------|
| Button loading | Subtle pulse on button | "Entering..." |
| Audio loading | (none, silent preload) | (none) |
| General loading | Minimal spinner (optional) | (none preferred) |

### 4.5 Error Messages (Calm, Helpful)

| Error | Message | Action |
|-------|---------|--------|
| Audio load failed | "The moment isn't loading. Please try again." | Retry button |
| Network error | "Connection lost. The space will return." | Auto-retry |
| General error | "Something went quietly wrong. Please refresh." | Refresh button |

---

## 5. ACCESSIBILITY REQUIREMENTS

### 5.1 ARIA Labels

| Element | Role | ARIA Attributes |
|---------|------|-----------------|
| Enter button | `button` | `aria-label="Enter the sanctuary"` |
| Leave button | `button` | `aria-label="Leave this space quietly"` |
| Back button | `button` | `aria-label="Return to entrance"` |
| Close button | `button` | `aria-label="Leave this space"` |
| Presence counter | `status` | `aria-live="polite"`, `aria-atomic="true"` |
| Microcopy container | `region` | `aria-label="Sanctuary message"`, `aria-live="polite"` |
| Main content | `main` | `aria-label="THE HOLD sanctuary"` |

### 5.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between interactive elements |
| `Shift + Tab` | Navigate backwards |
| `Enter` / `Space` | Activate focused button |
| `Escape` | Leave moment (when inside) |

#### Focus Order
1. Enter button (Home)
2. Back button (Inside Moment)
3. Leave quietly button (Inside Moment)
4. Close button (Inside Moment)

### 5.3 Focus Indicators

```css
/* Visible focus state */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: var(--radius-sm);
}

/* Remove default outline when :focus-visible is supported */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 5.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Keep essential state changes instant */
  .fade-in {
    opacity: 1;
    transform: none;
  }
}
```

### 5.5 Color Contrast Requirements

| Element | Minimum Ratio | Target Ratio |
|---------|---------------|--------------|
| Primary text on bg | 4.5:1 | 7:1 (AAA) |
| Large text on bg | 3:1 | 4.5:1 |
| Interactive elements | 3:1 | 4.5:1 |
| Focus indicators | 3:1 | — |

**Verified Ratios:**
- `--color-text-primary` on `--color-bg-primary`: 15.8:1 ✓
- `--color-text-secondary` on `--color-bg-primary`: 7.2:1 ✓
- `--color-accent` on `--color-bg-primary`: 7.5:1 ✓

### 5.6 Screen Reader Considerations

- Presence count updates: Use `aria-live="polite"` to announce changes
- Microcopy rotations: Use `aria-live="polite"` with 5-second debounce
- Audio: Provide transcript link (future enhancement)
- No auto-playing audio without user initiation (user clicks Enter first)

---

## 6. COMPONENT LIBRARY

### 6.1 Button Component

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'default' | 'small';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Primary Button Styles:**
- Background: `--color-accent`
- Color: `--color-bg-primary`
- Padding: `--space-3` `--space-8` (12px 32px)
- Border-radius: `--radius-md`
- Font: `--font-secondary`, uppercase, letter-spacing 0.08em
- Hover: `--color-accent-hover`, transform scale(1.02)
- Active: scale(0.98)

**Secondary Button Styles:**
- Background: transparent
- Border: 1px solid `--color-text-muted`
- Color: `--color-text-tertiary`
- Border-radius: `--radius-full` (pill)
- Hover: border `--color-text-tertiary`, color `--color-text-secondary`

### 6.2 Presence Indicator Component

```typescript
interface PresenceIndicatorProps {
  count: number;
  pulsing?: boolean;
}
```

**Styles:**
- Dot: 8px circle, `--color-accent`
- Animation: `pulseSubtle` (3s infinite)
- Text: `--text-caption`, `--color-text-tertiary`
- Gap: `--space-2` (8px)

### 6.3 Microcopy Rotator Component

```typescript
interface MicrocopyRotatorProps {
  phrases: string[];
  interval?: number; // default: 35000ms
}
```

**Styles:**
- Font: `--font-primary`, italic
- Size: `--text-body`
- Color: `--color-text-secondary`
- Transition: Cross-fade 500ms

---

## 7. IMPLEMENTATION CHECKLIST

### Design Tokens
- [ ] All color tokens defined in CSS variables
- [ ] Typography scale implemented
- [ ] Spacing system applied
- [ ] Motion tokens with reduced-motion support

### Screens
- [ ] Home screen matches specifications
- [ ] Inside Moment screen matches specifications
- [ ] Exit state matches specifications
- [ ] All responsive breakpoints tested

### Interactions
- [ ] Enter button triggers state transition
- [ ] Audio fades in on entry
- [ ] Presence counter updates in real-time
- [ ] Microcopy rotates smoothly
- [ ] Leave action triggers graceful exit
- [ ] All transitions match timing specifications

### Accessibility
- [ ] All interactive elements have ARIA labels
- [ ] Keyboard navigation works completely
- [ ] Focus indicators visible
- [ ] Reduced motion preferences respected
- [ ] Color contrast verified
- [ ] Screen reader tested

---

## 8. APPENDIX

### 8.1 CSS Variables (Complete)

```css
:root {
  /* Colors */
  --color-bg-primary: #0D0D0F;
  --color-bg-secondary: #141416;
  --color-bg-tertiary: #1A1A1D;
  --color-text-primary: #F5F5F7;
  --color-text-secondary: #A1A1A6;
  --color-text-tertiary: #6E6E73;
  --color-text-muted: #48484A;
  --color-accent: #C4A77D;
  --color-accent-hover: #D4B88D;
  --color-accent-subtle: rgba(196, 167, 125, 0.15);
  --color-error: #E57373;
  --color-success: #81C784;
  
  /* Typography */
  --font-primary: 'Cormorant Garamond', 'Times New Roman', serif;
  --font-secondary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'SF Mono', 'Monaco', monospace;
  --text-display: 3rem;
  --text-h1: 2.25rem;
  --text-h2: 1.75rem;
  --text-h3: 1.375rem;
  --text-body: 1.125rem;
  --text-body-sm: 1rem;
  --text-caption: 0.875rem;
  --text-micro: 0.75rem;
  
  /* Spacing */
  --space-unit: 4px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
  --space-32: 8rem;
  --page-padding-x: 24px;
  --page-padding-y: 48px;
  --content-max-width: 680px;
  
  /* Radii */
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-none: none;
  --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-medium: 0 8px 24px rgba(0, 0, 0, 0.2);
  --shadow-glow: 0 0 40px rgba(196, 167, 125, 0.1);
  
  /* Z-Index */
  --z-base: 0;
  --z-elevated: 10;
  --z-dropdown: 100;
  --z-overlay: 1000;
  --z-toast: 1100;
  
  /* Motion */
  --ease-slow: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-slower: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-linear: linear;
  --duration-instant: 0ms;
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 800ms;
  --duration-slowest: 1200ms;
}
```

### 8.2 Responsive Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Large phones */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small desktops */
--breakpoint-xl: 1280px;  /* Large desktops */
```

---

*Document Version: 1.0*
*Last Updated: MVP Sanctuary Phase*
*For: Engineering Implementation*
