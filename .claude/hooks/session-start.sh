#!/usr/bin/env bash
# SessionStart hook: in Claude Code cloud sessions, pre-fetch Maven and npm
# dependencies so builds and tests work right away. Does nothing locally.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Backend: build modules and resolve dependencies without running tests.
mvn -B -q install -DskipTests >&2

# Frontend: install exactly what package-lock.json specifies.
if [ ! -d frontend/node_modules ]; then
  (cd frontend && npm ci --no-audit --no-fund >&2)
fi
