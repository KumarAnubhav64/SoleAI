# 🛰️ SoleAI — Remote Field Technician Support Portal

> **Project Plan & Architecture Guide**
>
> A Next.js proof-of-concept where field technicians configure a job, complete a pre-deployment briefing, and work through a 3-tab "Remote Expert" support workspace.

---

## Table of Contents

1. [Context & Story](#1-context--story)
2. [Product Overview & User Flow](#2-product-overview--user-flow)
3. [Technical & Architecture Requirements](#3-technical--architecture-requirements)
4. [Evaluation Criteria](#4-what-is-being-evaluated)
5. [Tech Stack & Rationale](#5-tech-stack--rationale)
6. [Architecture Decisions](#6-architecture-decisions)
7. [Folder Structure](#7-folder-structure)
8. [Core State Shape](#8-core-state-shape)
9. [Component Architecture & Modularity](#9-component-architecture--modularity)
10. [Appendix: Mocking the Voice-First AI](#10-appendix-mocking-the-voice-first-ai)
11. [Phased Build Plan](#11-phased-build-plan)
12. [Testing Strategy](#12-testing-strategy)
13. [UI Design System](#13-ui-design-system)
14. [Development Workflow](#14-development-workflow)
15. [Production-Grade Checklist](#15-production-grade-checklist)
16. [Submission](#16-submission)

---

## 1. Context & Story

You are building a proof-of-concept for a **Remote Field Technician Support Portal**. When field technicians arrive at a complex repair site, they use this web application to configure their job details, review safety instructions, and interface with a "Remote Expert System" to diagnose, record, and verify the repair.

We are looking for **clean, modular, and reusable code**. We care deeply about:
- How you structure your Next.js application
- Where you draw the line between Client and Server Components
- How you handle state management across a multi-step workflow
- Your architectural decisions regarding data flow

**Tooling & AI Assistants**: We embrace modern development workflows. You are fully welcome (and encouraged) to use agentic coding assistants. We evaluate your **architectural decisions, component modularity, and final product quality** — not whether you manually typed every character yourself. However, AI is an amplifier, not a crutch. We expect you to **deeply understand the code you submit** and be fully capable of stepping in to make precise, manual modifications without relying on an agent for every small change or bug fix.

---

## 2. Product Overview & User Flow

### High-Level Flow

```
Phase 1 ──────► Phase 2 ──────► Phase 3 ──────► Done
  /                /prep           /activity        /performance

  Select           Briefing        Workspace        You're
  equipment        + 30s           with 3           done!
  + severity       countdown       lockable
                   + camera        tabs:
                   permission      1. Scoping Chat
                                  2. Repair Recording
                                  3. QA Chat

                   └── 10-minute global timer ──┘
```

### Phase 1 — Job Configuration (`/`)

The home page where the technician configures their job parameters.

**UI Layout**: A clear, selectable grid or card system for job parameters.

**Requirements:**
- Display a small grid of configuration cards
- User selects **Equipment Type**: HVAC, Industrial Printer, Server Rack
- User selects **Severity Level**: Routine Maintenance, Critical Fault
- Upon selection, user clicks **"Start Mission"** → parameters passed to Phase 2
- **Server Action** `saveJobConfig` saves config to localStorage + sets cookie flag
- Redirects to `/prep` on success

### Phase 2 — Pre-Deployment Briefing (`/prep`)

A briefing screen where the technician reviews safety info and prepares for the job.

**UI Layout**: A prominent countdown timer and clean display of dynamic safety parameters.

**Requirements:**
- Display the parameters selected in Phase 1 (read from localStorage)
- Display **mock safety instructions** based on selected parameters
- **30-second countdown timer** starts automatically
  - At 0, auto-redirect to `/activity`
- **"Skip & Proceed" button** to advance early
- **Request webcam/microphone permissions** on this page (NOT in Phase 3)
- **Graceful denial handling**: If permissions denied/unavailable:
  - Show a clear inline error message explaining the issue
  - Provide a retry button/mechanism
  - **Never** let the user reach Phase 3 unaware their camera won't work
  - **Never** hard-crash the page

### Phase 3 — The Support Workspace (`/activity`)

The core of the application. A split-screen dashboard with three sequential lockable tabs.

**Global Layout:**
- **Left Panel**: Technician input area (webcam/text)
- **Right Panel**: Persistent "Remote Expert" AI interface (chat log)
- **Top Navigation Bar**: Consistent across all routes (Phase 1-3)

**Global 10-Minute Timer:**
- Countdown timer of 600 seconds runs automatically
- When timer reaches 0: gracefully wind up, save all data/progress, redirect to `/performance`

**Tab System (Sequential & Lockable):**
- Tabs must be completed in order (1 → 2 → 3)
- Clicking **"Completed – Next"** locks the current tab and highlights/activates the next
- **State machine**: `locked → active → completed`

#### Tab 1: Initial Assessment (Scoping)

**Purpose**: Simulate a real-time connection with a "Remote Expert" to scope the problem.

**Requirements:**
- Simulate a **mock WebSocket/WebRTC data channel**
- The "Expert" (hardcoded JSON script) outputs an initial greeting
- Expert asks a scoping question based on Phase 1 configuration
- User can type clarifying questions (or use "Simulate Speech" button)
- The mock system replies with **basic, delayed responses** (1.5–3 second artificial delay)
- Once scoping chat is done → **"Completed – Next"**

#### Tab 2: Repair Documentation (Solution)

**Purpose**: The technician records themselves performing the fix.

**Requirements:**
- Integrate browser's **`MediaRecorder` API** to capture video/audio from webcam
- **Start** / **Stop** controls
- Once video is recorded and confirmed → **"Completed – Next"**
- **Lazy-loaded** via `next/dynamic` with `ssr: false`

#### Tab 3: Quality Assurance (Q&A)

**Purpose**: Final follow-up chat with the "Remote Expert" after video submission.

**Requirements:**
- Mock real-time messaging interface (similar to Tab 1)
- System asks **1-2 generic follow-up questions**
- User replies (type or simulate speech)
- Clicking **"Finish Job"** ends the flow and routes to `/performance`

### Phase 4 — Performance Analysis (`/performance`)

A placeholder/dummy end screen. No need to design in detail — just a completion confirmation and basic info.

---

## 3. Technical & Architecture Requirements

### 3.1 Next.js Paradigms (App Router)

You must demonstrate a strong understanding of modern Next.js architecture. We will heavily evaluate your deliberate division of **Server Components vs. Client Components**.

**Server Actions vs. Route Handlers:**
- **Server Actions**: Use for UI-driven data mutations and state updates (e.g., saving job config, marking tabs complete)
- **Route Handlers**: Use only where a real RESTful API boundary makes sense (e.g., handling external webhooks, serving recorded video blobs)

### 3.2 Route Protection

A user should **not** be able to jump directly to `/activity` (or to Tab 3) by typing the URL, without having completed the prior steps.

**Implementation**: Multiple layers of protection:
1. **Middleware** (`middleware.ts`) — checks cookie flags for route-level access
2. **Layout-level guard** — `app/activity/layout.tsx` performs server-side check
3. **Tab-level guard** — Client-side state machine prevents skipping tabs

### 3.3 Browser-Only APIs Isolation

`MediaRecorder`, mock WebSocket/WebRTC, and `window.speechSynthesis` only work in the browser. These must be:
- Correctly isolated in **Client Components** (`'use client'`)
- Lazy-loaded via **`next/dynamic` with `ssr: false`** where it helps avoid unnecessary server-side evaluation
- Never imported in Server Components or Server Actions

### 3.4 Error Handling

Handle at least one real failure case gracefully:
- **User denying webcam/microphone permissions** on the Prep Page
- Use `error.tsx` or error boundary or inline recovery UI
- **Don't let it hard-crash the page**
- **Don't let the user reach Phase 3 without knowing their camera access failed**

### 3.5 Backend Architecture (Optional but Encouraged)

While Next.js can act as a full-stack framework, you may choose to build a separate backend server (e.g., Node/Express, Python).

**Rationale for separate backend (if chosen):**
- Managing persistent WebSocket connections for real-time chat (Tabs 1 & 3)
- Handling heavy, long-running tasks like processing and storing video blobs
- Not tying up the Next.js server with these operations

**Decision for this project**: **No separate backend** (default). The mock WebSocket simulation runs entirely client-side. Route Handlers used only where a real API boundary makes sense.

### 3.6 Data Persistence

Store user's progress and inputs to mimic a database.

**Strategy:**
- **Cookies**: Boolean flags only (route-guard decisions in middleware)
- **localStorage**: Full payload (JobConfig, chat history, recording metadata, timestamps)
- **Save granularity**: On tab completion (milestone-based) — balances UI responsiveness with data integrity
- **Abstraction**: `lib/storage.ts` — thin wrapper over localStorage, swappable for a real DB later

### 3.7 Graceful Loading & UX

Field technicians often deal with poor network conditions. Implement thoughtful loading states:

- **`loading.tsx`** per route segment, tied to real Suspense-triggering async work
- **React Suspense boundaries** around async operations
- **Skeleton loaders** or **spinners** during:
  - Route transitions
  - Mock API calls (artificial delays)
  - Video processing (MediaRecorder start/stop)
- **Button loading states** to prevent double-clicks during simulated delays

### 3.8 Component Architecture & Modularity

Complex UI segments (multi-tab interface) must be **highly modular and maintainable**:

- **Each tab isolated into its own dedicated component** — no monolithic files
- **Performance optimization**: Use `next/dynamic` to lazy-load heavy tab components only when actively requested
- **Decoupled components**:
  - `ChatBubble` — reusable chat message display
  - `CountdownTimer` — reusable countdown with `onExpire` callback
  - `PermissionRequest` — camera/mic permission handling with retry UI
  - `RecordingControls` — MediaRecorder start/stop/preview
  - `TabContainer` — manages active/locked/completed states

### 3.9 Reference Material

For architectural decisions regarding server/client boundaries and API handling:
https://github.com/orgs/community/discussions/190342

### 3.10 Bonus: Real AI Integration (Optional)

Wire the "Remote Expert" system to a live LLM instead of hardcoded scripts:
- Use **Vercel AI SDK** paired with a free API provider
- Options: **Google AI Studio** (Gemini) or **Groq** — no credit card required
- Dynamically handle scoping and Q&A tabs

---

## 4. What Is Being Evaluued

| Area | What They're Looking For |
|---|---|
| **Paradigm Application** | Did you use Server Actions where they make sense, or unnecessarily rely on Route Handlers? Is your client bundle kept small by maximizing Server Components? |
| **Modularity & Code Structure** | Are UI components (Cards, Timers, Chat bubbles, Video player) reusable and decoupled from business logic? Is the repository well-organized? |
| **State Management** | How cleanly is state passed between Phase 1, 2, and 3? How do you manage active/locked states of tabs? |
| **Robustness** | Does the app handle browser-only APIs, permission failures, and direct/out-of-order URL navigation gracefully? |
| **System Design & Separation of Concerns** | If a separate backend was built, is the boundary between Next.js frontend and external service logical? |
| **UX Polish** | Do loading states actively prevent the user from feeling lost or double-clicking buttons during simulated network delays? |

---

## 5. Tech Stack & Rationale

| Concern | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 16.3+ (App Router), TypeScript (`strict: true`) | Required by assignment; 16.3+ for latest App Router features (Cache Components, Partial Prefetching) |
| **UI Library** | Tailwind CSS v4 + shadcn/ui | Copy-in components, fast to build Cards/Tabs/Alerts, explainable in interview |
| **Animation** | `motion/react` (formerly Framer Motion) | Default for UI transitions, Micro-interactions; never `useState` for continuous values — use `useMotionValue` |
| **Icons** | `@phosphor-icons/react` | One icon family per project, standardized `strokeWidth`, no hand-rolled SVG paths |
| **Fonts** | `Geist` + `Geist Mono` via `next/font` (NOT Inter) | Geist is the modern default; Inter is the stale AI default. Monospace for timers + technical data |
| **State (cross-phase)** | Cookies (route-guard flags) + localStorage (payload) | Middleware can't read localStorage — cookie is source of truth for route access |
| **Persistence** | `lib/storage.ts` — thin abstraction over localStorage | No real DB needed (assignment explicitly allows localStorage); abstraction keeps it swappable |
| **Testing** | Vitest + React Testing Library + fake timers | Fast, native ESM, plays well with Next.js + TS |
| **Video** | Native `MediaRecorder` API | No library needed |
| **Mock realtime** | Custom `useMockExpertConnection` hook + JSON scripts | Simulates WebSocket/WebRTC with 1.5–3s artificial delay |
| **TTS** | `window.speechSynthesis` (bonus) | Browser-native, completes the Voice-First illusion |
| **Backend** | None separate (default) | Mock runs client-side; Route Handlers only where a real API boundary makes sense |
| **CI** | GitHub Actions (lint, typecheck, test) | Minimal, high-signal "production grade" indicator |
| **Git hooks** | Husky + lint-staged | Prevents bad commits, low effort |

### Do We Need a Database?

**No.** The assignment explicitly permits localStorage or a mock JSON server. A real DB is over-engineering for this scope. Time saved here goes into the mock WebSocket hook and route guarding, which carry more weight.

---

## 6. Architecture Decisions

### 6.1 Server vs. Client Component Boundary

```
Server Components (default)              Client Components ('use client')
├── Root layout                          ├── Phase 1: JobConfigCards
├── Phase 1 page shell                   ├── Phase 2: CountdownDisplay
├── Phase 2 page shell                   ├── Phase 2: PermissionRequestUI
├── Phase 3 layout (guard)               ├── Phase 3: All 3 tab components
├── Phase 3 page shell                   │   ├── ScopingTab (next/dynamic)
├── `/performance` page                  │   ├── RepairTab (next/dynamic, ssr:false)
├── Server Actions                        │   └── QATab (next/dynamic)
│   ├── saveJobConfig                    ├── ChatBubble
│   └── markTabComplete                  ├── CountdownTimer
├── Middleware                            ├── PermissionRequest
└── Route Handlers (minimal)             └── hooks/*
```

### 6.2 State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Phase 1 → 2 → 3 Flow                    │
├───────────────┬────────────────────┬────────────────────────┤
│   Cookies     │    localStorage    │   React State (Phase 3) │
│ (middleware)  │  (full payload)    │   (active tab, UI)      │
├───────────────┼────────────────────┼────────────────────────┤
│ configComplete│ JobConfig          │ tabStates               │
│ prepComplete  │ chatHistory[]      │ activeTabIndex          │
│ tab1Complete  │ recordingMetadata  │ countdownValue          │
│ tab2Complete  │ timestamps         │ permissionStatus        │
│ tab3Complete  │ currentStep        │ recordingState          │
└───────────────┴────────────────────┴────────────────────────┘
```

### 6.3 Route Protection Strategy

```
URL Request
    │
    ▼
Middleware ──► Checks cookies
    │               │
    │               ▼
    │          ┌─────────────┐
    │          │ Cookie set?  │──No──► Redirect to previous phase
    │          └──────┬──────┘
    │                 │ Yes
    │                 ▼
    │          Layout guard (server-side) ──► Double-check cookie
    │                 │
    │                 ▼
    │          Tab-level guard (client-side) ──► State machine
    │
    ▼
Render page
```

### 6.4 Save Strategy

**Milestone-based persistence** (not keystroke-by-keystroke):
- **Phase 1 → 2**: Save on "Start Mission" click
- **Phase 2 → 3**: Save when prep completes (timer expires or skip)
- **Phase 3**: Save on each "Completed – Next" click per tab
- **Global timer expiry**: Force-save all current progress
- **Why not keystroke**: Reduces storage writes, cleaner data model, still recovers on page refresh

### 6.5 Conversation Step Tracking

The mock expert connection must track the current "step" in the conversation:
- If user navigates away from the tab → conversation resumes at the **last unanswered expert message**
- If the network drops (simulated) → system knows whether to repeat the last question or wait for user response
- **Implementation**: `useMockExpertConnection` hook with internal step counter + localStorage sync

---

## 7. Folder Structure

```
soleai/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (NavigationBar)
│   │   ├── page.tsx                      # Phase 1 - Job Config (Server Component shell)
│   │   ├── globals.css                   # Global styles + Tailwind
│   │   ├── loading.tsx                   # Root loading state
│   │   ├── error.tsx                     # Root error boundary
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── prep/
│   │   │   ├── page.tsx                  # Phase 2 - Prep (Server Component shell)
│   │   │   └── loading.tsx
│   │   ├── activity/
│   │   │   ├── layout.tsx                # Phase 3 - Server-side route guard + split layout
│   │   │   ├── page.tsx                  # Phase 3 shell (tab container, global timer)
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── performance/
│   │   │   ├── page.tsx                  # Completion screen
│   │   │   └── loading.tsx
│   │   └── actions/
│   │       └── index.ts                  # Server Actions
│   ├── components/
│   │   ├── ui/                           # shadcn primitives (Button, Card, Tabs, Alert, Progress)
│   │   ├── layout/
│   │   │   ├── NavigationBar.tsx          # Global top nav
│   │   │   └── NavigationBarLoading.tsx
│   │   ├── job-config/
│   │   │   ├── ConfigGrid.tsx            # Equipment type + severity card grid
│   │   │   └── ConfigCard.tsx            # Individual selectable card
│   │   ├── prep/
│   │   │   ├── SafetyInstructions.tsx    # Dynamic safety content
│   │   │   ├── CountdownTimer.tsx        # 30-second countdown display
│   │   │   └── PermissionRequest.tsx     # Camera/mic permission with retry UI
│   │   ├── activity/
│   │   │   ├── TabContainer.tsx          # Tab state machine + tab switcher
│   │   │   ├── TabHeader.tsx             # Individual tab header (locked/active/completed)
│   │   │   ├── GlobalTimer.tsx           # 10-minute global countdown
│   │   │   ├── ChatBubble.tsx            # Reusable chat message component
│   │   │   ├── ChatInput.tsx             # Text input + "Simulate Speech" button
│   │   │   ├── ChatPanel.tsx             # Full chat panel (message list + input)
│   │   │   ├── RecordingControls.tsx     # MediaRecorder start/stop/preview
│   │   │   ├── CameraPreview.tsx         # Webcam preview display
│   │   │   ├── RecordingPreview.tsx      # Recorded video playback
│   │   │   └── TabActionButton.tsx       # "Completed – Next" / "Finish Job" button
│   │   └── activity/tabs/
│   │       ├── ScopingTab.tsx            # Tab 1 - Mock chat (lazy-loaded)
│   │       ├── RepairTab.tsx             # Tab 2 - MediaRecorder (lazy-loaded, ssr:false)
│   │       └── QATab.tsx                 # Tab 3 - Mock chat (lazy-loaded)
│   ├── hooks/
│   │   ├── useMockExpertConnection.ts    # Scripted chat engine with delays + step tracking
│   │   ├── useCountdown.ts              # Countdown timer hook with onExpire
│   │   ├── useMediaRecorder.ts          # MediaRecorder abstraction
│   │   ├── useCameraPermission.ts       # Camera/mic permission hook
│   │   └── useTabState.ts              # Tab lock/unlock state machine
│   ├── lib/
│   │   ├── types.ts                     # All shared TypeScript types
│   │   ├── constants.ts                 # Magic numbers → named constants
│   │   ├── storage.ts                   # localStorage abstraction layer
│   │   └── guards.ts                    # Pure route-protection logic functions
│   ├── data/
│   │   ├── scoping-script.json          # Tab 1 chat script
│   │   ├── qa-script.json              # Tab 3 chat script
│   │   └── safety-instructions.json     # Phase 2 safety content per config
│   └── middleware.ts                    # Route protection middleware
├── public/
│   └── (static assets)
├── __tests__/
│   ├── lib/
│   │   ├── storage.test.ts
│   │   └── guards.test.ts
│   └── hooks/
│       ├── useMockExpertConnection.test.ts
│       └── useCountdown.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml                       # Lint, typecheck, test
├── .env.local.example
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 8. Core State Shape

All shared types, defined in `src/lib/types.ts`:

```typescript
// ─── Phase 1: Job Configuration ───

type EquipmentType = 'hvac' | 'industrial-printer' | 'server-rack';

type SeverityLevel = 'routine-maintenance' | 'critical-fault';

interface JobConfig {
  equipmentType: EquipmentType;
  severity: SeverityLevel;
}

// ─── Phase 2: Permission Status ───

type PermissionStatus = 'idle' | 'granted' | 'denied' | 'unavailable';

// ─── Phase 3: Tab System ───

type TabId = 'scoping' | 'repair' | 'qa';

type TabStatus = 'locked' | 'active' | 'completed';

type TabRecord = Record<TabId, TabStatus>;

// ─── Chat System ───

interface ChatMessage {
  id: string;
  sender: 'expert' | 'user';
  text: string;
  timestamp: number;
}

interface ChatScript {
  messages: ChatMessage[];
  currentStep: number;
}

// ─── Recording ───

interface RecordingMetadata {
  blobUrl: string | null;
  duration: number;
  timestamp: number;
  mimeType: string;
}

// ─── Progress / State ───

interface Progress {
  configComplete: boolean;
  prepComplete: boolean;
  tabStatuses: TabRecord;
  currentTab: TabId | null;
}

// ─── Persisted State (localStorage shape) ───

interface PersistedState {
  jobConfig: JobConfig | null;
  progress: Progress;
  scopingChat: ChatMessage[];
  qaChat: ChatMessage[];
  recording: RecordingMetadata | null;
  // Step tracking for conversation resume
  scopingStep: number;
  qaStep: number;
}

// ─── Cookie Flags (for middleware) ───

interface CookieFlags {
  configComplete: 'true' | '';
  prepComplete: 'true' | '';
  tab1Complete: 'true' | '';
  tab2Complete: 'true' | '';
  tab3Complete: 'true' | '';
}
```

### State Flow Diagram

```
Cookie flags (middleware)          localStorage (payload)          React State (UI)
┌──────────────────┐              ┌──────────────────┐           ┌──────────────────┐
│ configComplete   │◄──── reads ──│ progress          │           │ activeTab        │
│ prepComplete     │              │ jobConfig         │           │ countdownValue   │
│ tab[1-3]Complete │              │ scopingChat[]     │           │ permissionStatus │
└──────────────────┘              │ qaChat[]          │           │ recordingState   │
                                  │ recording         │           │ isSubmitting     │
                                  │ scopingStep       │           └──────────────────┘
                                  │ qaStep            │
                                  └──────────────────┘
                                          │
                                          ▼
                                   Server Actions
                                  (saveJobConfig,
                                   markTabComplete)
```

---

## 9. Component Architecture & Modularity

### 9.1 Component Tree

```
<html>
  <body>
    <NavigationBar />                    ← Client Component (minimal)
    <Suspense fallback={<Loading />}>
      <PageContent />                    ← Route-dependent
    </Suspense>
  </body>
</html>


Phase 1 (/):
  <JobConfigPage>                        ← Server Component
    <ConfigGrid>                         ← Client Component ('use client')
      <ConfigCard />                     ← Reusable card
      <ConfigCard />
      <ConfigCard />
    </ConfigGrid>
    <Button>Start Mission</Button>
  </JobConfigPage>

Phase 2 (/prep):
  <PrepPage>                             ← Server Component
    <SafetyInstructions />               ← Server Component (reads data/)
    <CountdownTimer />                   ← Client Component
    <PermissionRequest />                ← Client Component
  </PrepPage>

Phase 3 (/activity):
  <ActivityLayout>                       ← Server Component (guard)
    <SplitScreen>                        ← Client Component
      <LeftPanel>                        ← Technician input area
        <GlobalTimer />                  ← Client Component
        <TabContainer>                   ← Client Component (state machine)
          <ScopingTab />                 ← next/dynamic (lazy)
          <RepairTab />                  ← next/dynamic (ssr:false)
          <QATab />                      ← next/dynamic (lazy)
        </TabContainer>
      </LeftPanel>
      <RightPanel>                       ← Persistent Remote Expert
        <ChatPanel />                    ← Shows current chat history
      </RightPanel>
    </SplitScreen>
  </ActivityLayout>
```

### 9.2 Lazy-Loading Strategy

```typescript
// Tabs are lazy-loaded to keep initial bundle small
const ScopingTab = dynamic(() => import('@/components/activity/tabs/ScopingTab'), {
  loading: () => <Skeleton className="h-96 w-full" />,
});

const RepairTab = dynamic(() => import('@/components/activity/tabs/RepairTab'), {
  ssr: false,  // MediaRecorder only works in browser
  loading: () => <Skeleton className="h-96 w-full" />,
});

const QATab = dynamic(() => import('@/components/activity/tabs/QATab'), {
  loading: () => <Skeleton className="h-96 w-full" />,
});
```

### 9.3 Tab State Machine

```
                    ┌────────────┐
                    │   LOCKED   │
                    └─────┬──────┘
                          │ (previous tab completed)
                          ▼
                    ┌────────────┐
           ┌───────│   ACTIVE   │───────┐
           │       └────────────┘       │
           │ (swipe away)      │ (Completed – Next)
           ▼                    ▼
    ┌────────────┐      ┌────────────┐
    │   ACTIVE   │      │ COMPLETED  │
    │ (again)    │      └────────────┘
    └────────────┘
```

---

## 10. Appendix: Mocking the Voice-First AI

### 10.1 WebRTC / WebSocket Illusion

**Do not** simply fetch the entire JSON array and render it instantly.

Build a **`useMockExpertConnection`** hook that mimics a real-time data channel:

```
┌─────────────────────────────────────────────────┐
│              useMockExpertConnection             │
├─────────────────────────────────────────────────┤
│  Input: script (ChatScript), step (number)      │
│  Output:                                         │
│    - currentMessage: ChatMessage | null          │
│    - isTyping: boolean                           │
│    - isComplete: boolean                         │
│    - sendMessage(text): void                     │
│    - simulateSpeech(): void                      │
│    - currentStep: number                         │
├─────────────────────────────────────────────────┤
│  Behavior:                                       │
│    - Emits expert messages with 1.5–3s delay     │
│    - Tracks current step in conversation         │
│    - Resume: picks up at last unanswered step    │
│    - Persists step to localStorage               │
└─────────────────────────────────────────────────┘
```

**Artificial delay**: 1.5 to 3 seconds to simulate network latency and AI processing time.

### 10.2 Simulating STT (Speech-to-Text)

The camera feed in Tab 2 and microphone access should be **functional** (successfully requesting browser permissions and displaying a local media stream). No actual transcription API.

For Tabs 1 and 3, simulate STT via:

**Option A — "Simulate Speech" button** (preferred):
- Automatically pulls the next `sender: "user"` string from the JSON script
- Displays it in the chat as if it were just transcribed
- Triggers the next expert step

**Option B — Text input**:
- User types the exact response from the JSON into an input box
- Triggers the next expert step on submit

**Implementation**: Provide **both** options — the user can type free-form OR use the "Simulate" button.

### 10.3 Simulating TTS (Text-to-Speech)

When the mock WebSocket receives a message from `sender: "expert"`:
1. Render it into the UI chat log
2. **Bonus (encouraged)**: Use `window.speechSynthesis` API to literally speak the expert's text response out loud

```typescript
// Example TTS utility
function speakText(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;  // Normal speed
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}
```

### 10.4 State Management for Conversations

The application must keep track of the current "step" in the conversation.

**Resume behavior**:
- If user navigates away from the tab → the mock system should **not** repeat the last question
- Instead, it should **wait for the user's response** at the current step
- If the network drops (simulated) → same behavior: resume at current step
- **Implementation**: Store `currentStep` in localStorage alongside the chat messages

---

## 11. Phased Build Plan

### Phase 0 — Project Scaffolding

- [ ] Initialize Next.js project (App Router, TypeScript strict, Tailwind CSS v4)
- [ ] Set up shadcn/ui (add Button, Card, Tabs, Alert, Progress, Skeleton)
- [ ] Set up Vitest + React Testing Library
- [ ] Set up ESLint + Prettier
- [ ] Set up Husky + lint-staged
- [ ] Set up GitHub Actions CI (lint, typecheck, test)
- [ ] Set up folder structure (Section 7)
- [ ] Create `.env.local.example`
- [ ] Configure `tsconfig.json` with path aliases (`@/`)

### Phase 1 — Core Logic Layer (TDD)

Build and test all pure logic before any UI:

- [ ] `src/lib/types.ts` — All shared types (Section 8)
- [ ] `src/lib/constants.ts` — Magic numbers → named constants
- [ ] `src/lib/storage.ts` — localStorage abstraction (tested)
- [ ] `src/lib/guards.ts` — Route protection pure functions (tested)
- [ ] `src/hooks/useCountdown.ts` — Countdown timer hook (tested)
- [ ] `src/hooks/useMockExpertConnection.ts` — Scripted chat engine (tested)
- [ ] `src/hooks/useTabState.ts` — Tab lock/unlock state machine (tested)
- [ ] `src/hooks/useMediaRecorder.ts` — MediaRecorder abstraction
- [ ] `src/hooks/useCameraPermission.ts` — Permission handling hook
- [ ] `src/data/scoping-script.json` — Chat script for Tab 1
- [ ] `src/data/qa-script.json` — Chat script for Tab 3
- [ ] `src/data/safety-instructions.json` — Safety content for Phase 2

### Phase 2 — Route Protection

- [ ] `src/middleware.ts` — Cookie-based route protection
- [ ] `src/app/activity/layout.tsx` — Server-side route guard

### Phase 3 — Phase 1 UI (Job Configuration)

- [ ] `src/app/page.tsx` — Server Component shell
- [ ] `src/components/job-config/ConfigCard.tsx` — Selectable card
- [ ] `src/components/job-config/ConfigGrid.tsx` — Card grid with selection logic
- [ ] `src/app/actions/index.ts` — `saveJobConfig` Server Action
- [ ] Connect: selection → Server Action → redirect to `/prep`

### Phase 4 — Phase 2 UI (Pre-Deployment Briefing)

- [ ] `src/app/prep/page.tsx` — Server Component shell
- [ ] `src/components/prep/SafetyInstructions.tsx` — Dynamic safety content
- [ ] `src/components/prep/CountdownTimer.tsx` — 30-second countdown
- [ ] `src/components/prep/PermissionRequest.tsx` — Camera/mic with retry UI
- [ ] "Skip & Proceed" button + auto-redirect at 0
- [ ] `src/app/prep/loading.tsx`

### Phase 5 — Phase 3 UI (Support Workspace)

- [ ] `src/app/activity/page.tsx` — Phase 3 shell
- [ ] `src/components/activity/GlobalTimer.tsx` — 10-minute countdown
- [ ] `src/components/activity/TabHeader.tsx` — Tab header with status
- [ ] `src/components/activity/TabContainer.tsx` — Tab state machine
- [ ] Chat components: `ChatBubble.tsx`, `ChatInput.tsx`, `ChatPanel.tsx`
- [ ] `src/components/activity/tabs/ScopingTab.tsx` — Tab 1 (lazy-loaded)
- [ ] `src/components/activity/RecordingControls.tsx` — MediaRecorder controls
- [ ] `src/components/activity/CameraPreview.tsx` — Webcam preview
- [ ] `src/components/activity/RecordingPreview.tsx` — Video playback
- [ ] `src/components/activity/TabActionButton.tsx` — "Completed – Next"
- [ ] `src/components/activity/tabs/RepairTab.tsx` — Tab 2 (lazy, ssr:false)
- [ ] `src/components/activity/tabs/QATab.tsx` — Tab 3 (lazy-loaded)
- [ ] Global timer expiry → save + redirect to `/performance`
- [ ] `src/app/activity/loading.tsx`
- [ ] `src/app/activity/error.tsx`

### Phase 6 — Phase 4 UI (Performance)

- [ ] `src/app/performance/page.tsx` — Dummy completion screen

### Phase 7 — Global Layout & Navigation

- [ ] `src/components/layout/NavigationBar.tsx` — Consistent top navigation
- [ ] Root `layout.tsx` — Integrate navbar + metadata
- [ ] `src/app/globals.css` — Full styling

### Phase 8 — Loading States & Polish

- [ ] Skeleton loaders for chat panels
- [ ] Skeleton loaders for video panels
- [ ] Button loading states (prevent double-clicks)
- [ ] `src/app/loading.tsx` — Root loading
- [ ] `src/app/error.tsx` — Root error boundary
- [ ] `src/app/not-found.tsx` — 404 page

### Phase 9 — TTS Bonus (if time permits)

- [ ] Integrate `window.speechSynthesis` for expert messages

### Phase 10 — Real AI Bonus (if time permits)

- [ ] Wire up Vercel AI SDK + Gemini/Groq for live expert responses

### Phase 11 — README & Submission

- [ ] README with run instructions
- [ ] Architecture rationale (persistence, Server/Client boundary, backend decision)
- [ ] Testing notes
- [ ] Final cleanup and small meaningful commits

---

## 12. Testing Strategy

| Layer | Tool | What Gets Tested |
|---|---|---|
| **Unit (logic)** | Vitest | `guards.ts`, `storage.ts`, `useMockExpertConnection`, `useCountdown`, `useTabState` |
| **Component** | React Testing Library (on Vitest) | Locked/unlocked tab rendering, permission-denied inline UI, chat rendering, Phase 1 form validation |
| **Integration** (time-permitting) | RTL + mocked Server Actions | "Completing tab 1 unlocks tab 2" across the full page tree |
| **E2E** (stretch) | Playwright | Full happy path: config → prep skip → all 3 tabs → performance screen |

### Coverage Philosophy

No arbitrary % target. Aim for **100% of `lib/` and `hooks/` logic** tested. UI components tested only where real conditional logic exists (locked state, error state) — not static markup.

### TDD Scope (true red-green-refactor)

- `guards.ts` — route protection logic
- `useMockExpertConnection` — the mock connection state machine, resume-on-remount
- `useTabState` — tab lock/unlock state machine

### Test-Alongside (fully tested, not strict TDD)

- `storage.ts`, `useCountdown.ts`, `useMediaRecorder.ts`
- UI components

### Where TDD Is Skipped

- `MediaRecorder` / camera permission flows (better as post-hoc smoke tests)
- Visual/shadcn component composition (no real behavior to drive)
- `window.speechSynthesis` bonus feature
- Server Components / Server Actions runtime behavior

---

## 13. UI Design System

### 13.0 Design Read (from `design-taste-frontend` skill)

> **Reading this as**: Multi-step field technician tool for industrial/technical users, with a functional dark-tech language, leaning toward Tailwind utilities + Geist + restrained motion.

**Three Dials** (governing every layout, motion, and spacing decision):
- `DESIGN_VARIANCE: 6` — Offset layouts (asymmetric panels, split-screen), not chaotic (this is a functional tool, not a portfolio)
- `MOTION_INTENSITY: 4` — Fluid CSS transitions, entry animations, no scroll hijacks or physics. Motion must be motivated (feedback, state change, hierarchy)
- `VISUAL_DENSITY: 6` — Tight data-dense workspace (cockpit feel for Phase 3), airy config screens for Phase 1-2

---

### 13.1 Design Philosophy

Industrial, technical, and functional — borrowing from operational dashboards, field-service tools, and mission-control interfaces. This is a **tool**, not a marketing page. Every design decision serves clarity and throughput.

**Anti-defaults** (per `design-taste-frontend`):
- ❌ No centered hero layouts (split-screen Phase 3 is correct)
- ❌ No AI-purple/blue glow gradients (use blue-500 as clean accent, not neon)
- ❌ No three-equal-card feature rows (Phase 1 cards have different content — this naturally avoids the trap)
- ❌ No Inter font (use Geist)
- ❌ No generic glassmorphism or backdrop blurs (functional solid backgrounds instead)
- ❌ No generic circular spinners (use skeleton loaders matching the final layout)
- ✅ One corner-radius scale: all-soft (12px) for cards/panels, full-pill for buttons
- ✅ One accent color locked across the entire app: Blue-500
- ✅ Dark mode as default with light mode support via `prefers-color-scheme`

### 13.2 Color Palette

```
─── Core Surface ───
Background:    Slate-950 (#020617)   — Deep industrial base
Surface-1:     Slate-900 (#0f172a)   — Cards, panels, elevated surfaces
Surface-2:     Slate-800 (#1e293b)   — Hovered/active surfaces
Border:        Slate-700 (#334155)   — Subtle borders (never pure black)
Border-light:  Slate-600 (#475569)  — Emphasized borders

─── Semantic ───
Primary:       Blue-500 (#3b82f6)   — Actions, selected state, active tab
Primary-hover: Blue-400 (#60a5fa)   — Hover state for interactive elements
Success:       Emerald-500 (#10b981) — Completed tabs, confirmation
Warning:       Amber-500 (#f59e0b)  — Countdown < 10s, attention
Error:         Red-500 (#ef4444)     — Permission denied, errors, recording

─── Text ───
Text-primary:  Slate-100 (#f1f5f9)  — Primary body text
Text-muted:    Slate-400 (#94a3b8)  — Secondary/meta text
Text-dim:      Slate-500 (#64748b)  — Disabled/placeholder text
```

**Color consistency lock**: ONE accent (Blue-500) used identically across all sections. No warm neutrals in one section and cool in another. The palette does not fluctuate.

### 13.3 Typography

- **Display/UI**: `Geist` via `next/font` — modern, clean sans-serif. NOT Inter (the stale AI default).
- **Monospace/Data**: `Geist Mono` via `next/font` — for timer displays, technical data, recording duration
- **Scale**:
  - Display: `text-2xl md:text-3xl tracking-tight` (Phase 1 headings)
  - Body: `text-sm leading-relaxed` (dense workspace panels)
  - Monospace: `text-4xl md:text-5xl font-mono` (timer digits)
  - Labels: `text-xs font-medium uppercase tracking-wider` (tab headers, section labels)
- **Headers**: Bold (`font-semibold`), tight tracking (`tracking-tight`)
- **Body**: Regular weight, comfortable leading for reading

### 13.4 Key Components Visual Style

| Component | Style |
|---|---|
| **Config Cards** | `bg-slate-900 border border-slate-700 rounded-xl p-6` — Selected: `ring-2 ring-blue-500 border-blue-500` |
| **Countdown Timer** | Large Geist Mono digits, `text-slate-100`. <10s: amber → red color shift with subtle pulse |
| **Tab Headers** | Numbered steps with icon: 🔒 locked (slate), ▶ active (blue), ✓ completed (emerald). Horizontal stepper |
| **Chat Bubbles** | Expert: left-aligned, `bg-slate-800 text-slate-100`. User: right-aligned, `bg-blue-600 text-white` |
| **Recording Controls** | Red dot (🔴 pulsing during record), square (⏹ stop), play (▶ preview). Glass-button style |
| **Global Timer** | Fixed bottom-right, compact pill `bg-slate-900/90 backdrop-blur`, red pulse when <60s |
| **Navigation Bar** | Thin (`h-12`), `bg-slate-950 border-b border-slate-800`, shows current phase (1/2/3) |
| **Safety Instructions** | Card with icon per instruction, `border-l-4 border-amber-500` for warnings |

### 13.5 Animations & Transitions

**Motion library**: `motion/react` (formerly Framer Motion). Import as `import { motion } from "motion/react"`.

**All motion must be motivated** — ask "what does this animation communicate?" before adding it:

| Element | Animation | Motivation |
|---|---|---|
| **Config card hover** | `scale-[1.02]` + `ring-2 ring-blue-500/50` | Hierarchy — draws attention to selectable option |
| **Config card select** | `ring-2 ring-blue-500` + subtle `border-blue-500` | Feedback — confirms the selection |
| **Tab switch** | Fade + slide (duration 0.2s, ease `cubic-bezier(0.16, 1, 0.3, 1)`) | State transition — shows content changed |
| **Chat message entry** | Fade-in + slide-up (0.3s, stagger 0.05s) | Storytelling — reveals conversation flow |
| **Countdown tick** | Subtle scale pulse (1.0 → 1.05 → 1.0) on seconds <10 | Feedback — urgency signal |
| **Recording** | Pulsing red dot (opacity 1 → 0.3 → 1, 1s cycle) | Feedback — confirms active recording |
| **Permission denial** | Shake animation on retry button | Feedback — error state attention |
| **Page transitions** | Route-level fade via `loading.tsx` skeletons | State transition — prevents confusion |

**Hard rules**:
- Animate ONLY `transform` and `opacity`. Never `top`, `left`, `width`, `height`
- Honor `prefers-reduced-motion` — use `useReducedMotion()` from `motion/react` to degrade to static
- Never use `window.addEventListener('scroll', ...)` — use Motion's `useScroll()` or IntersectionObserver
- Button click feedback: `scale-[0.97]` on `:active` for tactile push
- No circular spinners — skeleton loaders matching final layout shape only

---

## 14. Development Workflow

This section defines the edit-verify rhythm during `next dev`, inspired by `next-dev-loop` best practices.

### 14.1 Two Views of the Same App

Every change must be verified at runtime, not just by type-checking or building:

1. **Framework view** — dev server logs, route segment tree, server actions, compilation issues
2. **Browser view** — DOM rendering, console errors, network requests, React component tree

Cross-check both views before declaring a change done. A component that compiles may still crash at runtime.

### 14.2 The Edit-Verify Loop

```
Write / modify code
       │
       ▼
  ┌──────────────────┐
  │ Type-check       │───✗─── Fix type errors
  │ (npx tsc --noEmit)│
  └────────┬─────────┘
           │ ✓
           ▼
  ┌──────────────────┐
  │ Compile check    │───✗─── Fix compilation
  │ (next dev)       │
  └────────┬─────────┘
           │ ✓
           ▼
  ┌──────────────────┐
  │ Runtime verify   │───✗─── Check server logs + browser console
  │ (browser test)   │
  └────────┬─────────┘
           │ ✓
           ▼
  ┌──────────────────┐
  │ Assert behavior  │───✗─── Fix logic
  │ (unit test pass) │
  └────────┬─────────┘
           │ ✓
           ▼
       Done ✓
```

### 14.3 Verification Checklist Per Change

For every significant change, verify these four failure modes:

| # | Check | Tool/Method |
|---|---|---|
| 1 | **Compiles** | `npx tsc --noEmit` + dev server hot reload |
| 2 | **Runs without errors** | Check browser console (F12) + dev server terminal for runtime errors |
| 3 | **Behaves as intended** | Manual browser test: click through the flow, verify all states (loading, empty, error, success) |
| 4 | **Edge cases** | URL-manipulation attempts (skip phases), permission denial, timer expiry, browser back/forward |

### 14.4 Pre-Commit Gate

Before every commit, run:

```bash
# TypeScript strict check
npx tsc --noEmit

# Lint
npx next lint

# Unit tests (Vitest)
npx vitest run

# Format check
npx prettier --check .
```

Configure `lint-staged` in `package.json` to auto-run these on staged files.

### 14.5 Production Build Verification

`next dev` does NOT equal production. Before declaring a feature done:

```bash
next build && next start
```

Then manually test in the production build:
- Route transitions work (no 404s from client-side navigation)
- Loading states (Suspense boundaries) work as expected
- Static shell renders first, dynamic content streams in
- Cookies are set correctly for route guarding

### 14.6 Common Gotchas

- **Stale browser state**: localStorage/cookies persist across refreshes. Clear them (`Application → Storage → Clear site data`) when testing fresh flows.
- **Timer in dev vs. production**: Dev mode is slower. Test timer expiry with `lib/constants.ts` override (set timer to 3s for development).
- **MediaRecorder in dev**: Works only on `localhost` or HTTPS. If testing on a network, ensure HTTPS.
- **Cookie middleware**: `next dev` serves middleware differently than `next start`. Test route protection in production build.
- **Browser-only APIs**: `MediaRecorder`, `speechSynthesis` crash on server-side render. Verify they're behind `next/dynamic({ ssr: false })`.

---

## 15. Production-Grade Checklist

- [ ] TypeScript `strict: true`, no `any`, no unexplained `@ts-ignore`
- [ ] Discriminated unions for state (tab status, config) instead of loose booleans
- [ ] ESLint (`eslint-config-next` + stricter rules) + Prettier
- [ ] Husky + lint-staged pre-commit hook
- [ ] `.env.local.example` even without real secrets
- [ ] No magic numbers — timer durations/delays centralized in `lib/constants.ts`
- [ ] `error.tsx` boundaries at the right route segments
- [ ] `not-found.tsx` for invalid routes
- [ ] `loading.tsx` tied to genuine async/Suspense boundaries, not decorative
- [ ] GitHub Actions CI: lint, typecheck, test on push/PR
- [ ] Small, meaningful commits — not one giant initial commit
- [ ] README documents architecture decisions, not just setup steps
- [ ] `next/dynamic` for lazy-loading heavy components (tabs, MediaRecorder)
- [ ] 1.5–3s artificial delays on mock expert messages
- [ ] Server Actions used for UI-driven mutations
- [ ] Route Handlers used only where API boundary makes sense
- [ ] Global layout has consistent navigation bar
- [ ] Camera/mic permission denied → inline retry UI, no crash

---

## 16. Submission

### Deliverables

- Public GitHub repository link
- `README.md` with:
  - Instructions on how to run the app locally
  - Brief paragraph explaining architecture choices:
    - How data persistence was handled
    - Component rendering decisions (Client vs. Server)
    - Why a separate backend was (or was not) used

### Key Decision Rationale Summary

| Decision | Choice | Why |
|---|---|---|
| **Backend** | None separate | Mock WebSocket runs client-side; Route Handlers suffice for any API boundary |
| **Persistence** | Cookies + localStorage | Cookies for middleware; localStorage for payload; abstraction keeps it swappable |
| **Save granularity** | Milestone-based | Tab completion saves data; reduces writes vs. keystroke-level |
| **Component boundary** | Server by default, Client only when needed | Browser-only APIs isolated; `next/dynamic` for heavy tabs |
| **Mock expert** | Custom hook with state machine | Delayed emits, resume-on-remount, step tracking |
| **State management** | React state + localStorage | Simpler than Redux for this scope; localStorage syncs across refreshes |

