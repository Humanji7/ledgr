# Model Setup Wizard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-button model setup card with a guided 4-step wizard that explains AI categorization, links to the model download, and walks users through file selection.

**Architecture:** New ModelSetupWizard React component with step state machine (welcome → download → select → done). Two new Rust commands for wizard_completed persistence. Shell plugin capability added for opening URLs in system browser.

**Tech Stack:** React + TypeScript (frontend), Rust/Tauri 2 (backend), Tailwind CSS (styling), tauri-plugin-shell (URL opening), tauri-plugin-dialog (file picker)

**Design doc:** `docs/plans/2025-02-14-model-setup-wizard-design.md`

---

### Task 1: Add shell:allow-open capability

**Files:**
- Modify: `src-tauri/capabilities/default.json`

**Step 1: Add the permission**

In `src-tauri/capabilities/default.json`, add `"shell:allow-open"` to the permissions array:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Ledgr",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-spawn",
    "shell:allow-open",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-confirm"
  ]
}
```

Note: also adding `dialog:allow-confirm` since the app uses `confirm()` from dialog plugin (see App.tsx:243).

**Step 2: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "feat: add shell:allow-open and dialog:allow-confirm capabilities"
```

---

### Task 2: Add Rust commands for wizard_completed

**Files:**
- Modify: `src-tauri/src/commands.rs` (add 2 commands)
- Modify: `src-tauri/src/main.rs` (register commands)

**Step 1: Add commands to commands.rs**

After the `reset_data` command (line 66), add:

```rust
#[tauri::command]
pub async fn is_wizard_completed(app: tauri::AppHandle) -> Result<bool, String> {
    let raw = crate::db::get_setting(&app, "wizard_completed")?.unwrap_or_default();
    Ok(raw == "true")
}

#[tauri::command]
pub async fn set_wizard_completed(app: tauri::AppHandle) -> Result<(), String> {
    crate::db::set_setting(&app, "wizard_completed", "true")
}
```

**Step 2: Register in main.rs**

Add both commands to the `invoke_handler` macro in `main.rs`:

```rust
commands::is_wizard_completed,
commands::set_wizard_completed,
```

**Step 3: Verify it compiles**

Run: `cd src-tauri && cargo check`
Expected: compiles without errors.

**Step 4: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/main.rs
git commit -m "feat: add is_wizard_completed/set_wizard_completed commands"
```

---

### Task 3: Add TypeScript bridge functions

**Files:**
- Modify: `src/lib/tauri.ts`

**Step 1: Add bridge functions**

After `deleteCustomRule` function (end of file), add:

```typescript
export async function isWizardCompleted(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("is_wizard_completed");
}

export async function setWizardCompleted(): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_wizard_completed");
}
```

Note: mock returns `false` so the wizard shows in browser preview mode.

**Step 2: Commit**

```bash
git add src/lib/tauri.ts
git commit -m "feat: add isWizardCompleted/setWizardCompleted bridge functions"
```

---

### Task 4: Add i18n strings for wizard

**Files:**
- Modify: `src/lib/strings.ts`

**Step 1: Add EN strings**

In the `en` object, after `disabledLabel: "Disabled"` (line 168), add:

```typescript
wizardWelcomeTitle: "AI Categorization Setup",
wizardWelcomeBody: "Ledgr can automatically categorize your transactions using AI. For this, you need a small model file (~1 GB) that runs entirely on your computer. Your data never leaves your device.",
wizardDownloadTitle: "Download the Model",
wizardDownloadBody: "Click the button below to open the download page. The file is about 1 GB — download may take a few minutes.",
wizardDownloadHint: "After downloading, come back here and click \"Next\".",
wizardSelectTitle: "Select the Model File",
wizardSelectBody: "Click the button below and choose the .gguf file you just downloaded.",
wizardDoneTitle: "All Set!",
wizardDoneBody: "The model is configured. Ledgr will now automatically categorize your transactions using AI.",
wizardSkippedTitle: "Setup Complete",
wizardSkippedBody: "You can use Ledgr without a model — transactions will be categorized by rules only. You can add a model later in Settings.",
wizardSkip: "Skip for now",
wizardBack: "Back",
wizardNext: "Next",
wizardStart: "Start using Ledgr",
wizardOpenLink: "Open Download Page",
wizardDownloaded: "I've downloaded it",
wizardSelectFile: "Select .gguf File",
wizardStep: "Step"
```

**Step 2: Add RU strings**

In the `ru` object, after `disabledLabel: "Выключено"` (line 263), add:

```typescript
wizardWelcomeTitle: "Настройка AI-категоризации",
wizardWelcomeBody: "Ledgr может автоматически распознавать ваши траты с помощью AI. Для этого нужен файл модели (~1 ГБ), который будет работать полностью на вашем компьютере. Ваши данные никуда не отправляются.",
wizardDownloadTitle: "Скачайте модель",
wizardDownloadBody: "Нажмите кнопку ниже, чтобы открыть страницу скачивания. Файл весит около 1 ГБ — скачивание может занять несколько минут.",
wizardDownloadHint: "После скачивания вернитесь сюда и нажмите «Далее».",
wizardSelectTitle: "Выберите файл модели",
wizardSelectBody: "Нажмите кнопку ниже и выберите скачанный файл .gguf.",
wizardDoneTitle: "Готово!",
wizardDoneBody: "Модель настроена. Теперь Ledgr будет автоматически категоризировать ваши транзакции с помощью AI.",
wizardSkippedTitle: "Настройка завершена",
wizardSkippedBody: "Вы можете использовать Ledgr без модели — транзакции будут категоризированы только по правилам. Добавить модель можно позже в настройках.",
wizardSkip: "Пропустить",
wizardBack: "Назад",
wizardNext: "Далее",
wizardStart: "Начать работу",
wizardOpenLink: "Открыть страницу скачивания",
wizardDownloaded: "Я скачал",
wizardSelectFile: "Выбрать файл .gguf",
wizardStep: "Шаг"
```

**Step 3: Commit**

```bash
git add src/lib/strings.ts
git commit -m "feat: add EN/RU wizard strings for model setup"
```

---

### Task 5: Create ModelSetupWizard component

**Files:**
- Rewrite: `src/components/ModelSetup.tsx` → `ModelSetupWizard.tsx` (rename and rewrite)

**Step 1: Rename the file**

```bash
mv src/components/ModelSetup.tsx src/components/ModelSetupWizard.tsx
```

**Step 2: Write the new component**

Replace contents of `src/components/ModelSetupWizard.tsx` with:

```tsx
import * as React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setModelPath, setWizardCompleted } from "@/lib/tauri";
import type { Language } from "@/lib/strings";
import { strings } from "@/lib/strings";

const MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/blob/main/qwen2.5-1.5b-instruct-q4_k_m.gguf";

type Step = "welcome" | "download" | "select" | "done" | "skipped";

const STEPS: Step[] = ["welcome", "download", "select", "done"];

type Props = {
  onComplete: () => void;
  lang: Language;
};

function StepIndicator({ current, lang }: { current: Step; lang: Language }) {
  const s = strings[lang];
  const stepIndex = STEPS.indexOf(current === "skipped" ? "done" : current);

  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i <= stepIndex
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </div>
          {i < STEPS.length - 1 ? (
            <div
              className={`h-0.5 w-8 ${
                i < stepIndex ? "bg-slate-900" : "bg-slate-200"
              }`}
            />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function ModelSetupWizard({ onComplete, lang }: Props) {
  const s = strings[lang];
  const [step, setStep] = React.useState<Step>("welcome");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const finish = React.useCallback(async () => {
    try {
      await setWizardCompleted();
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [onComplete]);

  const skip = React.useCallback(async () => {
    setStep("skipped");
    try {
      await setWizardCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const openDownloadPage = React.useCallback(async () => {
    try {
      await openUrl(MODEL_URL);
    } catch {
      // Fallback: if shell.open fails, user can copy URL manually
    }
  }, []);

  const pickModel = React.useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "GGUF model", extensions: ["gguf"] }],
      });
      if (!selected || Array.isArray(selected)) {
        setBusy(false);
        return;
      }
      await setModelPath(selected);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="mx-auto mt-12 w-full max-w-2xl px-6">
      <StepIndicator current={step} lang={lang} />
      <Card>
        {step === "welcome" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardWelcomeTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm leading-relaxed text-slate-700">
                {s.wizardWelcomeBody}
              </p>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={skip}
                >
                  {s.wizardSkip}
                </Button>
                <Button type="button" onClick={() => setStep("download")}>
                  {s.wizardNext}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "download" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardDownloadTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-relaxed text-slate-700">
                {s.wizardDownloadBody}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mb-3"
                onClick={openDownloadPage}
              >
                {s.wizardOpenLink}
              </Button>
              <p className="mb-6 text-xs text-slate-500">
                {s.wizardDownloadHint}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("welcome")}
                  >
                    {s.wizardBack}
                  </Button>
                  <Button type="button" variant="ghost" onClick={skip}>
                    {s.wizardSkip}
                  </Button>
                </div>
                <Button type="button" onClick={() => setStep("select")}>
                  {s.wizardDownloaded}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "select" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardSelectTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-relaxed text-slate-700">
                {s.wizardSelectBody}
              </p>
              <Button
                type="button"
                className="mb-4"
                onClick={pickModel}
                disabled={busy}
              >
                {busy ? s.selecting : s.wizardSelectFile}
              </Button>
              {error ? (
                <p className="mb-4 text-sm text-red-600">{error}</p>
              ) : null}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("download")}
                  >
                    {s.wizardBack}
                  </Button>
                  <Button type="button" variant="ghost" onClick={skip}>
                    {s.wizardSkip}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "done" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardDoneTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm leading-relaxed text-slate-700">
                {s.wizardDoneBody}
              </p>
              <div className="flex justify-end">
                <Button type="button" onClick={finish}>
                  {s.wizardStart}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "skipped" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardSkippedTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm leading-relaxed text-slate-700">
                {s.wizardSkippedBody}
              </p>
              <div className="flex justify-end">
                <Button type="button" onClick={onComplete}>
                  {s.wizardStart}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}
      </Card>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/ModelSetup.tsx src/components/ModelSetupWizard.tsx
git commit -m "feat: create ModelSetupWizard component replacing ModelSetup"
```

---

### Task 6: Integrate wizard into App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update imports**

Replace the unused `ModelSetup` import (if any — currently ModelSetup is not imported in App.tsx, the logic is inline). Add new imports:

At the top imports section, add:

```typescript
import { ModelSetupWizard } from "@/components/ModelSetupWizard";
```

Add `isWizardCompleted` and `setWizardCompleted` to the tauri imports (line 18-33):

```typescript
import {
  checkModelSetup,
  getAutoLearnRules,
  setAutoLearnRules,
  exportCsv,
  getAvailableMonths,
  getBudgetStatus,
  getLanguage,
  getStatsFiltered,
  getTransactionsFiltered,
  importCsv,
  isWizardCompleted,
  resetData,
  setModelPath,
  setLanguage,
  updateCategory
} from "@/lib/tauri";
```

**Step 2: Add wizardDone state**

After `const [modelReady, setModelReady] = React.useState<boolean | null>(null);` (line 45), add:

```typescript
const [wizardDone, setWizardDone] = React.useState<boolean | null>(null);
```

**Step 3: Check wizard status on startup**

In the init useEffect (line 116-139), add `isWizardCompleted()` to the Promise.all:

```typescript
const [ok, savedLang, autoLearn, wizardOk] = await Promise.all([
  checkModelSetup(),
  getLanguage(),
  getAutoLearnRules(),
  isWizardCompleted()
]);
if (cancelled) return;
if (savedLang === "ru" || savedLang === "en") setLang(savedLang);
setAutoLearnRulesEnabled(autoLearn);
setModelReady(ok);
setWizardDone(wizardOk);
```

In the catch block, also set: `setWizardDone(false);`

**Step 4: Add wizard complete handler**

After `onModelComplete` callback, add:

```typescript
const onWizardComplete = React.useCallback(async () => {
  try {
    const ok = await checkModelSetup();
    setModelReady(ok);
    setWizardDone(true);
    await refreshMonths();
    await refresh(filter, debouncedSearch);
  } catch (e) {
    setToast(e instanceof Error ? e.message : String(e));
  }
}, [debouncedSearch, filter, refresh, refreshMonths]);
```

**Step 5: Show wizard when needed**

In the render section, replace the model card block (lines 377-396):

```tsx
{!modelReady ? (
  <div className="mb-6">
    <Card>
      ...
    </Card>
  </div>
) : null}
```

With:

```tsx
{!wizardDone && !modelReady ? (
  <div className="mb-6">
    <ModelSetupWizard onComplete={onWizardComplete} lang={lang} />
  </div>
) : !modelReady ? (
  <div className="mb-6">
    <Card>
      <CardHeader>
        <CardTitle>{s.model}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-slate-700">{s.modelOptionalHint}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={onSelectModel} disabled={busy}>
            {s.selectModel}
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowSettings(true)} disabled={busy}>
            {s.settings}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
) : null}
```

This way:
- If wizard not done AND model not ready → show wizard (first-time user)
- If wizard done but model not ready → show compact card (user skipped wizard, or model file was deleted)
- If model ready → show nothing

**Step 6: Update loading check**

In the loading check (line 316), also wait for wizardDone:

```tsx
if (modelReady === null || wizardDone === null) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-700">
      {s.loading}
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate ModelSetupWizard into App.tsx startup flow"
```

---

### Task 7: Build and verify

**Step 1: Check TypeScript compilation**

Run: `cd /Users/admin/projects/ledgr && pnpm tsc --noEmit`
Expected: no errors.

**Step 2: Check Rust compilation**

Run: `cd /Users/admin/projects/ledgr/src-tauri && cargo check`
Expected: no errors.

**Step 3: Run lint**

Run: `cd /Users/admin/projects/ledgr && pnpm lint`
Expected: no warnings.

**Step 4: Fix any issues found**

If there are lint/type errors, fix them.

**Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve lint/type issues from wizard integration"
```

---

### Task 8: Remove unused ModelSetup.tsx references

**Step 1: Search for old ModelSetup references**

Search for `ModelSetup` across the codebase. The old component was exported from `ModelSetup.tsx` but was NOT imported in App.tsx (the logic was inline). Verify there are no remaining imports of the old component.

**Step 2: Clean up if needed**

Remove any stale references found.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: clean up old ModelSetup references"
```
