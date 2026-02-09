# Contributing to Ledgr

Thank you for your interest in contributing!

## Prerequisites

- macOS (Apple Silicon)
- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) LTS
- [pnpm](https://pnpm.io/) 9+

## Setup

```bash
git clone https://github.com/humanji7/ledgr.git
cd ledgr
pnpm install
```

## Development

```bash
# Run in dev mode (hot reload)
pnpm tauri:dev

# Run frontend tests
pnpm test

# Run Rust tests
cd src-tauri && cargo test

# Build DMG
pnpm tauri:build
```

## Pull Request Flow

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `pnpm test` and `cargo test` — all tests must pass
4. Open a PR against `main`
5. Describe **what** changed and **why**

## Code Style

- Frontend: TypeScript, React, Tailwind CSS
- Backend: Rust (standard `cargo fmt` / `cargo clippy`)
- Keep files under 500 lines

## Reporting Bugs

Use the [bug report template](https://github.com/humanji7/ledgr/issues/new?template=bug_report.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
