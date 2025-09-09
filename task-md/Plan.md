Master Implementation Plan: Minimalist Habit
Tracker MVP
Project Goals and Scope
Overview: This project is a minimalist habit and commitment tracking app with a social accountability layer
. The focus is on tracking positive habits or abstentions with a clean interface and encouraging social
visibility, while working fully offline-first. Below we outline the MVP features, excluded scope, and key
constraints for the first release.
MVP Features (In Scope)
User Authentication: Support email/password sign-up and social logins (e.g. Google, Apple) via
Supabase Auth . This includes secure token storage and basic onboarding flows.
Commitment Tracking UI: A dashboard with a grid view of commitments by day, showing progress
over time (horizontally scrollable calendar) . Support multiple commitment types (e.g. binary
yes/no, checklists, quantitative goals) as defined in the design . Show visual streak indicators
(consecutive days of success) for each commitment.
Offline-First Functionality: The app will be fully usable offline. All data (commitments, daily records,
etc.) is stored locally (SQLite database) and syncs to the cloud backend (Supabase) when online. Use
MMKV for lightweight state persistence (via Redux Persist). Implement optimistic updates so user
actions reflect instantly in the UI, with background sync.
Basic Social Sharing: Include a Friends List where users can add friends and see a basic overview of
each friend’s progress. Show a friend “mini” grid view – a compressed version of their habit grid –
on their profile or list item . This provides selective visibility into friends’ commitments (no
interactive social features yet, just viewing).
Polished UX: Smooth, 60fps animations and transitions on all devices. Include satisfying completion
animations (e.g. checkmark or confetti when marking a habit done), subtle screen transitions, and
haptic feedback on important actions (using Expo Haptics). The interface should feel responsive
and delightful .
Out of Scope (MVP)
Push Notifications & Reminders: No push notification system in the MVP (that will be planned in a
later phase ).
Real-Time Updates: Live sync via WebSockets or immediate friend activity feed is not included.
Friend data will refresh on demand (no background live updates in this version).
Template Library: The MVP will not include the community template marketplace or pre-made habit
templates .
Advanced Social Features: No comments, reactions, or nudges on activities . Also, features like
friend groups or privacy settings per commitment are minimal or deferred.
1

•

2

•

3

4

•

•

5

•

6

•

7

•
•

8

• 9

1

Analytics & Gamification: Exclude advanced stats, achievements, or gamified elements beyond
basic streak counts.
Key Constraints & Targets
Platforms: Target iOS and Android (React Native via Expo). Avoid any approach that can’t eventually
extend to web (planned later), but focus on mobile UX for now.
Performance: The app must run at 60fps even on mid-range devices (e.g. iPhone 8, Galaxy A52) .
Animations should use the native driver to avoid jank. UI interactions should feel instantaneous
(<100ms response) .
Offline Support Duration: The app should operate indefinitely offline with no data loss. The device
is treated as source-of-truth when offline, caching all user actions locally . Any number of offline
days should sync within ~3 seconds of reconnect (for a typical amount of new data).
App Size: Keep the install size lean (target < 20 MB for the bundle). Avoid heavy libraries – use RN
core and lightweight packages . Assets (images, animations) will be optimized/compressed.
Code Maintainability: No file should exceed ~200 lines of code. We enforce a highly modular
structure, splitting features into small components and utilities . This keeps the codebase
navigable since we are working solo and need clarity.
Quality & Correctness: Use TypeScript for reliability; no TypeScript errors allowed in build .
Critical flows (login, sync, marking habits) must be thoroughly tested. Every feature should handle
edge cases (loading states, error states, empty states) gracefully.

Technical Architecture
The system is built as a React Native (Expo) client with an offline-first design, connected to a Supabase
backend (PostgreSQL DB + Auth). Below we detail the client-server integration, offline sync mechanism,
state management, and UI component structure.
Client–Server Overview
The mobile app (iOS/Android via Expo) communicates with a Supabase backend over HTTPS. Supabase
provides authentication (email/OAuth) and a managed Postgres database for persistence. The client will
use Supabase’s JavaScript SDK for API calls. When online, data operations (creating commitments, marking
completions, etc.) are sent to Supabase (RESTful endpoints or RPC calls) and broadcast to the DB . When
offline, the app operates against a local SQLite database as the primary store, deferring sync until
connectivity is restored. The high-level architecture is a client–server model with local caching: the device
holds a local copy of user data and periodically pushes/pulls updates from the cloud.
Data Model: On the backend, we anticipate tables for Users, Commitments, CommitmentRecords (daily
logs), and Friends (plus join tables for friend relationships). For MVP, simple schema designs are used (e.g. a
Commitment has fields: id, user_id, title, type, etc., and CommitmentRecord stores commitment_id, date,
status, etc.). We use Supabase Row-Level Security and policies to ensure each user only accesses their data
or permitted friends’ data. The SQLite schema will mirror these core tables to facilitate easy sync.
•

•
• 10

11

•

12

•

13

•

14

• 15

16

2

Offline-First Data Flow
All core interactions follow an offline-first pattern. When a user performs an action (e.g. marks a habit as
done):
Local Update: The app immediately updates the Redux state and writes to the local SQLite DB. This
provides an instant, offline-capable record of the change (device is the source of truth offline) .
Optimistic UI: The UI reflects the change right away (e.g. toggles the habit cell to “completed” with
animation) even if there’s no network . This gives the impression of real-time responsiveness.
Sync Queue: The change is added to a sync queue (in an Offline slice of state) for background
synchronization . If the app is offline, the queue will hold the update until connectivity resumes.
Background Sync: A monitor (using NetInfo ) watches for network connectivity. Once online, the
app automatically begins syncing: it batches and sends queued updates to the server, and
simultaneously fetches any new updates from the server (e.g. if the user logged in on another device
or friend data changed) . Sync is done incrementally – we track a last_sync_timestamp and
only pull data changed since that time to keep sync fast.
Conflict Resolution: In the rare event of a conflict (e.g. two updates to the same record from
different sources), the strategy is Last-Write-Wins: whichever update reaches the server last is kept
. This simple rule is acceptable because conflicts are expected to be very infrequent for habit
tracking (friends cannot edit each other’s data, and a user is unlikely to edit the same entry on two
devices) . We log conflicts for visibility. Future enhancements could incorporate more complex
resolution if needed, but LWW keeps the system robust and simple.
Data Broadcast: Since real-time subscriptions are out of scope, friends’ data will not live-update in
this MVP. Instead, when the user opens the Friends screen (or performs a pull-to-refresh), the app
will fetch the latest friend data from the server. In future, Supabase’s real-time channels could push
friend updates instantly , but for MVP this on-demand fetch is sufficient.
Sync Performance: The goal is to keep sync operations under ~3 seconds. By using delta sync (only
changes since last sync) and batching writes, we minimize payload sizes . The sync routine will also use
an exponential backoff on retries if the network is unstable , and will surface sync status in the UI (e.g.
an “Syncing...” indicator or an offline banner). The app will be eventually consistent – any data entered
offline is guaranteed to reach the server when possible, and the UI will adjust if the server responds with
any corrections.
State Management
We use Redux Toolkit for centralized state management, enabling predictable updates and easy optimistic
UI. The Redux store is partitioned into logical slices :
User Slice: User profile, authentication status, settings (e.g. theme preference).
Commitments Slice: List of the user’s active commitments, their properties (type, title, etc.), and
maybe cached groups or templates (for MVP, grouping is minimal).
Records Slice: Recent commitment records (e.g. today’s statuses) and historical logs needed for
streak calculations . This slice may maintain a cache of computed streaks or summary stats for
quick access.
Social Slice: Friend list data, basic friend info and maybe a cache of friend progress (e.g. last
updated date for each friend) .
UI Slice: UI state like which modal is open, loading spinners, error messages for forms, etc. .
1.

