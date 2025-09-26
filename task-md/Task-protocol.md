# TASKS.md — Single Source of Truth
_Last Updated: 2025-09-24 13:58 EDT_

This file governs all project tasks in accordance with the **🔐 Task‑MD Protocol**. Do **not** create any alternate task files.

---

## Session Rules (Always Read First)

**URL Reporting Rule**
- When a feature is updated, report: `http://localhost:[PORT]/[route]` (or staging/prod URL).
- When a file is modified, report full path: `/project-root/src/[file]`.
- Include what changed and how/where to verify visually.

**⚠️ CRITICAL: BRANCH FIRST — NO EXCEPTIONS**
Before any change:
1) `git branch --show-current` must **not** show `main`/`master`.
2) Create a feature branch: `feat/<slug>` (or `fix/…`, `chore/…`).
3) Document the branch below under the task entry.
4) Create exactly one `*-plan.md` beside this file for implementation details.

**Component Safe‑Space Replacement Protocol**
- Archive old code in `_archive/`.
- Extract shared logic into `_shared/`.
- Enforce CSP, a11y, and performance budgets.
- Rollback by pointing layout to `_archive/` or restore commit/tag.

**Phase‑Level Gates**
1. Performance Pre‑Check (analysis only)
2. Verification Questions:
   - “Please verify this phase is correct. Yes/No”
   - “Also confirm the date/time for this entry.”
3. If **YES** → Push & log short SHA
4. If **NO** → Stop and await guidance
5. Spin‑off tasks → Log separately with new branch/plan

**Task Completion & Archival**
- When all phases verified and final commit logged:
  - Copy plan to `archived-tasks/` as `[TaskName]-Plan-COMPLETED.md` with metadata.
  - Update this TASKS.md to mark **ARCHIVED**.

**Directory Structure**
```
task-md/
├── archived-tasks/
│   ├── [TaskName]-Plan-COMPLETED.md
│   └── README.md (archive index)
├── [active-task]-plan.md
├── TASKS.md
└── TASK-PROTOCOL.md
```

**Archive Metadata Template**
```
# [ARCHIVED] Task Name — COMPLETED
Completion Date: YYYY-MM-DD HH:mm TZ
Final Branch: feat/[branch-name]
Final Commit: [short-SHA]
Total Phases: [X]
Performance Achieved: [metrics]
Lessons Learned: [notes]

[Original plan content follows…]
```

**Governance & Scope Changes**
- If scope changes materially: pause, summarize risks, and request approval before continuing.

---

## Pre-TestFlight Guardrails — COMPLETE ✅

**Date/Time (ET):** 2025-09-25 18:48 EDT
**Branch:** release/pretestflight-guardrails
**Status:** COMPLETE
**Tag:** v0.1.0-preflight ✅

### What We Tightened

1. **Persist Whitelist Restriction**
   - Redux Persist now only stores: `['auth', 'settings', 'sync']`
   - Explicitly blacklists large/derived data: `['commitments', 'records', 'social']`
   - Added proper serializable check ignore for all redux-persist actions

2. **Sync Safety**
   - Added `SyncService.stop()` method that cancels intervals, unsubscribes listeners, aborts in-flight requests
   - Wired into AuthContext sign-out path: `SyncService.stop()` → `logoutGlobal()` → `persistor.purge()`

3. **Token & PII Security**
   - Supabase sessions now stored in SecureStore/Keychain (not AsyncStorage)
   - Removed PII from logs (emails, names, usernames in debug output)
   - Created secure storage adapter at `/src/services/secureStorage.ts`

4. **Basic Telemetry**
   - Sentry init with environment gating (only if `EXPO_PUBLIC_SENTRY_DSN` provided)
   - Low sample rate (0.1) for minimal overhead
   - Graceful fallback if DSN missing

5. **Minimal Performance Marks**
   - Dev-only timing helper at `/src/_shared/perf.ts`
   - TTFS measurement: `mark('app:start')` in App.tsx, `since('app:start')` in DashboardScreen
   - Zero production impact (`__DEV__` guards)

6. **Lint Hygiene**
   - Added `@typescript-eslint/no-floating-promises` warning
   - TypeScript strict mode already enabled (includes `strictNullChecks`)
   - Existing React hooks exhaustive-deps warning retained

### Sign-out Sequencing
1. `SyncService.stop()` - Cancel background work
2. `store.dispatch(logoutGlobal())` - Reset Redux state
3. `await persistor.purge()` - Clear persisted storage

### Token Storage Location
- **Before:** AsyncStorage (insecure)
- **After:** SecureStore/Keychain via `/src/services/secureStorage.ts`

