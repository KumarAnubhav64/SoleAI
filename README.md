# 🛰️ SoleAI — Remote Field Technician Support Portal

A Next.js proof-of-concept where field technicians configure a job, complete a pre-deployment briefing, and work through a 3-tab "Remote Expert" support workspace with simulated real-time chat, video recording, and text-to-speech.

## Quick Start

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Open the app
open http://localhost:3000
```

Then navigate through the 4-phase flow:

1. **Home** → Select equipment (HVAC System, Industrial Printer, Server Rack) + Severity → **Start Mission**
2. **Prep** → Review safety instructions, wait or **Skip & Proceed**
3. **Activity** → Complete 3 sequential tabs (Scoping Chat → Repair Recording → QA Chat)
4. **Performance** → Completion screen with job summary

## Architecture

### Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 16.3+ (App Router), TypeScript `strict: true` | Required by assignment |
| **UI** | Tailwind CSS v4 + shadcn/ui | Fast to build, copy-in components |
| **Animation** | `motion/react` (Framer Motion) | UI transitions, micro-interactions |
| **Icons** | `@phosphor-icons/react` | Single family, standardized stroke |
| **Fonts** | `Geist` + `Geist Mono` via `next/font` | Modern, clean sans-serif |
| **State (cross-phase)** | Cookies (route-guard flags) + localStorage (payload) | Middleware can't read localStorage |
| **Testing** | Vitest + React Testing Library + Playwright | Fast, native ESM, E2E capability |
| **CI** | GitHub Actions (lint, typecheck, test) | Automated quality gates |

### Server vs. Client Component Boundary

Server Components are the default. Client Components are used only where browser APIs or interactivity are required:

```
Server Components (default)          Client Components ('use client')
├── Root layout                      ├── ConfigGrid / ConfigCard
├── Home page shell                  ├── CountdownTimer
├── Prep page shell                  ├── PermissionRequest
├── Activity layout (route guard)    ├── All 3 tab components
├── Performance page                 │   ├── ScopingTab (next/dynamic)
├── Server Actions                   │   ├── RepairTab (next/dynamic, ssr:false)
├── Middleware                       │   └── QATab (next/dynamic)
└── Route Handlers (minimal)         ├── ChatBubble / ChatPanel / ChatInput
                                     ├── RecordingControls / CameraPreview
                                     └── All hooks (useMockExpertConnection, etc.)
```

### Route Protection Strategy

Three layers of defense against out-of-order URL access:

1. **Middleware** (`middleware.ts`) — Checks cookie flags on every request to `/prep`, `/activity`, `/performance`
2. **Layout guard** (`app/activity/layout.tsx`) — Server-side double-check before rendering workspace
3. **Tab-level state machine** (`useTabState.ts`) — Client-side `locked → active → completed` transitions

### Data Persistence

No database — the assignment explicitly permits this:

- **Cookies**: Boolean route-guard flags (configComplete, prepComplete, tab[1-3]Complete)
- **localStorage**: Full payload (JobConfig, chat history, recording metadata, timestamps, conversation steps)
- **Abstraction**: `lib/storage.ts` — thin wrapper over localStorage, swappable for a real database later
- **Save granularity**: Milestone-based (on tab completion), not keystroke-by-keystroke

### Mock Real-Time Chat

The `useMockExpertConnection` hook simulates a WebSocket/WebRTC data channel:

- Emits expert messages with 1.5–3s artificial delay
- Tracks `currentStep` in the conversation
- Supports resume on remount (picks up at last unanswered message)
- "Simulate Speech" button auto-pulls the next user message from the script
- Free-form text input also available

## Project Structure

```
soleai/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (NavigationBar + metadata)
│   │   ├── page.tsx                # Phase 1 - Job Configuration
│   │   ├── globals.css             # Global styles + Tailwind
│   │   ├── loading.tsx             # Root loading state
│   │   ├── error.tsx               # Root error boundary
│   │   ├── not-found.tsx           # 404 page
│   │   ├── prep/                   # Phase 2 - Pre-Deployment Briefing
│   │   ├── activity/               # Phase 3 - Support Workspace
│   │   ├── performance/            # Phase 4 - Completion Screen
│   │   ├── api/                    # Route Handlers
│   │   └── actions/                # Server Actions
│   ├── components/
│   │   ├── ui/                     # shadcn primitives
│   │   ├── layout/                 # NavigationBar
│   │   ├── job-config/             # ConfigCard, ConfigGrid
│   │   ├── prep/                   # CountdownTimer, PermissionRequest, SafetyInstructions
│   │   └── activity/               # TabContainer, ChatPanel, RecordingControls, etc.
│   │       └── tabs/               # ScopingTab, RepairTab, QATab
│   ├── hooks/
│   │   ├── useMockExpertConnection.ts  # Scripted chat engine
│   │   ├── useCountdown.ts             # Countdown timer
│   │   ├── useTabState.ts              # Tab state machine
│   │   ├── useMediaRecorder.ts         # MediaRecorder abstraction
│   │   ├── useCameraPermission.ts      # Camera/mic permission handling
│   │   └── useTextToSpeech.ts          # Speech synthesis (bonus)
│   ├── lib/
│   │   ├── types.ts                # Shared TypeScript types
│   │   ├── constants.ts            # Named constants (no magic numbers)
│   │   ├── storage.ts              # localStorage abstraction
│   │   └── guards.ts               # Route protection logic
│   ├── data/                       # JSON scripts (scoping, QA, safety)
│   └── middleware.ts               # Route protection middleware
├── __tests__/                      # Unit tests (Vitest)
├── e2e/                            # E2E tests (Playwright)
└── .github/workflows/ci.yml        # CI pipeline
```

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
npx vitest run

# Run with watch mode
npx vitest

# Run specific test file
npx vitest run __tests__/hooks/useMockExpertConnection.test.ts
```

