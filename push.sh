#!/usr/bin/env bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
# NudMedi – Push to GitHub
# ─────────────────────────────────────────────────────────────────────────────
# Usage:
#   ./push.sh "ข้อความ commit"
#
# Example:
#   ./push.sh "อัปเดตระบบจองคิวและเพิ่มฟีเจอร์ AI"
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BRANCH="main"
REMOTE="origin"

# --- 1. Check arguments -----------------------------------------------------
if [ $# -eq 0 ]; then
  echo "❌ ใส่ข้อความ commit ด้วย เช่น"
  echo "   ./push.sh \"อัปเดตระบบจองคิว\""
  exit 1
fi

COMMIT_MSG="$*"

# --- 2. Check if there's anything to commit --------------------------------
if ! git status --short | grep -q .; then
  echo "✅ ไม่มีไฟล์ที่เปลี่ยนแปลง — push ไม่จำเป็น"
  exit 0
fi

# --- 3. Show what will be committed ----------------------------------------
echo "📦 ไฟล์ที่จะ commit:"
git status --short
echo ""

# --- 4. Confirm before pushing ---------------------------------------------
read -r -p "⏩ แสดง diff ก่อน commit? (y/n): " SHOW_DIFF
if [ "$SHOW_DIFF" = "y" ] || [ "$SHOW_DIFF" = "Y" ]; then
  git diff --stat
  echo ""
fi

read -r -p "🚀 ดำเนินการ commit และ push? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "✋ ยกเลิกแล้ว"
  exit 0
fi

# --- 5. Add, commit, push --------------------------------------------------
echo "📤 กำลังเพิ่มไฟล์..."
git add -A

echo "📝 กำลัง commit..."
git commit -m "$COMMIT_MSG"

echo "☁️  กำลัง push ไปยัง $REMOTE/$BRANCH..."
git push "$REMOTE" "$BRANCH"

echo ""
echo "✅ Push สำเร็จ!"
echo "   https://github.com/natchapon22105-sys/Smarth-Hospital"