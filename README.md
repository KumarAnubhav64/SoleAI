# 🛰️ SoleAI — Remote Field Technician Support Portal

A Next.js proof-of-concept where field technicians configure a job, complete a pre-deployment briefing, and work through a 3-tab "Remote Expert" support workspace with simulated real-time chat, video recording, and text-to-speech.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your Google Gemini API key (free, no credit card needed)
#    Get your key at: https://aistudio.google.com/apikey
echo 'GOOGLE_GENERATIVE_AI_API_KEY=your_key_here' > .env.local

# 3. Run the development server
npm run dev

# 4. Open the app
open http://localhost:3000
```

Then navigate through the 4-phase flow:

1. **Home** → Select equipment (HVAC System, Industrial Printer, Server Rack) + Severity → **Start Mission**
2. **Prep** → Review safety instructions, wait or **Skip & Proceed**
3. **Activity** → Complete 3 sequential tabs (Scoping Chat → Repair Recording → QA Chat)
4. **Performance** → Completion screen with job summary

> **Note**: If no Gemini API key is set, or if the AI is rate-limited/unavailable, the app automatically falls back to pre-configured script responses — the flow still works.

## Architecture

### Tech Stack

| Concern                 | Choice                                                | Rationale                          |
| ----------------------- | ----------------------------------------------------- | ---------------------------------- |
| **Framework**           | Next.js 16.3+ (App Router), TypeScript `strict: true` | Required by assignment             |
| **UI**                  | Tailwind CSS v4 + shadcn/ui                           | Fast to build, copy-in components  |
| **Animation**           | `motion/react` (Framer Motion)                        | UI transitions, micro-interactions |
| **Icons**               | `@phosphor-icons/react`                               | Single family, standardized stroke |
| **Fonts**               | `Geist` + `Geist Mono` via `next/font`                | Modern, clean sans-serif           |
| **AI Provider**         | Google Gemini 2.5 Flash via Vercel AI SDK v7          | Free tier, no credit card required |
| **State (cross-phase)** | Cookies (route-guard flags) + localStorage (payload)  | Middleware can't read localStorage |
| **Testing**             | Vitest + React Testing Library + Playwright           | Fast, native ESM, E2E capability   |
| **CI**                  | GitHub Actions (lint, typecheck, test, build)         | Automated quality gates            |

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

### AI-Powered Real-Time Chat (Primary)

The `useAIExpertConnection` hook powers the Remote Expert chat with Google Gemini via the Vercel AI SDK v7:

- **Streaming responses**: AI messages are rendered progressively as chunks arrive from the model
- **Context-aware system prompts**: Each tab builds a targeted prompt from the job config (equipment type, severity level) to guide the AI's role
- **Natural conversation**: The AI responds dynamically to user input — no pre-scripted messages
- **LocalStorage persistence**: Chat history survives page refreshes, resuming at the last step
- **Hydration-safe**: Uses `useHydratedValue` to prevent SSR/CSR mismatches with browser-only APIs (TTS)

### Fallback Mode (Resilience)

When the AI is unavailable, rate-limited, or returns an error, the app gracefully degrades to pre-configured script responses:

- **Automatic detection**: Network errors, rate limits (429), auth failures (401), and schema validation errors all trigger fallback
- **Seamless switch**: A toast notification informs the user; the chat continues without interruption
- **Script-based responses**: Expert messages are emitted from the JSON scripts with the same 1.5–3s artificial delay
- **Visual indicator**: A "Fallback Mode" badge appears in the tab footer so the user knows they're on pre-scripted responses
- **Multiple error handling layers**:
  1. API route validates and sanitizes messages before reaching Gemini
  2. Structured error responses with categorized HTTP status codes (429, 401, 422, 500)
  3. Hook-level stream detection for errors that leak into the response stream

### System Prompts

Each tab builds a targeted system prompt using the selected job configuration:

**Scoping Assessment**:

```
You are a Remote Expert System helping a field technician with a Scoping Assessment.
Equipment: HVAC System
Severity: Critical Fault

Guide the technician through a structured initial assessment — ask targeted
questions about symptoms, error codes, recent changes, and environmental factors.
```

**Quality Assurance**:

```
You are a Remote Expert System conducting a Quality Assurance follow-up.
Equipment: Server Rack
Severity: Routine Maintenance

