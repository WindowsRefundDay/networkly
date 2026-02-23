#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

LOCK_FILE=".next/dev/lock"
PORT="${PORT:-3000}"

is_running() {
  local pid
  if [ -f "$LOCK_FILE" ]; then
    pid="$(cat "$LOCK_FILE" 2>/dev/null || true)"
    if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

next_dev_on_port() {
  local pid
  pid="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n1 || true)"
  if [ -z "$pid" ]; then
    return 1
  fi

  ps -p "$pid" -o command= | rg -q "next(.*/next)? dev"
}

if is_running; then
  echo "Next.js dev server is already running for this workspace (pid $(cat "$LOCK_FILE"))."
  echo "Stop that process before starting a new one in this workspace."
  exit 0
fi

if next_dev_on_port; then
  echo "A Next.js dev server is already running on port $PORT."
  exit 0
fi

if [ -f "$LOCK_FILE" ]; then
  echo "Removing stale Next.js lock file: $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  echo "Port $PORT is in use. Trying $((PORT + 1))..."
  PORT=$((PORT + 1))
done

echo "Starting Next.js dev server on port $PORT"
exec pnpm dev --port "$PORT"