12

2.

17

3.

18

4.

19

20

5.
21
21
6.

22

20

19

23

•
•
•

24

•

25

• 26

3

Offline Slice: Tracks offline-specific info – the sync queue of pending actions, any unsynced changes,
and the timestamp of last successful sync .
All slices are kept small and focused. We will configure Redux Persist to automatically save certain slices to
storage. For large data (e.g. commitment records history), we persist in SQLite; for lighter state (like user
settings, last sync time) we use MMKV via redux-persist as a fast key-value store . MMKV (which runs on
JSI) is chosen over AsyncStorage for speed. This dual storage approach (SQLite for structured data, MMKV
for simple state) ensures the app can reload quickly and use data offline without lengthy rehydration
delays.
Optimistic Updates: Redux Toolkit’s reducers will be written to optimistically update state for user actions.
For example, marking a commitment complete will immediately set that day’s status to "completed" in state
and trigger an animation, while the actual network request happens in the background. If a request fails or
is reverted by the server, we will dispatch a rollback action to correct the state (and inform the user if
needed). In practice, failures will be rare and the user should seldom notice any discrepancy.
UI Structure & Navigation
We follow a fairly standard React Native UI architecture with a focus on modular components and smooth
navigation:
Navigation: Using React Navigation, we implement an Auth stack (for Login/Signup screens) and a
Main app navigator once logged in . The main app uses a Tab Navigator with key sections:
Home/Dashboard Tab: Shows the user’s commitments in a scrollable grid timeline (main habit
tracking UI). This is the default screen after login .
Social/Friends Tab: Shows the Friends List screen where the user can search/add friends and see
friends’ progress (each friend entry includes a mini-grid of their recent commitment activity) .
Profile Tab: (If included) Shows the user’s profile and settings (for MVP this can be basic, e.g. a
logout button and placeholder for stats).
Additional modals or screens: - Add Commitment Modal: accessible from the Dashboard (e.g. a plus
button). A form where user creates a new commitment (choosing type, title, etc.). - Commitment Detail
Screen: (Optional for MVP) a detailed view of a specific commitment’s history and stats. This might be
deferred if time is short, as the core tracking is done on the dashboard grid itself.
UI Components: We will build reusable components:
CommitmentGrid – the horizontal scrolling grid showing all commitments (rows) vs days (columns).
CommitmentCell – an individual day’s cell (tap to mark complete/skip). This cell will handle
rendering different states: completed (with animation checkmark), skipped, or empty, and will show
part of a streak line if in a streak .
MiniGrid – a condensed grid used in the Friend list to show a friend’s recent activity at a glance .
FriendCard – a component for each friend in the list, including their name and the MiniGrid of their
commitments.
Additional small components: e.g. StreakCounter (displays current streak count with icon),
OfflineBanner (to show when offline), LoadingSpinner, etc.
•

18

12

•

27

•

28

•

5

•

•
•
•

29

• 3
•
•

4

All components are kept small (<200 lines) and focused on one piece of UI to meet our size constraint. We
prefer composition over monolithic components.
Visual Design: The app will use a minimalist design (neutral colors, clean typography) per the
project vision . We will use a utility-first styling approach with NativeWind (Tailwind CSS for RN)
for rapid UI development (already included in setup ). This enforces design consistency and keeps
styling lines per file low. Icons will be from an icon font or SVGs (no huge image assets).
Animations & Feedback
Smooth animations are a core requirement for our app’s UX. We leverage React Native Reanimated 3
(already included in Expo) and Gesture Handler 2 to achieve fluid interactions. Key principles and tools:
Native-Driven Animations: We run animations on the UI thread to ensure 60fps performance .
Using Reanimated’s hooks and worklets, we bypass the JS–native bridge for animations, which keeps
even complex sequences smooth. For example, the habit completion animation (like a checkmark
fade-in or a celebratory confetti burst) will be executed with useNativeDriver: true or
Reanimated worklets . This prevents dropped frames during state changes.
Gesture Handling: For interactive gestures (swiping the grid, long-press on a habit for options, etc.),
we use Gesture Handler so that swipes and pans are recognized on the native side . This ensures
scrolling the habit timeline or other gestures remain responsive even if the JS thread is busy.
Animation Libraries: We will incorporate Lottie for any complex vector animations (for instance, a
colorful celebration when a long streak is achieved). Lottie animations run at 60fps and offload
rendering to native. We’ll keep the JSON animation files small to not bloat the app. Simpler
animations (button presses, screen transitions) will use Reanimated or the built-in LayoutAnimation
API.
Haptic Feedback: To enhance delight, we use Expo Haptics on supported devices. For example, a
slight vibration when marking a commitment done, or a stronger haptic for major milestones, to
give tactile feedback. These are subtle cues that increase satisfaction without being distracting.
Performance Optimization: We avoid animating expensive layout properties whenever possible.
Instead, we animate transforms (scale, translate) and opacity which are GPU-accelerated . We
also limit simultaneous animations – e.g. if marking all habits at once, we may stagger animations to
avoid doing too many in one frame. During development we will profile animations with the
performance monitor to catch any jank .
60fps Guarantee: By following these patterns and enabling the Hermes JS engine for overall
efficiency, we ensure the app stays at 60fps on mid-range hardware . Any animation that cannot
meet this bar will be refactored or removed. The result should be an interface that feels “buttery
smooth” even as the habit grid scales to thousands of cells .

Modular Code Structure
To enforce the <200-line rule and promote clarity, the project is organized into many small files by feature.
Below is the planned file structure (subject to slight change as development progresses):
•

30

31

• 32

33 34

•

35

•

•

•

36

37

•

32
38

5

project-root/
├── app.json # Expo configuration (enable Hermes, etc.)
├── package.json # Project dependencies and scripts
├── tsconfig.json # TypeScript configuration (strict mode)
├── .eslintrc.js # Linting rules (Airbnb/Expo RN guidelines)
├── /src
│ ├── /screens
│ │ ├── Auth/
│ │ │ ├── LoginScreen.tsx # Email login UI
│ │ │ └── RegisterScreen.tsx # Sign-up UI (and social login buttons)
│ │ ├── Dashboard/
│ │ │ ├── DashboardScreen.tsx # Main dashboard with commitments grid
│ │ │ ├── AddCommitmentModal.tsx # Modal for creating a new commitment
│ │ │ └── CommitmentDetailScreen.tsx # (Optional) Detailed view of one
commitment
│ │ ├── Social/
│ │ │ └── FriendsListScreen.tsx # List of friends and their mini-grids
│ │ └── Profile/
│ │ └── ProfileScreen.tsx # User profile & settings (simple in
MVP)
│ ├── /components
│ │ ├── CommitmentGrid.tsx # Displays multiple commitments over a
timeline
│ │ ├── CommitmentCell.tsx # Interactive cell for a single day
(with animation)
│ │ ├── MiniGrid.tsx # Smaller grid for friend preview
│ │ ├── FriendCard.tsx # Friend item in list (name, avatar,
mini-grid)
│ │ ├── StreakBadge.tsx # Small component to show streak count
visually
│ │ └── OfflineBanner.tsx # Banner UI when offline
│ ├── /navigation
│ │ └── AppNavigator.tsx # React Navigation stacks & tabs setup
│ ├── /store
│ │ ├── store.ts # Redux store configuration (Toolkit)
│ │ └── slices/
│ │ ├── userSlice.ts # Auth user state
│ │ ├── commitmentsSlice.ts # Commitments list and creation
│ │ ├── recordsSlice.ts # Daily records, streak logic
│ │ ├── friendsSlice.ts # Friends list state
│ │ └── uiSlice.ts # UI state (modals, loading, errors)
│ ├── /services
│ │ ├── supabaseClient.ts # Initializes Supabase JS client with
URL/key
│ │ └── authService.ts # Auth helper functions (login, logout,
OAuth)