### Files Modified
- `/src/store/index.ts` - persist whitelist, serializable ignore
- `/src/services/syncService.ts` - stop() method
- `/src/contexts/AuthContext.tsx` - sync stop + sequence
- `/src/services/secureStorage.ts` - new SecureStore adapter
- `/src/services/supabase.ts` - use secure storage
- `/src/services/friends.ts` - remove PII logs
- `/src/_shared/perf.ts` - new timing helper
- `/App.tsx` - Sentry init, TTFS mark
- `/src/screens/Dashboard/DashboardScreen.tsx` - TTFS log
- `/eslint.config.js` - no-floating-promises rule

### Post-TestFlight Roadmap (Deferred)
- Deep performance tuning
- List virtualization overhaul
- Analytics algorithm refactors
- Bundle/code-split experiments
- Large file restructures
- E2E test harness

---

## MVP Feature Backlog

**Branch Convention:** `feat/<area>-<short-name>` (base = main)
**Process:** Task-MD phases (Plan → Build → Verify) with minimal diffs and evidence

### Core Features

- [ ] **User Onboarding Flow**
  - **Area:** auth
  - **Acceptance Criteria:** Email signup → profile creation → dashboard redirect, skip tutorial option, welcome tour for first-time users
  - **Est:** 3-5 days

- [ ] **Commitment Creation & Management**
  - **Area:** commitments
  - **Acceptance Criteria:** Create/edit/delete commitments, set target days, choose colors, mark as private/public
  - **Est:** 2-3 days

- [ ] **Daily Habit Tracking**
  - **Area:** tracking
  - **Acceptance Criteria:** Mark today's progress, view current streak, see completion percentage, undo today's entry
  - **Est:** 2-3 days

- [ ] **Basic Analytics Dashboard**
  - **Area:** analytics
  - **Acceptance Criteria:** Weekly/monthly views, streak visualization, completion trends, simple charts
  - **Est:** 3-4 days

- [ ] **Friend Discovery & Management**
  - **Area:** social
  - **Acceptance Criteria:** Search users by email, send/accept friend requests, view friends list, remove friends
  - **Est:** 4-5 days

- [ ] **Friends' Progress Visibility**
  - **Area:** social
  - **Acceptance Criteria:** See friends' public commitments, view their streaks (aggregated), privacy controls
  - **Est:** 3-4 days

### Enhancement Features

- [ ] **Offline Support**
  - **Area:** sync
  - **Acceptance Criteria:** Track habits offline, sync when online, handle conflicts gracefully, show sync status
  - **Est:** 5-7 days

- [ ] **Notifications & Reminders**
  - **Area:** notifications
  - **Acceptance Criteria:** Daily habit reminders, streak milestone celebrations, friend activity updates
  - **Est:** 3-4 days

- [ ] **Profile Customization**
  - **Area:** profile
  - **Acceptance Criteria:** Upload avatar, edit username/bio, privacy settings, account deletion
  - **Est:** 2-3 days

- [ ] **Data Export & Import**
  - **Area:** data
  - **Acceptance Criteria:** Export habit data as CSV/JSON, import from other apps, backup/restore functionality
  - **Est:** 2-3 days

### Polish Features

- [ ] **Dark Mode**
  - **Area:** theming
  - **Acceptance Criteria:** System preference detection, manual toggle, consistent styling across app
  - **Est:** 1-2 days

- [ ] **Accessibility Improvements**
  - **Area:** a11y
  - **Acceptance Criteria:** Screen reader support, high contrast mode, keyboard navigation, font scaling
  - **Est:** 3-4 days

- [ ] **Performance Optimization**
  - **Area:** perf
  - **Acceptance Criteria:** List virtualization, image optimization, bundle size reduction, startup time < 2s
  - **Est:** 4-5 days

**Non-Goals (Deferred):** Deep performance tuning, large refactors, analytics algorithm rewrites, E2E test harness

---

## Active Tasks (Legacy)
> Phases use decimals for granular steps (e.g., Phase 1.3, Phase 3.5). Each phase must run the **Phase‑Level Gates** above.

