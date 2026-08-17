#!/usr/bin/env bash
set -eu

echo "Stopping NudMedi..."
pm2 stop all 2>/dev/null || true
echo "       NudMedi stopped."