6

│ ├── /database
│ │ ├── schema.sql # (If using raw SQL) DB schema
definition for SQLite
│ │ ├── initDb.ts # Sets up SQLite tables if not exist
│ │ └── syncService.ts # Handles offline sync logic (queue
processing)
│ ├── /utils
│ │ ├── dateUtils.ts # Date helpers (e.g. get streak, format
dates)
│ │ ├── networkUtils.ts # Network status listener (wraps
NetInfo)
│ │ └── storageUtils.ts # Wrapper for MMKV or Async functions
│ └── /assets
│ ├── lottie/ # Lottie animation files (json)
│ ├── icons/ # Any custom icons or images
│ └── app-icon.png # App icon
├── /__tests__
│ ├── App.test.tsx # Basic rendering test
│ ├── reducers.test.ts # Sample Redux reducer tests
│ └── DashboardScreen.test.tsx # Component tests for dashboard and grid
└── /task-md
├── TASKS.md # Master task list (protocol log of all
tasks)
├── initial-setup-plan.md # Example task plan file (for a specific
task)
└── ... (other task plan files for detailed steps per task)
Structure Notes: The separation above ensures each major feature has its own folder and each component
or screen is bite-sized. We have also included a /task-md directory to track development tasks (see next
section) and a /__tests__ directory for unit and integration tests. Styling will be done inline using
Tailwind utility classes via NativeWind (so no separate styles/ directory is needed, keeping style definitions
co-located with components). The navigation folder centralizes route definitions and linking between
screens. The services folder encapsulates external integrations (Supabase, etc.), and database handles
direct low-level storage operations (initializing SQLite, performing merges during sync, etc.).
Each file will be kept under ~200 lines; if a file grows too large (for example, a very complex screen), we will
refactor part of it into sub-components or utility functions. This way, no single file or function becomes
unwieldy.

Development Plan & Tasks
We will implement the app in iterative “vertical slices,” completing one feature at a time across the stack
(frontend UI, backend integration, offline logic) before moving to the next . This ensures we always have
a working app that can be visually tested and prevents integration surprises late in the project.

39

7

Development will be guided by a task protocol using a master TASKS.md and individual task plans for
each feature.
Task Tracking: Every development task is logged in TASKS.md with a short description, a dedicated git
branch, and a link to a detailed plan file. We follow the phases Plan → Build → Verify → Merge for each
task , meaning we first outline the solution (plan), then implement it (build), verify via testing/review, and
finally merge it into the main codebase. Verification is done by reviewing against acceptance criteria and
ensuring no regressions. The task log will be the source of truth for progress.
Below are the first 50 development tasks in our protocol format, covering the MVP’s implementation from
project setup through core features. (Each task corresponds roughly to a small feature or step – some larger
features are broken into multiple tasks for manageability.) These tasks are listed in the order we will tackle
them, and each entry shows the branch name and a link to a plan document where more detailed steps and
checks for that task will reside.

# TASKS.md — Source of Truth
> Log every task here at a **high level**. Detailed plans live in `task-md/
<task-slug>-plan.md`.
---
### Task: Initialize Expo Project
**Branch:** chore/init-expo
**Plan:** task-md/init-expo-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending (awaiting user)
**Performance Notes:** None (Expo blank project is lightweight).
**Risks:** None (foundation setup).
---
### Task: Set up TypeScript and Linting
**Branch:** chore/config-typescript
**Plan:** task-md/config-typescript-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending (awaiting user)
**Performance Notes:** None.
**Risks:** Incorrect tsconfig could cause compiler errors (will use Expo
defaults).
---
### Task: Configure Basic Navigation
**Branch:** feat/navigation-setup
**Plan:** task-md/navigation-setup-plan.md
40

8

**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None (just placeholder screens and navigator).
---
### Task: Install UI Library (NativeWind)
**Branch:** chore/setup-nativewind
**Plan:** task-md/setup-nativewind-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None (dev dependency).
**Risks:** Styling issues if not configured (verify Tailwind classes work).
---
### Task: Initialize Redux Store
**Branch:** feat/redux-setup
**Plan:** task-md/redux-setup-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Misconfigured middleware could affect performance (will use
recommended setup).
---
### Task: Set up Supabase Backend
**Branch:** chore/supabase-setup
**Plan:** task-md/supabase-setup-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Minimal.
**Risks:** API keys exposed if not handled (will use env variables).
---
### Task: Define Database Schema
**Branch:** chore/db-schema
**Plan:** task-md/db-schema-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Poor indexing could slow queries (will ensure primary keys and needed
indexes).

9

---
### Task: Implement SQLite Initialization
**Branch:** feat/sqlite-init
**Plan:** task-md/sqlite-init-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None (initial small tables).
**Risks:** Schema mismatch between local and Supabase if not kept in sync.
---
### Task: Persist Redux State (MMKV)
**Branch:** feat/persist-state
**Plan:** task-md/persist-state-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** MMKV is fast; ensure no large objects in state to keep it
smooth.
**Risks:** Incorrect persistence configuration could cause app to not load state
(will test).
---
### Task: App Theming Setup
**Branch:** feat/theme-setup
**Plan:** task-md/theme-setup-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None (mostly styling constants).
---
### Task: Create Welcome Screen UI
**Branch:** feat/welcome-screen
**Plan:** task-md/welcome-screen-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Use simple animations (logo fade) – should maintain
60fps.
**Risks:** First impression; will test layout on various devices.
---
### Task: Social Login Buttons (UI)
**Branch:** feat/welcome-social-login

10

**Plan:** task-md/welcome-social-login-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None (UI only; integration later).
---
### Task: Supabase Auth Integration
**Branch:** feat/auth-integration
**Plan:** task-md/auth-integration-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Network calls for login – ensure within 3s target .
**Risks:** Wrong auth config could block logins (will verify with test user).
---
### Task: Implement Register Flow
**Branch:** feat/register-flow
**Plan:** task-md/register-flow-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Handling error states (e.g. user exists) properly.
---
### Task: Implement Login Flow
**Branch:** feat/login-flow
**Plan:** task-md/login-flow-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Token storage in MMKV for quick access.
**Risks:** Persisting tokens securely (using secure storage).
---
### Task: Auth Loading State & Errors
**Branch:** feat/auth-loading-error
**Plan:** task-md/auth-loading-error-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Ensure error messages don’t reveal sensitive info.
---

11

11

### Task: Auth Success Navigation
**Branch:** feat/auth-nav-main
**Plan:** task-md/auth-nav-main-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Edge cases if token expired – will handle via re-login prompt.
---
### Task: Dashboard Screen Skeleton
**Branch:** feat/dashboard-screen
**Plan:** task-md/dashboard-screen-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None (static placeholder list).
**Risks:** None.
---
### Task: Commitment Data Model (Frontend)
**Branch:** feat/commitment-model
**Plan:** task-md/commitment-model-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Data not normalized – will follow schema design.
---
### Task: Create Commitments Slice
**Branch:** feat/commitments-slice
**Plan:** task-md/commitments-slice-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Keep initial state minimal to reduce overhead.
**Risks:** Ensure no large data stored in Redux (use SQLite for that).
---
### Task: Create Records Slice
**Branch:** feat/records-slice
**Plan:** task-md/records-slice-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.