### 1. Centralize Logout State Reset & Persist Purge
- **Slug:** `logout-reset-centralization`
- **Branch:** `feat/logout-reset-centralization`
- **Plan:** `task-md/logout-reset-centralization-plan.md`
- **Status:** Pending
- **Summary:** Move all logout-related Redux resets out of UI, add root-level state reset and Persist purge on logout.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 1.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Entry:** 2025-09-24 14:08 EDT, feat/logout-reset-centralization, Analysis complete: Found logout logic scattered across AuthContext, ProfileScreen, DashboardScreen, and Redux. No persistor.purge() on logout. Assets: 1MB (fonts 252KB). No WebView/CSP risks. Missing accessibility labels.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 1.1 — Plan**
  - Flesh out details in `task-md/logout-reset-centralization-plan.md`. No code changes.
  - **Entry:** 2025-09-24 14:25 EDT, feat/logout-reset-centralization, Plan detailed: Root reducer with auth/LOGOUT_GLOBAL intercept, persistor.purge() in AuthContext SIGNED_OUT handler, remove DashboardScreen lines 40-46 clearing logic, navigation to Auth stack post-logout, QA checklist for cross-account data verification.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 1.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Entry:** 2025-09-24 14:30 EDT, feat/logout-reset-centralization, Root reducer reset implemented: auth/LOGOUT_GLOBAL action intercept, logoutGlobal() exports, _archive backup created. Commit 5bb706c.
  - **Verification:** Complete - iOS build successful, Redux store exposed to debugger (global.store), logoutGlobal() action available for dispatch testing, root reducer intercepts auth/LOGOUT_GLOBAL and resets all persisted state to initialState values. Cross-account data isolation verified through Redux Persist whitelist clearing.
  - **Phase 1.2 — Build (Part A) — Verification**
  - **Date/Time (ET):** 2025-09-24 17:43 ET
  - **Branch:** feat/logout-reset-centralization
  - **Commit:** 5bb706c
  - **URLs/Paths:** 
    - Routes verified: app://Dashboard, app://Analytics
    - Files changed: 
      /Users/taesongkim/Code/d64b/justintest/src/store/index.ts
      /Users/taesongkim/Code/d64b/justintest/src/store/slices/authSlice.ts
      /Users/taesongkim/Code/d64b/justintest/_archive/store-index-original.ts
  - **What changed:** Root reducer now intercepts `auth/LOGOUT_GLOBAL` and resets all slices to initialState.
  - **Visual verification results:**
    - A_before_reset: commitments=13, records=15
    - after_reset: commitments=0, records=0
    - B_after_login: commitments=0, records=0
  - **Status:** **VERIFIED: YES**
  - **Performance Notes:** Reset synchronous; no perf regressions observed.
  - **Risks:** None observed in this phase.
  - **Gate Qs:** Verify? Yes. Confirmed 2025-09-24 17:20 EDT.
- **Phase 1.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Plan:**
    1) **AuthContext.tsx** - Add imports for store/persistor/logoutGlobal, update SIGNED_OUT event handler to dispatch logoutGlobal() and purge persistor, add idempotent fallback to signOut() method, replace log message with '🔐 SIGNED_OUT → LOGOUT_GLOBAL + PURGE'
    2) **DashboardScreen.tsx** - Remove UI-level clearing logic (lines 40-46), replace with simple skip message when no user
    3) Archive originals to _archive/AuthContext-before-phase1_3.tsx and _archive/Dashboard-clearing-before-phase1_3.tsx
  - **Files:**
    - /Users/taesongkim/Code/d64b/justintest/src/contexts/AuthContext.tsx
    - /Users/taesongkim/Code/d64b/justintest/src/screens/Dashboard/DashboardScreen.tsx
    - /Users/taesongkim/Code/d64b/justintest/_archive/AuthContext-before-phase1_3.tsx
    - /Users/taesongkim/Code/d64b/justintest/_archive/Dashboard-clearing-before-phase1_3.tsx
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 1.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 1.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 2. Consolidate Auth State (Remove Duplication)
- **Slug:** `auth-state-consolidation`
- **Branch:** `feat/auth-state-consolidation`
- **Plan:** `task-md/auth-state-consolidation-plan.md`
- **Status:** Pending
- **Summary:** Choose single source of truth for auth (Context or Redux) and remove the redundant path.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 2.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 2.1 — Plan**
  - Flesh out details in `task-md/auth-state-consolidation-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 2.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 2.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 2.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 2.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 3. Analytics Screen Modularization
- **Slug:** `analytics-modularization`
- **Branch:** `feat/analytics-modularization`
- **Plan:** `task-md/analytics-modularization-plan.md`
- **Status:** Pending
- **Summary:** Extract heavy computations into hooks/utils and split charts into subcomponents.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 3.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 3.1 — Plan**
  - Flesh out details in `task-md/analytics-modularization-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 3.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 3.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 3.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 3.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 4. Dashboard Data-Loading Refactor
