# Ledgr

Offline desktop finance tracker for macOS with local AI categorization.

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **CSV Import** — Chase 3-column and 7-column formats; drag-and-drop or file picker
- **AI Categorization** — local llama.cpp inference (GGUF models), no cloud calls
- **Learned Rules** — manually re-categorize once, Ledgr remembers the pattern
- **Budget Tracking** — set monthly limits per category with progress bars
- **Dashboard** — spending charts, filters by date/category/search
- **Export** — filtered transactions to CSV
- **Multi-language** — English and Russian

![Transactions](docs/screenshots/transactions.png)

![Settings](docs/screenshots/settings.png)

## Quick Start

### Prerequisites

- macOS (Apple Silicon or Intel)
- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) LTS
- [pnpm](https://pnpm.io/) 9+

### Build & Run

```bash
git clone https://github.com/Humanji7/ledgr.git
cd ledgr
pnpm install
```

AI categorization requires [llama.cpp](https://github.com/ggml-org/llama.cpp) sidecar binaries.
Download or build them and place into:

```
src-tauri/binaries/llama-cli-aarch64-apple-darwin
src-tauri/binaries/lib*.dylib
src-tauri/resources/llama/lib*.dylib
```

Then run:

```bash
pnpm tauri:dev
```

Ledgr works without the model — CSV import, budgets, and rules function fully offline.
The AI binary is only needed for automatic transaction categorization.

### Build DMG (Apple Silicon)

```bash
pnpm tauri:build
# Output: src-tauri/target/release/bundle/dmg/Ledgr_*.dmg
```

### Build DMG (Intel Mac)

```bash
bash scripts/build_intel.sh
# Output: src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/Ledgr_*.dmg
```

The Intel build uses stub binaries for llama.cpp — CSV import, budgets, and rules work fully, but AI categorization is not available on Intel Macs.

### Run Tests

```bash
pnpm test                            # frontend (Vitest)
pnpm build && cd src-tauri && cargo test  # backend (Rust, needs frontend build first)
```

## Privacy

Ledgr makes **zero network calls**. All data stays in a local SQLite database. AI inference runs entirely on-device via llama.cpp.

Verify yourself:

```bash
# While Ledgr is running
lsof -i -P | grep -i ledgr
# Expected: no output (no open network connections)
```

## Limitations

- **Chase CSV only** — other bank formats are not yet supported
- **macOS only** — no Windows/Linux builds
- **AI requires Apple Silicon** — Intel Macs can use all features except AI categorization
- **Not code-signed** — macOS Gatekeeper will warn on first launch; right-click → Open to bypass
- **Model not included** — download a GGUF model separately (e.g. Qwen2.5 1.5B Instruct)

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Shell    | Tauri 2.0 (Rust)                  |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Storage  | SQLite (rusqlite, bundled)        |
| AI       | llama.cpp (sidecar binary)        |
| Charts   | Recharts                          |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