12

**Risks:** None.
---
### Task: API Endpoints for Commitments
**Branch:** chore/supabase-commitments-api
**Plan:** task-md/supabase-commitments-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Minimal (simple REST calls).
**Risks:** None.
---
### Task: API Endpoints for Records
**Branch:** chore/supabase-records-api
**Plan:** task-md/supabase-records-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None.
---
### Task: Render Commitment Grid (Static)
**Branch:** feat/commitment-grid-ui
**Plan:** task-md/commitment-grid-ui-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Use FlatList horizontally for efficiency .
**Risks:** Large number of days – will virtualize list.
---
### Task: Horizontal Scrolling & Snapping
**Branch:** feat/grid-scroll-snap
**Plan:** task-md/grid-scroll-snap-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Tweak FlatList `windowSize` if needed for perf.
**Risks:** Snap could feel janky if not using native driver (we will use it).
---
### Task: Empty State UI for Grid
**Branch:** feat/grid-empty-state
**Plan:** task-md/grid-empty-state-plan.md

38

13

**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None.
---
### Task: SQLite Storage for Records
**Branch:** feat/sqlite-records-store
**Plan:** task-md/sqlite-records-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Query by date range to avoid loading all data at once.
**Risks:** Data sync issues if out-of-sync with server (will reconcile via
last_sync timestamp).
---
### Task: Load Records from SQLite into Grid
**Branch:** feat/load-records-offline
**Plan:** task-md/load-records-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Keep data retrieval on background thread if possible
(SQLite).
**Risks:** None (will test offline functionality thoroughly).
---
### Task: Add Commitment Modal UI
**Branch:** feat/add-commitment-ui
**Plan:** task-md/add-commitment-ui-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Ensure form usability (will add validation).
---
### Task: Add Commitment Backend
**Branch:** feat/add-commitment-backend
**Plan:** task-md/add-commitment-backend-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Quick inserts; ensure response used to update local
state.

**Risks:** Duplicates if offline and resynced (we will use UUIDs or client-
14

generated IDs to merge properly).
---
### Task: Display New Commitment in UI
**Branch:** feat/display-new-commitment
**Plan:** task-md/display-new-commitment-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None.
---
### Task: Mark Habit Complete (UI)
**Branch:** feat/mark-complete-ui
**Plan:** task-md/mark-complete-ui-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Immediate UI feedback (optimistic).
**Risks:** None.
---
### Task: Optimistic State Update (Mark Complete)
**Branch:** feat/optimistic-completion
**Plan:** task-md/optimistic-completion-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Avoid re-renders to keep 60fps – update state
minimally.
**Risks:** If sync fails, need rollback action (will implement).
---
### Task: Sync Queue Implementation
**Branch:** feat/sync-queue
**Plan:** task-md/sync-queue-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Use efficient data structure for queue (array or async
storage).
**Risks:** Stuck queue if bug – will add debug logs and recovery.
---
### Task: Background Sync Service

15

**Branch:** feat/sync-service
**Plan:** task-md/sync-service-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Throttle sync to prevent overload; expected sync <3s for
few days of data .
**Risks:** Network flaps could cause repeated sync – use debounce and NetInfo
properly.
---
### Task: Conflict Handling Logic
**Branch:** feat/conflict-handling
**Plan:** task-md/conflict-handling-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None (simple check).
**Risks:** If conflict resolved by overwriting user change, ensure user is
informed (maybe via a toast).
---
### Task: Completion Animation (Lottie)
**Branch:** feat/completion-animation
**Plan:** task-md/completion-animation-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Use small Lottie JSON; runs at 60fps on native.
**Risks:** Animation file too large (will optimize or compress assets).
---
### Task: Streak Calculation Logic
**Branch:** feat/streak-calculation
**Plan:** task-md/streak-calculation-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Compute streaks on the fly from cached records (fast for
small range).
**Risks:** Large history could slow calculation – might implement an efficient
query or memoization .
---
### Task: Display Streak UI
**Branch:** feat/streak-ui
**Plan:** task-md/streak-ui-plan.md

20

41

16

**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Ensure streak updates don’t require heavy re-render (calculate
incrementally).
---
### Task: Friend List UI
**Branch:** feat/friends-list-ui
**Plan:** task-md/friends-list-ui-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** List could grow – use FlatList for friends too if many.
---
### Task: Friend Search/Add Functionality
**Branch:** feat/add-friend
**Plan:** task-md/add-friend-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Simple query by username.
**Risks:** Security – ensure only valid users can be added (Supabase rules).
---
### Task: Friends Table and API
**Branch:** chore/friends-backend
**Plan:** task-md/friends-backend-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** None (straightforward relationships table).
---
### Task: Mini-Grid Component for Friend
**Branch:** feat/mini-grid-friend
**Plan:** task-md/mini-grid-friend-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Use virtualization if friend has many days, but usually
recent days only.
**Risks:** None.

17

---
### Task: Load Friend Progress (Batch)
**Branch:** feat/load-friend-data
**Plan:** task-md/load-friend-data-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Fetch only last ~7 days per friend to limit data.
**Risks:** None.
---
### Task: Display Friend Mini-Grids
**Branch:** feat/display-friend-grid
**Plan:** task-md/display-friend-grid-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Ensure not to block UI when loading friends (use
loader).
**Risks:** None.
---
### Task: Offline Banner & Network Indicator
**Branch:** feat/offline-indicator
**Plan:** task-md/offline-indicator-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** None.
**Risks:** Banner should not block UI; will make it small at top.
---
### Task: Integrate Haptic Feedback
**Branch:** feat/haptics-feedback
**Plan:** task-md/haptics-feedback-plan.md
**Phases:** Plan → Build → Verify → Merge
**Verification:** Pending
**Performance Notes:** Very low overhead (just triggers native vibration).
**Risks:** None.
---
### Task: General App Polishing
**Branch:** feat/final-polish
**Plan:** task-md/final-polish-plan.md
**Phases:** Plan → Build → Verify → Merge

18

