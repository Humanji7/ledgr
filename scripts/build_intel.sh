#!/usr/bin/env bash
set -euo pipefail

# Builds Ledgr DMG for Intel Mac (x86_64-apple-darwin).
# AI categorization uses stub binaries — won't run on Intel.
# Everything else works: CSV import, budgets, rules, dashboard.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET="x86_64-apple-darwin"

# Ensure Rust target is installed
if ! rustup target list --installed | grep -q "$TARGET"; then
  echo "== Adding Rust target: $TARGET =="
  rustup target add "$TARGET"
fi

# Create stub binaries if missing
if [[ ! -f "src-tauri/binaries/llama-cli-$TARGET" ]]; then
  echo "== Creating x86_64 stub binaries =="
  bash scripts/setup_x86_64_stubs.sh
else
  echo "== x86_64 stub binaries already exist, skipping =="
fi

echo "== Installing dependencies =="
pnpm -s install

echo "== Building for $TARGET =="
pnpm tauri build --target "$TARGET"

DMG_PATH="$(ls -1 "src-tauri/target/$TARGET/release/bundle/dmg/"*.dmg 2>/dev/null | head -n 1)"
if [[ -z "${DMG_PATH:-}" ]]; then
  echo "ERROR: DMG not found"
  exit 1
fi

echo ""
echo "== Intel DMG ready =="
echo "  $DMG_PATH"
echo "  SHA256: $(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
