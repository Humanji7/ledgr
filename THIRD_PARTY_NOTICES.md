# Third-Party Notices

Ledgr is built on open source software.

## Included in the app bundle

### `llama-cli` (llama.cpp)

- Project: `ggml-org/llama.cpp`
- License: MIT
- Use: local inference for transaction categorization

If you redistribute Ledgr binaries, ensure you comply with the upstream license terms.

## Not included (user downloads separately)

### GGUF models (example: Qwen2.5 1.5B Instruct GGUF)

- Model provider: Qwen
- The model file is **not** distributed with Ledgr; users download it separately.
- License depends on the model you choose. For Qwen2.5 models, the repository indicates an Apache-2.0 license.

## Dependencies (non-exhaustive)

- Tauri (Rust) and Tauri plugins
- React, Vite, TypeScript
- rusqlite (bundled SQLite)
- Recharts
