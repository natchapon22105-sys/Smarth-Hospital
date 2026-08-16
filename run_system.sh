#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down NudMedi..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  kill "$STAFF_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "NudMedi stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

# --------------------------------------------------------------------------
# Kill any lingering processes on our ports first
# --------------------------------------------------------------------------
for PORT in 4000 3000 3001 3002; do
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    kill $PIDS 2>/dev/null || true
    sleep 1
    PIDS_LEFT=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [ -n "$PIDS_LEFT" ]; then
      kill -9 $PIDS_LEFT 2>/dev/null || true
    fi
  fi
done

# --------------------------------------------------------------------------
# Backend
# --------------------------------------------------------------------------
echo "[1/2] Starting backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "       Created .env from .env.example"
fi

if [ ! -d node_modules ]; then
  npm install
fi

# Rebuild native bindings if needed (better-sqlite3 requires native compilation)
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
  npm rebuild better-sqlite3 2>/dev/null || true
fi

npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!

# Wait until backend port is ready
for i in $(seq 1 20); do
  if lsof -ti :4000 >/dev/null 2>&1; then
    echo "       Backend ready at http://localhost:4000"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "       WARNING: Backend may not have started yet."
  fi
  sleep 1
done

# --------------------------------------------------------------------------
# Frontend (users)
# --------------------------------------------------------------------------
echo "[2/3] Starting frontend (users)..."
cd "$SCRIPT_DIR/frontend"

if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "       Created .env.local from .env.local.example"
fi

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

# --------------------------------------------------------------------------
# Staff app (nurse + admin)
# --------------------------------------------------------------------------
echo "[3/3] Starting staff app (nurse + admin)..."
cd "$SCRIPT_DIR/staff"

if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "       Created .env.local from .env.local.example"
fi

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev > /dev/null 2>&1 &
STAFF_PID=$!

# Small pause so the user can see the startup message
sleep 2

echo ""
echo "  =========================================="
echo "    NudMedi is running"
echo "    Backend:  http://localhost:4000"
echo "    Frontend: http://localhost:3000  (users)"
echo "    Staff:    http://localhost:3001  (nurse + admin)"
echo "  =========================================="
echo ""
echo "  Run  ./stop_system.sh  to stop."
echo ""

wait