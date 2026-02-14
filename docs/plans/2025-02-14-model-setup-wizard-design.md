# Model Setup Wizard — Design Document

**Date**: 2025-02-14
**Status**: Approved

## Problem

Users must manually find, download, and select a .gguf model file. Terms like "GGUF", "quantization", "model" are barriers for non-technical users.

## Solution

Replace the current single-button ModelSetup card with a guided multi-step wizard that explains what a model is, links to the recommended download, and walks users through file selection.

## Constraints

- **Zero network calls** — the app stays fully offline. User downloads the model in their browser.
- **Model is optional** — wizard can be skipped; app works in rules-only mode.
- **Bilingual** — EN/RU strings via existing strings.ts system.

## Wizard Flow

```
welcome → download → select → done
            ↘  skip  ←↗
```

### Step 1: Welcome
- Title: "AI Categorization Setup"
- Body: Simple explanation — "Ledgr can automatically categorize your transactions using AI. For this, you need a small model file (~1 GB) that runs entirely on your computer. Your data never leaves your device."
- Actions: Next, Skip

### Step 2: Download
- Title: "Download the Model"
- Body: "Click the link below to download the recommended model. The file is about 1 GB — download may take a few minutes."
- Link: opens in system browser via Tauri shell.open()
- Recommended model: `qwen2.5-1.5b-instruct-q4_k_m.gguf` from HuggingFace
- Actions: Back, Next (I've downloaded it), Skip

### Step 3: Select File
- Title: "Select the Model File"
- Body: "Click the button below to select the .gguf file you just downloaded."
- File picker filtered to *.gguf
- Actions: Back, Skip

### Step 4: Done
- Title: "All Set!"
- Body: "Model is configured. Ledgr will now automatically categorize your transactions."
- Actions: Start using Ledgr

## Architecture

### New Component: ModelSetupWizard.tsx
- Replaces current ModelSetup.tsx
- Internal state: `step: 'welcome' | 'download' | 'select' | 'done'`
- Props: `onComplete: () => void`, `onSkip: () => void`, `lang: Language`
- Stepper indicator at top (4 dots/numbers)
- Card-based layout, max-w-2xl centered

### Backend Changes
- New Rust command: `set_wizard_completed()` → saves "wizard_completed" = "true" in settings
- New Rust command: `is_wizard_completed()` → reads "wizard_completed" from settings
- Bridge functions in tauri.ts

### App.tsx Integration
- On startup: check `is_wizard_completed()`
- If false → show ModelSetupWizard instead of model card
- On wizard complete (model selected or skipped) → set wizard_completed, hide wizard
- Existing model re-selection in Settings dialog stays unchanged

### Strings (strings.ts)
New keys for both EN and RU:
- wizardWelcomeTitle, wizardWelcomeBody
- wizardDownloadTitle, wizardDownloadBody, wizardDownloadLink
- wizardSelectTitle, wizardSelectBody
- wizardDoneTitle, wizardDoneBody
- wizardSkip, wizardBack, wizardNext, wizardStart, wizardOpenLink

## Non-Goals
- Auto-downloading model from within the app
- Model validation (GGUF magic bytes check)
- Multiple model options / model picker