**Verification:** Pending
**Performance Notes:** Check bundle size <20MB; remove any large unused deps.
**Risks:** Last-minute changes could introduce bugs – will run full regression
test.
(The above 50 tasks take us through setting up the project, implementing auth, core habit tracking, and basic
social features. Each task’s detailed plan (in /task-md/*-plan.md ) will outline the exact code changes and
include a QA checklist for that item.)
As development proceeds, we will update TASKS.md with status (e.g. marking tasks as verified) and

possibly add tasks if new needs arise. The task breakdown ensures no single task is too large or open-
ended, keeping development focused and trackable.

Execution Timeline (Days 1–10)
We will execute the above tasks in roughly a 10-day timeline, front-loading foundational work and achieving
core functionality early. Below is a day-by-day plan for the first 10 days of development:
Day 1: Project setup and environment configuration. Initialize the Expo React Native app, set up
TypeScript, and configure ESLint/Prettier. Install base dependencies (React Navigation, Redux Toolkit,
etc.). Get a blank app running on iOS and Android emulators. (Tasks 1–4 completed: Expo project, TS
config, NativeWind setup, basic navigation shell) . Also create the Supabase project and set up the
initial database schema (Users, Commitments, Records tables) on the backend.
Day 2: Implement state management scaffolding. Create the Redux store and slices for user and
commitments. Configure Redux Persist with MMKV for offline state. Verify that state persists across
app reloads (e.g. theme or a dummy counter persists). Continue backend setup: verify Supabase
Auth (email/social providers) is configured. *(Tasks 5–8: Redux setup, Supabase init, DB schema, SQLite
integration)_.
Day 3: Complete foundation tasks. Implement a basic theming system (light/dark mode or simply a
style constants file) and ensure it’s applied app-wide. Set up navigation structure with placeholder
screens for Dashboard, Friends, Profile (so tabs render). Load environment variables securely
(Supabase URL/anon key) into the app. By end of Day 3, we have an empty app shell with working
navigation and connection to Supabase backend .
Day 4: Build the Authentication flow UI. Design the Welcome screen with logo and social login
buttons, and the Login/Signup screens with form inputs. Add client-side validation (e.g. check email
format) and nice-to-have touches like handling keyboard avoiding view. No backend calls yet – focus
on front-end and animations (e.g. fade-in logo, button press feedback). *(Tasks 10–13 focusing on
Auth UI)_. By end of Day 4, the user can navigate through the auth screens with form validation in
place.
Day 5: Integrate Supabase Auth into the login/signup flows. Connect the signup form to actually
call Supabase sign-up API, and login form to sign-in API . Implement error handling for
common cases (wrong password, account exists, etc.). Test social OAuth login (if configured) via the
provided providers. Use Redux to store the authenticated user and session token on success. By end
of Day 5, a new user can register or login and get to the main app (tab navigator) on success. (Tasks
1.

42

2.

3.

43

4.

5.

44 45

19

14–18 completed: auth integration, register/login flows, navigation on auth success). We’ll verify the full
auth cycle takes <3 seconds from submit to entering the app .
Day 6: Post-login, focus on the Dashboard (Commitment tracking) core. Set up the Dashboard
screen component with a placeholder layout. Implement the Commitment data model on the client:
define a TypeScript interface for Commitment and CommitmentRecord and update the Redux slices
(commitmentsSlice, recordsSlice) to have initial state and reducers for adding commitments and
records. Connect the app to the database: write a Supabase function or REST call to fetch the user’s
commitments on login and store in Redux. By end of Day 6, after login the app loads an (empty)
commitments list from the server and displays a placeholder message if none. *(Tasks 19–23:
dashboard skeleton, data model, commitments/records slices, basic API wiring)_.
Day 7: Implement the Commitment Grid UI and adding new commitments. Build the
CommitmentGrid component to display commitments in rows and days in columns (for now,
perhaps just the current week or month statically). Use a horizontal FlatList for days to allow scrolling
. Implement the “Add Commitment” modal: a form to create a new commitment (select type,
name, etc.). When a new commitment is submitted, save it to Supabase (Commitments table) and
update Redux state optimistically so it shows immediately. Also, store it in SQLite for offline access.
By end of Day 7, the user can add a commitment through the UI and see it appear on the dashboard.
*(Tasks 24–30 done: render grid UI, add commitment form UI + backend integration)_.
Day 8: Daily tracking functionality. Enable marking a commitment as completed for a day. This
involves updating the UI state (e.g. filling the cell with a color/animation) and adding a record to the
local SQLite DB and Redux state. Implement the optimistic update: as soon as user taps the cell,
reflect the change. Add this record to the sync queue for later server update. Also implement basic
streak calculation: when a day is marked, update the streak count for that commitment (this could
be done by scanning recent records in Redux or SQLite). By end of Day 8, the user can tap a day cell
to mark it done (or undo it, if needed for MVP), and see the streak counter update accordingly (e.g.
“3-day streak”). *(Tasks 31–36: mark complete UI, optimistic state update, sync queue logic, basic streak
calc)_.
Day 9: Offline Sync and Performance. Flesh out the sync mechanism: on app launch or reconnect,
fetch new records from Supabase and push local unsynced records. Test the app in offline mode: put
device in airplane mode, mark a habit, then go online and ensure it syncs to the backend and
appears on a second device or DB viewer. Implement the Offline banner UI to inform user when
they’re offline. This day we also focus on performance tuning: for example, adjust FlatList
windowSize or initialNumToRender for the grid if needed, and enable Hermes on Android if
not already. Start adding animation polish: use Lottie for completion checkmark animation and
integrate haptic feedback on completion. By end of Day 9, offline mode is solid (no data loss, sync
within seconds on reconnect) and the habit completion interaction is satisfying (vibration +
animation). *(Tasks 27, 32–33, 37–38, 47: offline storage integration , background sync service, conflict
handling, completion animation, haptics)_.
Day 10: Implement the Friends List and basic social view. Create the FriendsList screen showing
current friends. Implement the ability to add a friend (by username or email lookup) – for MVP, this
can be done by calling a cloud function or simple Supabase RPC to insert a friend relationship (or we
use a public friends table and have the user IDs). Display each friend with a mini-grid of their
recent week’s progress . Since we have no real-time, ensure that when this screen mounts, it
fetches the latest friend records from the server (we can piggyback on the sync routine or do a direct
query to Supabase for each friend’s recent records). By end of Day 10, a user can search and add a
friend, and then see that friend’s commitments status at a glance on the list. (Tasks 39–46 completed:
friend UI, friend backend, mini-grid component, load friend data) . We will manually test adding two

11

6.

7.

38

8.

9.

46

10.

47

48

20

test users as friends to see that the social feed works (one user marks a habit, the friend can refresh
and see it).
(Note: Days 1–10 cover the bulk of MVP functionality. If certain tasks take longer, we have buffer beyond day 10 to
finish up remaining items like any profile screen or additional polish. By Day 10, core features – habit tracking and
friend visibility – should be functional.)
Throughout this timeline, we will conduct quick tests at the end of each day (e.g. ensure the app still builds
and basic flows work). Visual checkpoints from the design plan are used as goals (e.g. end of Day 5: auth
flow complete with transitions ; end of Day 8: commitment tracker with animations ). This ensures we
meet interim milestones on time.

Git and Testing Workflow
We adopt a disciplined Git workflow with frequent integration and thorough testing:
Branching Strategy: We use a feature-branch model. Each task from the list is developed on its own
Git branch, named by the task slug (e.g., feat/login-flow ) . This isolates work on that
feature. Branch names reflect the content (using prefixes like feat/ for new features, fix/ for
bug fixes, and chore/ for config tasks) for clarity. All development happens on these short-lived
branches; the main branch always contains reviewed, stable code.
Commit Practice: Commits are made frequently (at least one per significant step in a task plan) to
record progress. We write clear commit messages referencing the task (e.g. “Add mark-complete
reducer (Task: mark-complete-ui)”). Commits encapsulate small, coherent changes – this makes
debugging easier and enables using git bisect if needed.
Pull Requests & Code Review: When a task is complete (including coding and local testing), a Pull
Request (PR) is opened from the feature branch to main . Each PR follows a template that includes
What/Why of the change, links to the task plan, and a checklist of verification steps .
Although this is a solo project, we treat the PR as a formal review step – reviewing our own code for
any issues and ensuring it meets all acceptance criteria. The PR template will include the QA results
(e.g., screenshots of the feature, test results) to confirm the task is verified. Only after this self-review
(and any fixes) will the code be merged. In a team setting, this is where a teammate or QA would
review; in our case, we simulate that scrutiny ourselves.
Task Verification: We update TASKS.md to mark tasks as verified once the PR is approved/merged
(e.g. changing “Verification: Pending” to “Verification: Yes, date by user”). We’ll use the protocol’s
date/time confirmation for logging purposes at the end of each task , ensuring traceability. This
practice enforces that no task is considered done until it’s fully tested and integrated.
Continuous Integration: We plan to set up a basic CI (e.g., GitHub Actions) that runs the test suite
on each PR. This prevents regressions – if any test fails, the PR is not merged until fixed. CI can also
run a linter/formatter check to maintain code quality. Additionally, we might configure CI to build the
app (Expo EAS build) periodically to keep an eye on bundle size and any build issues.
Testing Strategy: We employ a mix of automated and manual testing:
Unit Tests: For critical business logic (e.g., the streak calculation function, the sync queue logic), we
write unit tests to verify correctness (e.g. streak function returns correct lengths for various data
sets, sync queue handles conflicts properly). Redux reducers will also have unit tests for key actions.

49 50

•

51

•

•

52 53

•

54

•

•
•

21

Component Tests: Using React Native Testing Library, we write tests to ensure key components render
and respond to props/state. For example, test that CommitmentGrid renders the correct number
of cells for a given data set, or that tapping a CommitmentCell dispatches the correct action.
These help catch UI logic issues.
Integration Tests: We simulate flows in a controlled environment. For instance, a test might create a
fake store state and simulate an offline then online scenario to ensure the sync saga works (if using
Redux Saga or Thunks for sync). We’ll also have tests for the database layer (e.g., insert and read
from SQLite).
Automated End-to-End (E2E): If time permits, use Detox or Expo’s E2E tools to automate a couple of
critical flows on a simulator (like signup -> add commitment -> mark complete -> see streak).
The testing protocol per screen/feature will include: unit tests, render tests, performance tests
(profiling), offline tests, and integration tests . For example, after implementing the habit grid, we
test that scrolling through 30 days does not drop frames (using performance profiling tools). After adding
offline sync, we write a test that simulates creating records offline and ensures they get synced and no
duplicates occur.
Manual Testing: Alongside automation, we will manually test the app on actual devices (or
emulators simulating lower-end hardware) at regular intervals. Specifically, after major features
(auth, adding habits, marking complete, friend view), we’ll do exploratory testing: try odd inputs,
turn network on/off in various sequences, etc. We will also test on both iOS and Android to catch any
platform-specific issues (Expo handles most, but e.g. Android back button behavior might need
testing).
By combining this rigorous git process with continuous testing, we aim to catch bugs early and often. Every
commit going to main will be stable and verified. This workflow gives confidence in quality despite the
rapid solo development.
Setup Checklist & Tool Configuration
Before and during development, certain tools and configurations must be in place. Below is a setup
checklist to ensure the environment and project are correctly configured:
[x] Development Environment: Node.js (LTS) and Yarn installed. Expo CLI installed
( npm install -g expo-cli ). Xcode and Android Studio set up for iOS/Android simulators (for
testing on both platforms).
[x] Version Control: Git repository initialized. .gitignore configured for Node/Expo (ignore
node_modules , etc.). Initial commit done with base Expo project.
[x] Supabase Configuration: Supabase project created. Auth providers (Google, Apple) configured
in Supabase if using social login. Database tables created for core entities (Users, Commitments,
Records, Friends) – ideally via an initial SQL migration script. Supabase URL and anon API key set in a
secure .env file and linked in Expo (using expo-constants or react-native-dotenv to load
env vars).
[x] Project Dependencies Installed: All required libraries added:
Expo modules: expo-sqlite (for SQLite), @react-native-async-storage/async-storage (if
needed for MMKV or as fallback), expo-haptics (for vibration).
•

•

•

55

•

•

•
•

•
•

22

State: @reduxjs/toolkit and react-redux ; redux-persist along with redux-persist-
mmkv (community plugin for MMKV storage).

Navigation: @react-navigation/native and related packages ( native-stack for stacks,
bottom-tabs for tabs, Gesture Handler, Reanimated – Expo SDK already includes RNGH and
Reanimated 2/3).
UI/Styling: nativewind (Tailwind CSS in RN) and its peer deps, react-native-svg (for any SVG
icons or Lottie if required).
Animations: lottie-react-native (and install the iOS pods via npx pod-install ), plus
ensure Reanimated config (add Reanimated Babel plugin in babel.config.js as Expo requires).
Networking: @supabase/supabase-js for API calls; @react-native-community/netinfo for
network status (Expo might include NetInfo, if not we add it).
[x] Project Configuration: Enable Hermes engine for Android in expo.dev settings (add
"jsEngine": "hermes" in app.json if not default) . This improves performance. Verify that
Metro is using the Reanimated Babel plugin (in babel.config.js) so that Reanimated worklets
function. Set up TypeScript path aliases if desired for cleaner imports (optional).
[x] Redux & Persist Setup: Create the Redux store ( store.ts ) with Redux Toolkit, add middleware
for async logic (if using Redux Thunk, it’s included by default; if Saga, set that up). Configure the
persist store to use MMKV storage and wrap the app in PersistGate . Test with a dummy state
value that persisting works.
[x] Navigation Setup: Configure the NavigationContainer in App.tsx, set up the Auth Stack and Main
Tabs with placeholder screens. Test that one can navigate (e.g. manually set a loggedIn flag to true/
false to toggle between stacks) to ensure nav config is correct.
[x] Testing Tools: Configure Jest for React Native. Install @testing-library/react-native and
set up a jest preset (Expo has a preset configuration to use). Write a simple test (e.g., render App and
expect a certain element) to verify test suite is running. If using TypeScript, add necessary type
configs for jest (in package.json or separate config).
[x] Linting/Formatting: Ensure ESLint is working with a recommended RN config (Airbnb or Expo).
Add a lint script to package.json and run it to catch any initial issues. Configure Prettier (and possibly
set up a pre-commit hook with lint-staged to auto-fix formatting on commit).
[x] Development Utilities: Install any VSCode extensions recommended (Prettier, ESLint, Tailwind
IntelliSense for classnames, etc.). Optionally, set up Reactotron or Flipper for debugging (Flipper
comes with RN for debugging Redux, network, etc., which can help inspect state and performance).
[x] Build and Run: Do a full expo start and run on both an iOS simulator and Android emulator/
device to verify the blank app loads without errors on both platforms. Fix any environment issues
now (like missing Android licenses or CocoaPods issues) before proceeding further.
[x] Task Protocol Setup: Create the TASKS.md file and populate it with the initial task entries (as
above). Prepare a Pull Request template file (e.g. .github/PULL_REQUEST_TEMPLATE.md )
containing sections for What/Why, Scope, Verification, etc., matching our protocol . Also prepare
a task-md/ directory with a template plan markdown (one can be copied from the example in the
protocol ).
[x] Performance Tools: Identify tools for profiling (we can use the built-in React Native Performance
Monitor for FPS, and Xcode Instruments/Android Profiler for memory). Not a setup per se, but note
how to use them when the time comes. Enable debugging options in Expo for performance (like
expo dev-client if needed to profile release mode performance).
[x] Analytics/Logging (Optional for MVP): If needed, set up Sentry or simple logging for error
tracking (not crucial for development, might skip in MVP).
•
•

•
•
•
•

56

•

•

•

•

•

•

•

52

57
•

•

23

This checklist ensures that by the time development starts on features, the environment won’t block us –
we’ll have a running app, connectivity to backend, and all necessary libraries in place. It greatly reduces
friction during coding (so we don’t pause to add a library or config in the middle of building a feature).
Performance Benchmarks and Quality Gates
Throughout development, we will continuously measure against performance targets and enforce quality
standards before releasing the MVP. Below are the specific performance benchmarks we aim to meet, and
the quality gates we will use to decide if a feature/build is release-ready:
Performance Benchmarks
App Launch: The app should load to the login screen quickly. Cold start (on mid-range device) under
~2.5s, warm start under 1s. We use Hermes to speed up launch time .
Authentication: Logging in (network request + navigation to dashboard) completes in < 3 seconds
on a typical network . Supabase auth is fast, but we will measure from button tap to dashboard
load.
Timeline Scrolling: The habit grid scrolls smoothly with no visible frame drops, even with several
years of data loaded. Using FlatList virtualization, we expect to handle 1,000+ days × multiple habits
efficiently . We will test by simulating a large dataset (e.g. 3 years of daily entries across 10 habits)
and ensure scroll performance is 60fps.
UI Response Time: All tap interactions give feedback within 100ms. For example, when the user taps
a day to mark complete, the cell animates immediately (with a checkmark or color change) . Any
network-dependent actions are done in the background so the UI never feels unresponsive.
Sync Speed: After being offline, when network is restored, the app syncs new data within ~3 seconds
(for up to, say, 50 offline actions). This includes sending local changes and pulling friend updates. We
will simulate offline usage and measure the time from reconnect to all data being up-to-date. The
delta sync approach helps keep this quick .
Memory Usage: The app should remain memory-efficient. We should not load all data into memory
at once. With virtualization and selective data loading, the app should stay well within limits (we’ll
verify no leaks or runaway memory usage via Instruments/Profiler).
Animation Frame Rate: All custom animations (screen transitions, Lottie animations, etc.) maintain
a solid 60fps during their duration . We will test on an iPhone 8 and a comparable Android device
by enabling the FPS monitor and ensuring it stays ~60 during animations. If any complex animation
causes a dip, we’ll optimize by moving logic to Reanimated worklets or simplifying the effect.
App Size: The final release APK/IPA should be under 20 MB. We will check the output of expo
build or EAS build. If size creeps up (due to heavy assets or libraries), we’ll take action: remove
unnecessary packages, compress assets (e.g. use WebP images or limit Lottie JSON complexity) .
Battery and Network: (General monitoring) The app’s sync process and background operations
should not drain battery excessively or use abnormal data. Since syncs are incremental and
infrequent, this should be fine; still, we’ll test a scenario of heavy usage to ensure no obvious issues
(like an infinite sync loop bug).
To verify these benchmarks, we will conduct performance testing at specific checkpoints – e.g., after
implementing the grid, test scrolling; after adding sync, test sync time; before release, measure binary size.
This ensures we catch any regressions early (for instance, if a library addition causes frame drops, we detect
it immediately).
•

56

•

11

•

58

•

11

•

20

•

•

32

•

13

•

24

Quality Gates
Before we consider the MVP ready or move on from implementing a feature, the following quality gates
must be satisfied :
Full Functional Completion: The feature or screen in question is fully implemented with all
intended functionality. For example, the Add Commitment flow is not “done” until you can
successfully create a commitment, see it on the dashboard, and it persists (even after app restart or
going offline/online). No stubs or placeholders should remain when closing a task.
All States Handled: We have accounted for empty states (e.g., no commitments yet -> show a
helpful message on the dashboard), loading states (spinners or skeletons while data is fetching), and
error states (user feedback if something goes wrong, like “Failed to sync, tap to retry”). This ensures
a polished feel and that edge cases won’t break the UI .
No Regressions / Stable Build: Running the full application, we ensure that new changes did not
break existing features. All previously passing tests still pass. We do a quick smoke test of major
flows (login, add habit, mark done, view friend) after each major merge. The app should not crash or
throw unhandled exceptions during normal use.
Code Quality & Standards: The codebase must pass all linting and type-checking. No TypeScript
errors are tolerated . We also prefer to fix all ESLint warnings (especially those related to
potential bugs). Code should be reasonably commented or self-documenting. Additionally, no file
exceeds 200 lines; if it does during development, we refactor it before considering the task done .
Performance Checks: We verify that the performance targets relevant to the feature are met. For
instance, after implementing the grid and completion animations, confirm the 60fps target with an
emulator’s FPS counter . After adding offline sync, simulate a few offline actions to ensure sync
stays under 3s. We won’t move on if, say, marking an item causes a lag or scrolling is choppy – we fix
or optimize first.
Basic Accessibility: While MVP focus is functionality, we incorporate basic accessibility. This means
every interactive element has an accessible label (for screen readers), color choices have sufficient
contrast, and the app can be navigated without major barriers. We check that important images/
icons have accessibility labels and test using VoiceOver/TalkBack on key screens. Also, no text is too
small to read comfortably. (This isn’t explicitly in the original requirements, but it’s a quality marker
we aim for.)
User Acceptance: Because this is a solo project, “user” acceptance is effectively our own assessment
against the vision. Each feature should align with the intended user experience. For example, does
the flow feel intuitive? Is the animation satisfying and not intrusive? We put ourselves in the user’s
shoes and ensure it “feels right.” Only then do we consider the feature done.
These quality gates act as a checklist before we mark tasks as completed in TASKS.md . They help maintain
a high bar of quality even as we move fast. By enforcing them consistently, we aim to deliver an MVP that is
stable, performant, and delightful.

15

•

•

15

•

•

59

14

•

60

•

•

25

Risk Register
Even with careful planning, projects face uncertainties. Below is a register of key risks identified for this
project, along with mitigation strategies for each:
Risk: Performance Bottlenecks on Low-End Devices – The app might drop frames or feel sluggish
on older devices (due to heavy animations or large data lists).
Mitigation: Test performance early and regularly on mid/low-end hardware . Use the native driver
for all animations (Reanimated) to keep interactions smooth . If we identify an animation causing
jank, simplify it or switch to a native module. We will also employ virtualized lists (FlatList) for any
long lists to avoid memory overload . By profiling with the FPS monitor during development, we
can catch and optimize any slow components before release.
Risk: Offline Sync Conflicts – A user might make changes offline that conflict with server data (or
multiple offline edits conflict), potentially causing data inconsistency when syncing.
Mitigation: Implement a clear conflict resolution strategy early (we chose Last-Write-Wins) and
handle it in code . We’ll timestamp every record and on sync, let the latest timestamp win, which
is simple and acceptable for our use-case. Additionally, queue processing will be robust: if the server
rejects an update (e.g., due to a conflict or validation), we will catch that and not leave the UI in a
wrong state. We’ll provide user feedback if a conflict does occur (for instance, if an offline change
was overwritten by server, we might show a subtle notification). Thorough testing of offline->online
scenarios will be done to ensure no crashes or duplicate entries . We also log conflicts for
later analysis. In case of sync failure (e.g., network goes down mid-sync), the app will retain the
unsynced changes and retry with backoff , so no data is lost.
Risk: Data Volume and Scaling – Over time, a power user could accumulate a large number of
commitments or years of daily data, which might strain performance or storage. For example,
rendering 5 years of data for 10 habits is ~18k data points.
Mitigation: Use efficient data handling from day one. The UI will only render a window of data at any
given time (using FlatList’s windowing) . We will implement pagination or lazy-loading for
historical data: e.g., load last 30 days by default and fetch older records on demand (or when
scrolling near the end). The local database helps filter and query data quickly, and we can add
indexes (like on date fields) to speed queries . If memory becomes an issue, we’ll implement data
archiving (move old records to an archive table not always loaded) – likely not needed for MVP but a
future safeguard. Essentially, by not naively loading everything and by leveraging database queries
(both local and Supabase), we keep the app scalable. We’ll also monitor for any slow queries and
optimize them (perhaps using the window function approach for streaks instead of iterating in
JavaScript) .
Risk: Exceeding 20 MB Size or 200-Line Limit – Integrating too many libraries or large assets could
bloat the app, and complex features might tempt us to write massive files, violating constraints.
Mitigation: Be selective with dependencies: we stick to mostly Expo built-in or lightweight libraries
. For example, use RN’s built-in components for lists and animations rather than adding heavy
•

• 61

33

62

•

•

21

63 64

65

•

•

66

67

41

•

•
13

26

third-party ones (no large native modules unless absolutely necessary). Periodically check the binary
size (using expo build:inspect or similar) – if it creeps up, audit and remove unused assets
(tree-shaking should handle code). To keep files short, we consciously break down tasks – e.g., if a
screen file is growing, we refactor some parts into separate component files. The task-based

development naturally encourages this, as we tackle one piece at a time. Code review (even self-
review) will flag if a function or file is doing too much. We also use lint rules or our own discipline to

enforce the <200 line rule . In summary, constant vigilance on size and modularity will prevent
bloat.
Risk: Integration Bugs Between Offline and Online – The interplay between local state, local DB,
and remote DB is complex. Bugs could include duplicate records, missing syncing of some edge
case, or friend data not updating properly.
Mitigation: Use a consistent data flow architecture (as designed) and test it thoroughly in different
scenarios. For integration points (e.g., after sync, do we correctly merge server data without
overwriting newer local data?), write unit tests or integration tests. For example, simulate two
conflicting updates and ensure the outcome matches our expectation (last write wins) . We will
also test friend data refresh manually: add a friend, then have that friend mark something and see if
pulling refresh gets it. Logging and perhaps a debug mode showing sync status could help during
development to trace issues. If any inconsistency is detected, we’ll address it immediately rather
than postponing, because data integrity is core to user trust.
Risk: Security and Privacy – Since we handle personal habit data, any lapse could be serious (e.g., a
bug that shows one user’s data to another, or not properly securing friend endpoints).
Mitigation: Leverage Supabase’s security features: enable Row Level Security on tables so users can
only access their rows (and friends’ where appropriate) . Test these rules with a second account to
ensure no cross-access. We will also ensure all communications are over HTTPS (Supabase does this
by default) and that we do not inadvertently log sensitive data. No PII is really stored except email
and possibly names – we’ll treat those carefully. Also, implement basic privacy: since advanced
settings are out of scope, we assume all added friends can see all your commitments by default. We
should still make it clear in UI if something is shared. If we had more time, we’d add a simple toggle
per commitment for “friends can see this”, but MVP might skip. Regardless, architecture is prepared
to respect privacy flags if present.
Risk: Timeline Constraints – Developing this entire app solo is ambitious. There’s a risk of not
meeting the timeline or having to cut corners on quality due to time.
Mitigation: Use the Cursor AI and task protocol effectively to stay organized. The detailed task
breakdown helps manage scope and catch issues early. If running behind, we’ll prioritize core
functionality (tracking and sync) over nice-to-have polish. For instance, if Day 10 arrives and friend
adding is not fully done, we might ship the friend list as view-only (no adding new friends) for MVP,
which is acceptable. The key is to always have a working increment of the app. Additionally, frequent
integration (merging features as they complete) means we’ll always have a baseline app to demo,
which de-risks the project. Finally, being disciplined about not adding unplanned features is crucial;
we stick to the plan and avoid scope creep.

14

•

•

68

•

•

69

•

•

27

Each risk will be monitored as development proceeds. This register isn’t static – we will update it if new risks
emerge (and they often do in development). By being proactive with mitigations, we increase our chances
of delivering the MVP smoothly.
Quick Reference Card
For convenient reference, here is a one-page summary of key project facts and workflows:
Tech Stack: Expo React Native (SDK 48+), TypeScript, Redux Toolkit for state, SQLite (via Expo SQLite)
for offline storage, Supabase (Postgres + Auth) for backend, MMKV for fast key-value storage, React
Navigation for navigation, Reanimated & Gesture Handler for animations, Lottie for complex
animations, Expo Haptics for feedback.
Architecture: Offline-First, Client-Driven. Device holds all recent data locally and syncs with server
on demand. Follows a queue-based sync pattern with optimistic UI updates. Supabase provides
cloud sync and auth; no custom server needed beyond Supabase’s managed backend. Clean
modular client design (screens, components, slices) ensures separation of concerns.
Key Constraints: Mobile only (iOS/Android). Keep app under 20MB and files under 200 lines each.
Ensure 60fps smooth interactions on target devices. Offline mode must be fully functional with
indefinite usage. Sync latency target <3s on reconnection. High code quality and test coverage
despite speed of development.
File Organization: Project divided into screens/ (UI screens by feature area), components/
(reusable UI pieces), store/ (Redux slices and store config), database/ (local DB and sync logic),
services/ (Supabase and external services), and utils/ (helpers). task-md/ contains
planning docs. This modular layout makes it easy to navigate and maintain the code.
Task Workflow: Each development task is tracked in TASKS.md with a unique entry. Work is done
in a dedicated git branch (named feat/... or fix/... ). After implementation and local
testing, a Pull Request is created, using a template that includes what/why, scope of changes, and a
checklist of tests done. Only after the PR is reviewed and all tests pass is it merged to main. Then the
TASKS.md entry is updated to mark it completed. This ensures systematic progress and
accountability for every feature.
Git Commands: Common actions – use git checkout -b feat/xyz to start a new task branch,
commit often with git commit -m "feat: short description [task name]" . Push branch
to remote and open PR on GitHub. After merge, delete the branch. Keep main protected (no direct
commits). Use tags or releases as needed for milestones.
Testing Routine: Run unit tests with npm test (Jest). Write tests for reducers, utility functions, and
critical components. Use npm run lint and npm run tsc to catch linting and typing issues
before committing. Manually test offline by toggling network, and use Expo’s Device→Network
debug menu to simulate offline if needed. For performance, use the built-in FPS monitor in React
Native (Dev Settings) and Xcode/Android Studio profilers.
Performance Tips: Use FlatList (virtualized lists) for any scrollable list of items (habits, days, friends)
. Avoid computations on the main thread – heavy logic can be moved to background (e.g., use
async functions or offload to the database or a web worker if available). Leverage Reanimated for
animations to keep them on the UI thread. Keep an eye on memory – do not store huge arrays in
Redux; instead query slices of data from SQLite on the fly. Periodically test on a physical device for
realistic performance.
Synchronization Notes: The app will attempt sync whenever it gains connectivity. If issues arise
(server down or conflict), data stays safe on device and sync retries later. You can always reset the
•

•

•

•

•

•

•

•
38

•

28

local DB if needed by a special debug action (not exposed to users) if things go awry. Typically, last-
write-wins means whichever device synced last wins the data for that entry – be aware of this during

testing.
Development Timeline Checkpoints: By end of Week 1, aim to have Auth and basic habit tracking
working. By end of Week 2, have friends list and all MVP features done, moving into polish. Use the
daily breakdown as a guideline, and don’t forget to allocate time for refactoring and fixing once
features integrate (especially around Day 9–10).
Documentation & Resources: Refer to Supabase docs for any backend rule or query details. React
Native docs for any platform-specific issues. The architecture reference diagram (in Technical
Architecture section) can help visualize the data flow. The task protocol document is available in
task-md/ for formatting any new tasks or plans.