#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/taesongkim/Code/d64b/justintest"
cd "$REPO_ROOT"

# Branch-first rule: create a docs-only branch off main
git checkout main
git pull --ff-only
MERGE_SHA="$(git log -1 --pretty=%h)"
BRANCH_ARCHIVE="chore/logout-reset-archival"
git checkout -b "$BRANCH_ARCHIVE"

# Ensure archive dir exists
mkdir -p task-md/archived-tasks

# Compose archive metadata header then append original plan content
COMPLETION_TS="$(TZ=America/New_York date '+%Y-%m-%d %H:%M %Z')"
cat > task-md/archived-tasks/logout-reset-centralization-Plan-COMPLETED.md <<META
# [ARCHIVED] logout-reset-centralization - COMPLETED
Completion Date: ${COMPLETION_TS}
Final Branch: feat/logout-reset-centralization
Final Commit: ${MERGE_SHA}
Total Phases: 1.0–1.6
Performance Achieved: Reset is synchronous; purge I/O minimal; no regressions observed
Lessons Learned: Centralize auth-driven state eviction; avoid UI-layer clears; verify with DevTools snapshots
---
META

# Append original plan content (source of truth kept alongside)
cat task-md/logout-reset-centralization-plan.md >> task-md/archived-tasks/logout-reset-centralization-Plan-COMPLETED.md

# Update Task Protocol to flag ARCHIVED with final metadata
NOW_ET="$(TZ=America/New_York date '+%Y-%m-%d %H:%M %Z')"
cat >> task-md/Task-protocol.md <<EOF

- **ARCHIVED — logout-reset-centralization**
  - **Date/Time (ET):** ${NOW_ET}
  - **Final Branch:** feat/logout-reset-centralization
  - **Final Commit:** ${MERGE_SHA}
  - **Artifacts:**
    - /Users/taesongkim/Code/d64b/justintest/task-md/archived-tasks/logout-reset-centralization-Plan-COMPLETED.md
  - **Notes:** Phases 1.0–1.6 verified. Centralized logout reset + purge confirmed across routes.
EOF

git add task-md/Task-protocol.md task-md/archived-tasks/logout-reset-centralization-Plan-COMPLETED.md
git commit -m "docs(archive): archive logout-reset-centralization with metadata (final commit: ${MERGE_SHA})"

# (Optional) If GitHub CLI is unavailable, print manual PR URL for this docs branch:
echo "Docs branch ready: ${BRANCH_ARCHIVE}"
echo "Create PR manually: https://github.com/taesongkim/d64b/pull/new/${BRANCH_ARCHIVE}"
