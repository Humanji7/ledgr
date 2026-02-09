#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Building Ledgr macOS DMG =="
pnpm -s install
pnpm -s tauri:build

DMG_PATH="$(ls -1 src-tauri/target/release/bundle/dmg/*.dmg | head -n 1)"
if [[ -z "${DMG_PATH:-}" ]]; then
  echo "DMG not found under src-tauri/target/release/bundle/dmg/"
  exit 1
fi

echo "DMG: $DMG_PATH"

SHA256="$(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
FILENAME="$(basename "$DMG_PATH")"

echo
echo "== Vercel env suggestions =="
echo "DMG_SHA256=$SHA256"
echo "DMG_FILENAME=$FILENAME"
echo "DMG_VERSION=0.1.0-alpha"
echo
echo "Next: upload the DMG to Cloudflare R2 and set DMG_URL to the public URL."