**113 tests across 8 files**, covering:
- `lib/storage.ts` — localStorage read/write/error handling
- `lib/guards.ts` — Route protection edge cases
- `useMockExpertConnection` — State machine, scripted emits, resume-on-remount
- `useCountdown` — Timer start/expire/reset with fake timers
- `useTabState` — Lock/unlock/completed state transitions
- `useMediaRecorder` — Recording start/stop/error states
- `useCameraPermission` — Permission granted/denied/unavailable flows
- `useTextToSpeech` — Speak/mute/support detection

### E2E Tests (Playwright)

```bash
# Run E2E tests (requires dev server or production build)
npx playwright test

# Run with UI
npx playwright test --ui

# Update snapshots
npx playwright test --update-snapshots
```

**4 E2E tests** covering the full happy path:
1. Phase 1-2: Config → Prep navigation with equipment selection
2. Phase 2-3: Activity workspace with chat interaction (expert message → Simulate Speech → response)
3. Activity → Performance completion screen
4. Route protection (blocked routes redirect correctly)

### Testing Philosophy

- **100% coverage** of `lib/` and `hooks/` logic
- UI components tested only where conditional logic exists (locked states, error states)
- E2E for things unit tests can't cover (routing, layout, route protection)
- TDD approach for `guards.ts`, `useMockExpertConnection`, and `useTabState`

## Key Features

### Phase 1 — Job Configuration
- Selectable card grid for equipment type and severity
- Server Action saves config to localStorage + sets cookie flag
- Redirects to prep on completion

### Phase 2 — Pre-Deployment Briefing
- Dynamic safety instructions based on selected equipment
- 30-second countdown timer with auto-redirect
- Camera/microphone permission request with graceful denial handling
- "Skip & Proceed" button to advance early

### Phase 3 — Support Workspace
- Split-screen layout (chat panel + expert sidebar)
- 3 sequential lockable tabs: Scoping → Repair → QA
- Mock expert chat with 1.5–3s artificial delays
- MediaRecorder API for video recording
- Text-to-Speech reads expert messages aloud (toggleable)
- 10-minute global timer with auto-redirect on expiry

### Phase 4 — Performance Analysis
- Completion confirmation with job summary card
- "New Mission" link to restart

## Environment Variables

No secrets are required for the current implementation. A `.env.local.example` file is provided for reference. If integrating a real AI backend (Vercel AI SDK + Gemini/Groq), you would add API keys here.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run format` | Format with Prettier |

## Architecture Decisions

### Why no separate backend?

The mock WebSocket simulation runs entirely client-side via the `useMockExpertConnection` hook. Route Handlers (`/api/complete-tab`, `/api/job-config`) exist only where a real API boundary makes sense, keeping the architecture simple while demonstrating proper Server/Client separation.

### Why cookies + localStorage instead of a database?

The assignment explicitly permits localStorage. Cookies are the only way middleware can read route-guard state (middleware cannot access localStorage). The abstraction layer (`lib/storage.ts`) keeps the persistence layer swappable — replacing `setItem`/`getItem` calls with database queries would be the only change needed to migrate.

### Why milestone-based saves?

Saving on tab completion (not keystroke-by-keystroke) reduces storage writes, produces a cleaner data model, and still recovers state correctly on page refresh. The conversation step tracking (`currentStep`) ensures the mock expert resumes at the right position.

### Why `flex-1` instead of `h-full` for layout?

Using `height: 100%` in nested flex layouts is unreliable because percentage heights resolve against the parent's explicit height — and most flex-1 containers don't have explicit heights. The layout uses `flex-1` + `min-h-0` throughout, with `h-screen` on the body for a reliable viewport anchor. This prevents the chat panel from growing with messages.
