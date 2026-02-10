#!/usr/bin/env bash
set -euo pipefail

# Creates x86_64 stub binaries for Intel Mac builds.
# llama-cli stub exits with error + message; dylib stubs are minimal shared libraries.
# These allow Tauri to bundle the app for x86_64-apple-darwin.
# AI categorization won't work on Intel — everything else (CSV, budgets, rules) works fine.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/src-tauri/binaries"
TMPDIR_STUBS="$(mktemp -d)"
TARGET="x86_64-apple-darwin"
MIN_MACOS="-target x86_64-apple-macos11"

trap 'rm -rf "$TMPDIR_STUBS"' EXIT

DYLIBS=(
  "libggml-base.0.dylib"
  "libggml-blas.0.dylib"
  "libggml-cpu.0.dylib"
  "libggml-metal.0.dylib"
  "libggml-rpc.0.dylib"
  "libggml.0.dylib"
  "libllama.0.dylib"
  "libmtmd.0.dylib"
)

echo "== Creating x86_64 stub binaries =="

# --- llama-cli stub ---
STUB_CLI="$BIN_DIR/llama-cli-$TARGET"
cat > "$TMPDIR_STUBS/stub_cli.c" << 'CEOF'
#include <stdio.h>
int main(void) {
    fprintf(stderr, "llama-cli: not available on Intel Mac (x86_64 stub)\n");
    return 1;
}
CEOF
clang $MIN_MACOS -o "$STUB_CLI" "$TMPDIR_STUBS/stub_cli.c"
chmod +x "$STUB_CLI"
echo "  Created: llama-cli-$TARGET"

# --- dylib stubs ---
cat > "$TMPDIR_STUBS/stub_lib.c" << 'CEOF'
// Empty stub library for x86_64 Intel Mac builds
void __stub_placeholder(void) {}
CEOF

for dylib in "${DYLIBS[@]}"; do
  OUT="$BIN_DIR/${dylib}-$TARGET"
  clang $MIN_MACOS -shared -o "$OUT" "$TMPDIR_STUBS/stub_lib.c"
  echo "  Created: ${dylib}-$TARGET"
done

echo ""
echo "== Done. Verify with: =="
echo "  file $BIN_DIR/llama-cli-$TARGET"
