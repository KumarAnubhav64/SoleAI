# Expert Link — Remote Field Technician Support Portal

A Next.js proof-of-concept where field technicians configure a job, complete a pre-deployment briefing, and work through a 3-tab "Remote Expert" support workspace with real AI chat, video recording, and text-to-speech.

## Quick Start

```bash
npm install
echo 'GROQ_API_KEY=your_key_here' > .env.local  # Get free key: https://console.groq.com/keys
npm run dev
open http://localhost:3000
```

Then navigate through the 4-phase flow:

1. **Home** → Select equipment + severity → **Start Mission**
2. **Prep** → Review safety, wait or **Skip & Proceed**
3. **Activity** → 3 sequential tabs (Scoping Chat → Repair Recording → QA Chat)
4. **Performance** → Completion screen

> **No API key?** The app falls back to scripted responses — the full flow works without it.

> **Note**: Previously used Google Gemini. If you have an existing `.env.local` with `GOOGLE_GENERATIVE_AI_API_KEY`, replace it with `GROQ_API_KEY` (get one at https://console.groq.com/keys).

## Architecture

### Tech Stack

| Concern         | Choice                                          |
| --------------- | ----------------------------------------------- |
| **Framework**   | Next.js 16.3+ (App Router), TypeScript strict   |
| **UI**          | Tailwind CSS v4 + shadcn/ui + motion/react      |     | **AI** | Groq (Llama 3.3 70B) via Vercel AI SDK v7 |
| **Persistence** | Cookies (route guards) + localStorage (payload) |
| **Testing**     | Vitest + React Testing Library + Playwright     |
| **CI**          | GitHub Actions (lint, typecheck, test, build)   |

### Server vs. Client

Server Components are the default. Client Components are used only where browser APIs or interactivity is needed:

```
Server Components              Client Components ('use client')
├── Root layout                ├── ConfigGrid / ConfigCard
├── Home / Prep page shells    ├── CountdownTimer / PermissionRequest
├── Activity layout (guard)    ├── All 3 tabs (next/dynamic)
├── Performance page           ├── ChatBubble / ChatPanel / ChatInput
├── Server Actions             ├── RecordingControls / CameraPreview
├── Middleware                 └── All hooks
└── Route Handlers
```

### Route Protection

Three layers of defense:

1. **Middleware** — cookie flags checked on every request to protected routes
2. **Layout guard** — server-side double-check before rendering workspace
3. **Tab state machine** — client-side `locked → active → completed` transitions

### AI with Fallback

- **Primary**: Google Gemini 2.5 Flash via `streamText` — progressive streaming, context-aware system prompts
- **Fallback**: Script-based responses when AI is unavailable, rate-limited, or returns errors — toast notification + "Fallback Mode" badge

### Key Design Decisions

- **Custom hook** over `useChat` SDK — tighter control over streaming lifecycle and fallback switching
- **`useHydratedValue`** — reusable pattern to prevent SSR/CSR mismatches for browser-only APIs (TTS)
- **Milestone-based saves** — on tab completion, not keystroke-by-keystroke
- **No separate backend** — mock runs client-side; Route Handlers only where API boundary makes sense
- **113 unit tests** covering all hooks and lib functions

## Project Structure

```
src/
├── app/                   # Pages (4 phases), API routes, Server Actions
│   ├── page.tsx           # Phase 1 — Job Configuration
│   ├── prep/              # Phase 2 — Pre-Deployment Briefing
│   ├── activity/          # Phase 3 — Support Workspace (3 tabs)
│   └── performance/       # Phase 4 — Completion Screen
├── components/
│   ├── ui/                # shadcn primitives
│   ├── layout/            # NavigationBar
│   ├── job-config/        # ConfigCard, ConfigGrid
│   ├── prep/              # CountdownTimer, PermissionRequest, SafetyInstructions
│   └── activity/          # TabContainer, ChatPanel, RecordingControls, ChatBubble, etc.
│       └── tabs/          # ScopingTab, RepairTab, QATab
├── hooks/                 # useAIExpertConnection, useCountdown, useTabState, etc.
├── lib/                   # types.ts, constants.ts, storage.ts, guards.ts
├── data/                  # Fallback chat scripts + safety instructions
└── middleware.ts          # Route protection
```

## Scripts

| Command             | Description           |
| ------------------- | --------------------- |
| `npm run dev`       | Start dev server      |
| `npm run build`     | Production build      |
| `npm test`          | Run Vitest unit tests |
| `npm run test:e2e`  | Run Playwright E2E    |
| `npm run lint`      | Run ESLint            |
| `npm run typecheck` | Run TypeScript check  |

## Environment Variables

| Variable | Required | Description |
| ------------------------------ | -------- | --------------------------------- || `GROQ_API_KEY` | Optional | Groq API key (get free at https://console.groq.com/keys)|

## Testing

```bash
npm test                    # 113 unit tests across 8 files
npx playwright test         # E2E happy path (requires dev server)
npm run typecheck && npm run lint   # CI checks
```

All hooks and lib functions are fully covered. UI components are tested where conditional logic exists (locked/error states).