- **Slug:** `dashboard-data-refactor`
- **Branch:** `feat/dashboard-data-refactor`
- **Plan:** `task-md/dashboard-data-refactor-plan.md`
- **Status:** Pending
- **Summary:** Move data fetching/mapping into thunk/service; slim the screen and split large UI chunks.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 4.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 4.1 — Plan**
  - Flesh out details in `task-md/dashboard-data-refactor-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 4.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 4.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 4.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 4.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 5. Commitment Grid Maintainability & Perf
- **Slug:** `commitment-grid-refactor`
- **Branch:** `feat/commitment-grid-refactor`
- **Plan:** `task-md/commitment-grid-refactor-plan.md`
- **Status:** Pending
- **Summary:** Extract grid utilities, consider row subcomponents/memoization and stronger virtualization.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 5.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 5.1 — Plan**
  - Flesh out details in `task-md/commitment-grid-refactor-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 5.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 5.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 5.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 5.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 6. Friends Module Encapsulation
- **Slug:** `friends-encapsulation`
- **Branch:** `feat/friends-encapsulation`
- **Plan:** `task-md/friends-encapsulation-plan.md`
- **Status:** Pending
- **Summary:** Split friends service into request/data submodules and replace global refresh with Context/Redux.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 6.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 6.1 — Plan**
  - Flesh out details in `task-md/friends-encapsulation-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 6.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 6.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 6.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 6.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 7. Legacy/Dead Code Cleanup
- **Slug:** `cleanup-legacy-code`
- **Branch:** `chore/cleanup-legacy-code`
- **Plan:** `task-md/cleanup-legacy-code-plan.md`
- **Status:** Pending
- **Summary:** Remove OfflineQueueService and dev-only sample data, consolidate logs and unused code.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 7.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 7.1 — Plan**
  - Flesh out details in `task-md/cleanup-legacy-code-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 7.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 7.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 7.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 7.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 8. Validation, Error Boundaries & UX Errors
- **Slug:** `validation-error-boundaries`
- **Branch:** `feat/validation-error-boundaries`
- **Plan:** `task-md/validation-error-boundaries-plan.md`
- **Status:** Pending
- **Summary:** Add form/input validation, user-facing error messages, and top-level error boundaries.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 8.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 8.1 — Plan**
  - Flesh out details in `task-md/validation-error-boundaries-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 8.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 8.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 8.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 8.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.


### 9. README Upgrade for Doctrine & Workflow
- **Slug:** `readme-upgrade`
- **Branch:** `chore/readme-upgrade`
- **Plan:** `task-md/readme-upgrade-plan.md`
- **Status:** Pending
- **Summary:** Update README with quickstart, conventions, Task-MD workflow, performance/security doctrine.
- **Cross-Feature Risks:** State consistency, offline sync interactions, UI regressions.
- **Performance Notes:** Track FPS on grid/analytics, monitor Redux Persist IO time.
- **Verification:** Pending

**Phases**
- **Phase 9.0 — Performance Pre‑Check (analysis only)**
  - Confirm current FPS/CPU/memory on target screens.
  - Record bundle/asset sizes; note CSP or a11y risks.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 9.1 — Plan**
  - Flesh out details in `task-md/readme-upgrade-plan.md`. No code changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 9.2 — Build (Part A)**
  - Implement scoped changes per plan.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 9.3 — Build (Part B)**
  - Complete remaining scoped changes.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
- **Phase 9.4 — Verify**
  - Report URLs and file paths changed; include how to verify visually.
  - Add short SHA and date/time once approved.
- **Phase 9.5 — Merge**
  - Open PR with template; ensure QA checklist complete.
  - After approval, merge and prep archival.

---

## Reporting Format (per phase)
- Date/Time (ET)
- Branch name
- Short SHA
- URLs: `http://localhost:[PORT]/[route]` (and staging/prod if applicable)
- Files touched with full paths
- What changed and how to verify visually
- Performance notes (FPS/CPU/memory), bundle deltas
- Risks/new follow‑ups

## README Requirements (to be addressed by Task 9)
1. Quickstart & scripts
2. Codebase tour & file‑size rules
3. Conventions (branches, commits, testing, a11y)
4. Task‑MD workflow
5. Performance doctrine
6. Security & CSP policy
7. FAQs & gotchas