Ask 1-2 targeted follow-up questions about the repair, confirm resolution,
and provide a completion confirmation.
```

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
│   │   ├── useAIExpertConnection.ts        # AI-powered chat (Gemini)
│   │   ├── useMockExpertConnection.ts      # Scripted chat engine (fallback)
│   │   ├── useCountdown.ts                # Countdown timer
│   │   ├── useTabState.ts                 # Tab state machine
│   │   ├── useMediaRecorder.ts            # MediaRecorder abstraction
│   │   ├── useCameraPermission.ts         # Camera/mic permission handling
│   │   ├── useTextToSpeech.ts             # Speech synthesis (bonus)
│   │   └── useHydratedValue.ts            # Hydration-safe SSR value hook
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
- AI-powered expert chat via Google Gemini (streaming responses)
- Automatic fallback to script-based responses on AI unavailability
- MediaRecorder API for video recording
- Text-to-Speech reads expert messages aloud (toggleable)
- 10-minute global timer with auto-redirect on expiry

### Phase 4 — Performance Analysis

- Completion confirmation with job summary card
- "New Mission" link to restart

## Environment Variables

| Variable                       | Required | Description                                    |
| ------------------------------ | -------- | ---------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ Yes   | Google Gemini API key for the Remote Expert AI |

Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey) — no credit card required. The free tier includes generous rate limits suitable for development and testing.

```bash
# Set up your key (already gitignored)
echo 'GOOGLE_GENERATIVE_AI_API_KEY=your_key_here' > .env.local

# Verify it's not tracked by git (should print .env.local)
git check-ignore .env.local
```

> **Without the API key**: The app still works! The Remote Expert automatically falls back to pre-configured script responses with a toast notification and "Fallback Mode" badge.

## Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start development server |
| `npm run build`     | Production build         |
| `npm start`         | Start production server  |
| `npm run lint`      | Run ESLint               |
| `npm run typecheck` | Run TypeScript check     |
| `npm test`          | Run Vitest unit tests    |
| `npm run test:e2e`  | Run Playwright E2E tests |
| `npm run format`    | Format with Prettier     |

## Architecture Decisions

### Why no separate backend?

The mock WebSocket simulation runs entirely client-side via the `useAIExpertConnection` hook (or the fallback `useMockExpertConnection` pattern). Route Handlers (`/api/chat`, `/api/complete-tab`) exist only where a real API boundary makes sense — the chat route forwards requests to Gemini, and tab completion persists state. This keeps the architecture simple while demonstrating proper Server/Client separation.

### Why Google Gemini + Vercel AI SDK?

- **Free tier**: Google AI Studio provides a generous free API key with no credit card required
- **Fast inference**: Gemini 2.5 Flash offers low-latency streaming, ideal for real-time chat UX
- **Vercel AI SDK v7**: The `streamText` API provides standardized streaming across providers, and the `useChat` hook (from `@ai-sdk/react`) simplifies client-side state management. We use a custom fetch-based hook instead for tighter control over the streaming lifecycle and error handling.

### Why a custom hook instead of `useChat`?

Vercel AI SDK v7's `useChat` has a different API surface from v4, and our requirements (progressive message updates during streaming, automatic fallback to scripts, localStorage persistence, abort controller cleanup) needed tighter control than the hook provides. The custom `useAIExpertConnection` hook implements the same interface as the original `useMockExpertConnection`, making the tabs interchangeable.

### Fallback Architecture

The app has a multi-layered error resilience strategy:

```
User sends message
    │
    ▼
┌─────────────────────────────┐
│ API Route (validate + send) │──→ 400/422: invalid input
│ sanitizeMessages() cleans   │──→ 429: rate limited
│ roles before streamText     │──→ 401: auth failure
└──────────┬──────────────────┘──→ 500: server error
           │
           ▼ (200 + stream)
┌─────────────────────────────┐
│ Hook reads stream            │──→ Detect error content
│ (progressive message update) │    in stream → remove msg,
└──────────┬──────────────────┘    show toast, switch to
           │                       fallback mode
           ▼
    ┌──────────────┐
    │ Fallback mode │──→ Emit script messages with 1.5-3s delay
    │ (if script    │    (same UX as mock expert)
    │  available)   │
    └──────────────┘
```

### Why cookies + localStorage instead of a database?

The assignment explicitly permits localStorage. Cookies are the only way middleware can read route-guard state (middleware cannot access localStorage). The abstraction layer (`lib/storage.ts`) keeps the persistence layer swappable — replacing `setItem`/`getItem` calls with database queries would be the only change needed to migrate.

### Why milestone-based saves?

Saving on tab completion (not keystroke-by-keystroke) reduces storage writes, produces a cleaner data model, and still recovers state correctly on page refresh. The conversation step tracking (`currentStep`) ensures the expert chat resumes at the right position.

### Why `flex-1` instead of `h-full` for layout?

Using `height: 100%` in nested flex layouts is unreliable because percentage heights resolve against the parent's explicit height — and most flex-1 containers don't have explicit heights. The layout uses `flex-1` + `min-h-0` throughout, with `h-screen` on the body for a reliable viewport anchor. This prevents the chat panel from growing with messages.
