#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  Starting NudMedi..."
echo "=========================================="

# Kill old processes first
for PORT in 4000 3000 3001 3002; do
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    kill $PIDS 2>/dev/null || true
    sleep 0.5
    PIDS_LEFT=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [ -n "$PIDS_LEFT" ]; then
      kill -9 $PIDS_LEFT 2>/dev/null || true
    fi
  fi
done

# Start with PM2
pm2 start ecosystem.config.js --update-env 2>&1
pm2 save 2>&1

echo ""
echo "  =========================================="
echo "    NudMedi is running"
echo "    Backend:  http://localhost:4000"
echo "    Frontend: http://localhost:3000  (users)"
echo "    Staff:    http://localhost:3001  (nurse + admin)"
echo "    Online:   https://nudmedi.com"
echo "  =========================================="
echo ""
echo "  Run  ./stop_system.sh  to stop."

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