- **Phase 1.3 — Build**
  - **Date/Time (ET):** Sep 24, 6:36PM EDT
  - **Branch:** feat/logout-reset-centralization
  - **Files Modified:** /src/contexts/AuthContext.tsx, /src/screens/Dashboard/DashboardScreen.tsx, /src/store/index.ts
  - **Archives Created:** /_archive/AuthContext-before-phase1_3.tsx, /_archive/Dashboard-clearing-before-phase1_3.tsx
  - **What Changed:** Wire SIGNED_OUT -> auth/LOGOUT_GLOBAL + persistor.purge(); remove UI clearing from Dashboard; fix logoutGlobal export.
  - **Verification Plan:** UI logout zeros all slices; cold start remains zero; cross-account clean; offline logout clean.
  - **Commit:** VERIFIED - Ready for commit.

- **Phase 1.6 — Recovery (Restore centralized logout onto main) — PLAN**
  - **Date/Time (ET):** 2025-09-25 15:33 EDT
  - **Branch:** fix/restore-logout-reset
  - **Scope:** Restore centralized logout reset lost during previous merge. Ensure:
    - `AuthContext.tsx`: Supabase `SIGNED_OUT` → dispatch `auth/LOGOUT_GLOBAL` **and** `await persistor.purge()`
    - `store/index.ts`: root reducer wrapper intercepting `auth/LOGOUT_GLOBAL` and returning `appReducer(undefined, action)`, plus `logoutGlobal` export
    - `DashboardScreen.tsx`: no UI-level clearing of Redux state on missing `user?.id`
  - **Files:** 
    - /src/contexts/AuthContext.tsx
    - /src/store/index.ts
    - /src/screens/Dashboard/DashboardScreen.tsx
  - **Verification (expected):**
    - UI logout fully clears Redux slices and persisted state
    - Cold start remains cleared
    - Cross-account isolation intact
    - Offline logout path remains consistent
  - **Risks:** Sign-out event timing, persist rehydration, navigation race
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.

- **Phase 1.6.1 — Build (Recovery)**
  - **Entry:** 2025-09-25 15:33 EDT, fix/restore-logout-reset
  - **What changed:** Restored centralized logout by cherry-picking / restoring files on new branch.
  - **Commit(s):** [record with `git rev-parse --short HEAD`]
  - **URLs:** N/A (code only)
  - **Files touched:** /src/contexts/AuthContext.tsx, /src/store/index.ts, /src/screens/Dashboard/DashboardScreen.tsx
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.

- **Phase 1.6.2 — Verify (App)**
  - **Date/Time (ET):** [fill at run]
  - **Branch:** fix/restore-logout-reset
  - **Where to verify (URLs):**
    - app://Profile → Sign Out (triggers Supabase `SIGNED_OUT`)
    - app://Dashboard (post-logout → 0 commitments)
    - app://Analytics (post-logout → 0 records/series)
  - **Console Evidence (DevTools):**
    - Use `__snapV2('A_before_reset')` (counts > 0), then dispatch: `globalThis.store.dispatch({ type: 'auth/LOGOUT_GLOBAL' })`, then `__snapV2('after_reset')` (0/0)
    - UI logout path: sign in, create data, Profile → Sign Out → `__snapV2('after_SIGNED_OUT')` (0/0), cold relaunch → still (0/0)
    - Cross-account: login B → `__snapV2('B_after_login')` (no overlap)
    - Offline edge: 100% loss → UI logout → relaunch → still (0/0)
  - **Performance Notes:** Reset synchronous; purge I/O minimal
  - **Verification:** Pending
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.

- **Phase 1.6.3 — PR Opened (Recovery)**
  - **Date/Time (ET):** 2025-09-25 15:33 EDT
  - **Branch:** fix/restore-logout-reset → main
  - **PR (creation page):** https://github.com/taesongkim/d64b/pull/new/fix/restore-logout-reset
  - **Title:** fix(logout): restore centralized logout reset on top of current main
  - **Body (summary):** Re-applies centralized logout reset (`auth/LOGOUT_GLOBAL` + `persistor.purge()`) and removes UI-level clearing to prevent cross-account bleed.
  - **Scope of changes:** /src/store/index.ts, /src/contexts/AuthContext.tsx, /src/screens/Dashboard/DashboardScreen.tsx
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.

- **Phase 1.6.3.1 — PR URL (final)**
  - **Date/Time (ET):** [fill at submit]
  - **PR:** [replace with final URL, e.g., https://github.com/taesongkim/d64b/pull/2]
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.

- **Phase 1.6.4 — Merge**
  - **Date/Time (ET):** [fill after merge]
  - **Final SHA:** [short SHA]
  - **Verification:** Post-merge cold start + `__snapV2('post_merge')` shows cleared state after UI logout; cross-account safe.
  - **Gate Qs:** Verify? Yes/No. Confirm date/time.
