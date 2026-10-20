#!/usr/bin/env bash
#
# Builds everything once, then runs the backend and the frontend tests at the same time, as two separate processes
# (CLAUDE.md, "Parallel test execution"). Fails when either suite fails.
#
#   bash scripts/test-all.sh
#
# Works in Git Bash on Windows. Logs: target/test-all/backend.log and target/test-all/frontend.log.
# The frontend tests start their own copy of the service jar on a free port; the backend tests use their own JVM,
# so the two never share a port or a database.

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/target/test-all"
FALLBACK_MVN=/c/BIZ/TOOLS/maven/apache-maven-3.9.6/bin/mvn

if [ -n "${MVN:-}" ]; then
  :
elif command -v mvn >/dev/null 2>&1; then
  MVN=mvn
elif [ -x "$FALLBACK_MVN" ]; then
  MVN="$FALLBACK_MVN"
else
  echo "test-all: mvn is neither on the PATH nor at $FALLBACK_MVN" >&2
  exit 1
fi

cd "$ROOT" || exit 1

# ---- 1. Build once ---------------------------------------------------------------------------------------------------
# Output goes to the console: `clean` removes target/, so the logs directory is only created afterwards.
echo "test-all: building (mvn clean install -DskipTests)"
if ! "$MVN" -B clean install -DskipTests; then
  echo "test-all: the build failed, no tests were run" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

# ---- 2. Both suites at the same time ---------------------------------------------------------------------------------
started=$(date +%s)

"$MVN" -B -pl service test >"$LOG_DIR/backend.log" 2>&1 &
backend_pid=$!
"$MVN" -B -pl ui test -Pui-tests >"$LOG_DIR/frontend.log" 2>&1 &
frontend_pid=$!

# Ctrl+C stops both suites, not just this script
trap 'kill "$backend_pid" "$frontend_pid" 2>/dev/null; exit 130' INT TERM

echo "test-all: backend and frontend tests running (logs in $LOG_DIR)"
wait "$backend_pid"
backend_status=$?
wait "$frontend_pid"
frontend_status=$?
trap - INT TERM

# ---- 3. Summary ------------------------------------------------------------------------------------------------------
strip_colors() {
  sed 's/\x1b\[[0-9;]*m//g'
}

result() {
  if [ "$1" -eq 0 ]; then echo "PASSED"; else echo "FAILED (exit $1)"; fi
}

# Surefire's last "Tests run: ..." line is the module total
backend_counts=$(grep -E '^\[(INFO|ERROR|WARNING)\] Tests run:' "$LOG_DIR/backend.log" | tail -n 1 | sed -E 's/^\[[A-Z]+\] //')
# Vitest prints "Test Files  5 passed (5)" and "Tests  34 passed (34)"
frontend_counts=$(strip_colors <"$LOG_DIR/frontend.log" | grep -E '^\s*(\[INFO\] )?\s*(Test Files|Tests)\s' | sed -E 's/^\s*(\[INFO\] )?\s*//' | tr -s ' ' | paste -sd ',' - | sed 's/,/, /g')

echo
echo "test-all summary ($(( $(date +%s) - started )) s for both suites)"
echo "  backend:  $(result "$backend_status")  ${backend_counts:-no test summary found}  [$LOG_DIR/backend.log]"
echo "  frontend: $(result "$frontend_status")  ${frontend_counts:-no test summary found}  [$LOG_DIR/frontend.log]"

if [ "$backend_status" -ne 0 ] || [ "$frontend_status" -ne 0 ]; then
  exit 1
fi
exit 0
