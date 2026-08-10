#!/usr/bin/env bash
set -eu

echo "Stopping NudMedi..."

PORTS=(4000 3000 3001)
STOPPED=0

for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    # shellcheck disable=SC2086
    kill $PIDS 2>/dev/null || true
    # Wait briefly and force kill if needed
    sleep 1
    PIDS_LEFT=$(lsof -ti :"$PORT" 2>/dev/null || true)
    if [ -n "$PIDS_LEFT" ]; then
      # shellcheck disable=SC2086
      kill -9 $PIDS_LEFT 2>/dev/null || true
    fi
    echo "       Port $PORT stopped."
    STOPPED=1
  fi
done

if [ "$STOPPED" -eq 0 ]; then
  echo "       Nothing was running."
else
  echo "       NudMedi stopped."
fi