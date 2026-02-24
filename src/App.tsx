import * as React from "react";
import { confirm, open, save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPieChart } from "@/components/CategoryPieChart";
import { BudgetManager } from "@/components/BudgetManager";
import { BudgetProgress } from "@/components/BudgetProgress";
import { CustomRulesManager } from "@/components/CustomRulesManager";
import { DateFilter } from "@/components/DateFilter";
import { FileDropzone } from "@/components/FileDropzone";
import { HelpCard } from "@/components/HelpCard";
import { ImportProgress } from "@/components/ImportProgress";
import { SearchInput } from "@/components/SearchInput";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StatsCards } from "@/components/StatsCards";
import { TransactionTable } from "@/components/TransactionTable";
import { ModelSetupWizard } from "@/components/ModelSetupWizard";
import {
  checkModelSetup,
  exportCsvText,
  getAutoLearnRules,
  setAutoLearnRules,
  exportCsv,
  getAvailableMonths,
  getBudgetStatus,
  getLanguage,
  getStatsFiltered,
  getTransactionsFiltered,
  importCsv,
  importCsvBrowserFile,
  isTauriRuntime,
  isWizardCompleted,
  resetData,
  setModelPath,
  setLanguage,
  updateCategory
} from "@/lib/tauri";
import { useDebounce } from "@/hooks/useDebounce";
import type { BudgetStatus, Category, ImportProgressEvent, Transaction, TransactionFilter } from "@/types";
import type { Language } from "@/lib/strings";
import { strings, toastExported, toastImported } from "@/lib/strings";

type WebView = "landing" | "demo";

function getWebViewFromHash(): WebView {
  if (typeof window === "undefined") return "landing";
  return window.location.hash === "#/demo" ? "demo" : "landing";
}

export default function App() {
  const searchId = React.useId();
  const webImportInputRef = React.useRef<HTMLInputElement | null>(null);
  const isNativeApp = isTauriRuntime();
  const [webView, setWebView] = React.useState<WebView>(() => (isNativeApp ? "demo" : getWebViewFromHash()));

  const [lang, setLang] = React.useState<Language>("en");
  const s = strings[lang];

  const [modelReady, setModelReady] = React.useState<boolean | null>(null);
  const [wizardDone, setWizardDone] = React.useState<boolean | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [stats, setStats] = React.useState<Awaited<ReturnType<typeof getStatsFiltered>> | null>(null);
  const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);
  const [budgetStatus, setBudgetStatus] = React.useState<BudgetStatus[]>([]);
  const [showBudgets, setShowBudgets] = React.useState(false);
  const [showRules, setShowRules] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [autoLearnRulesEnabled, setAutoLearnRulesEnabled] = React.useState(true);
  const [importProgress, setImportProgress] = React.useState<ImportProgressEvent | null>(null);

  const [filter, setFilter] = React.useState<
    TransactionFilter & { month: string | null }
  >({
    startDate: null,
    endDate: null,
    category: null,
    search: null,
    month: null
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isNativeApp) return;
    const sync = () => setWebView(getWebViewFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [isNativeApp]);

  const refreshMonths = React.useCallback(async () => {
    const months = await getAvailableMonths();
    setAvailableMonths(months);
  }, []);

  const refresh = React.useCallback(
    async (nextFilter: TransactionFilter & { month: string | null }, nextSearch: string) => {
      const startDate = nextFilter.startDate ?? undefined;
      const endDate = nextFilter.endDate ?? undefined;
      const category = nextFilter.category ?? undefined;
      const search = nextSearch.trim() ? nextSearch.trim() : undefined;
      const month =
        nextFilter.month ?? (nextFilter.startDate ? nextFilter.startDate.slice(0, 7) : undefined) ?? new Date().toISOString().slice(0, 7);

      const [txns, s, budgets] = await Promise.all([
        getTransactionsFiltered(startDate, endDate, category, search),
        getStatsFiltered(startDate, endDate, category, search),
        getBudgetStatus(month)
      ]);
      setTransactions(txns);
      setStats(s);
      setBudgetStatus(budgets);
    },
    []
  );

  React.useEffect(() => {
    let unlisten: null | (() => void) = null;
    let mounted = true;
    (async () => {
      try {
        unlisten = await listen<ImportProgressEvent>("ledgr://import-progress", (event) => {
          if (!mounted) return;
          setImportProgress(event.payload);
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
        await refreshMonths();
      } catch (e) {
        if (cancelled) return;
        setModelReady(false);
        setWizardDone(false);
        setToast(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMonths]);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onModelComplete = React.useCallback(async () => {
    try {
      const ok = await checkModelSetup();
      setModelReady(ok);
      await refreshMonths();
      await refresh(filter, debouncedSearch);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }, [debouncedSearch, filter, refresh, refreshMonths]);

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

  React.useEffect(() => {
    if (modelReady === null) return;
    let cancelled = false;
    (async () => {
      try {
        await refresh(filter, debouncedSearch);
      } catch (e) {
        if (!cancelled) setToast(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filter, modelReady, refresh]);

  const doImport = React.useCallback(
    async (source: string | File) => {
      setBusy(true);
      setToast(null);
      setImportProgress(null);
      try {
        const result =
          typeof source === "string"
            ? await importCsv(source)
            : await importCsvBrowserFile(source);
        setToast(
          toastImported(
            lang,
            result.imported,
            result.rules_used,
            result.llm_used,
            result.duplicates_skipped,
            result.errors?.length ?? 0
          )
        );
        await Promise.all([refresh(filter, debouncedSearch), refreshMonths()]);
      } catch (e) {
        setToast(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
        setImportProgress(null);
      }
    },
    [debouncedSearch, filter, refresh, refreshMonths]
  );

  const onImportClick = React.useCallback(async () => {
    try {
      if (!isNativeApp) {
        webImportInputRef.current?.click();
        return;
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: "CSV", extensions: ["csv"] }]
      });
      if (!selected || Array.isArray(selected)) return;
      await doImport(selected);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }, [doImport, isNativeApp]);

  const onChangeCategory = React.useCallback(
    async (id: string, category: Category) => {
      try {
        await updateCategory(id, category);
        await Promise.all([refresh(filter, debouncedSearch), refreshMonths()]);
      } catch (e) {
        setToast(e instanceof Error ? e.message : String(e));
      }
    },
    [debouncedSearch, filter, refresh, refreshMonths]
  );

  const onExportClick = React.useCallback(async () => {
    try {
      if (!isNativeApp) {
        const { text, count } = await exportCsvText(
          filter.startDate ?? undefined,
          filter.endDate ?? undefined
        );
        const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ledgr-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setToast(toastExported(lang, count));
        return;
      }
      const defaultName = `ledgr-export-${new Date().toISOString().slice(0, 10)}.csv`;
      const path = await save({
        filters: [{ name: "CSV", extensions: ["csv"] }],
        defaultPath: defaultName
      });
      if (!path) return;
      const count = await exportCsv(path, filter.startDate ?? undefined, filter.endDate ?? undefined);
      setToast(toastExported(lang, count));
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }, [filter.endDate, filter.startDate, isNativeApp, lang]);

  const onResetData = React.useCallback(async () => {
    try {
      const ok = isNativeApp
        ? await confirm(
            s.resetDataConfirmText,
            { title: s.resetDataConfirmTitle, kind: "warning" }
          )
        : window.confirm(s.resetDataConfirmText);
      if (!ok) return;
      setBusy(true);
      await resetData(true);
      setToast(s.resetDone);
      setTransactions([]);
      setStats({
        total_spending: 0,
        total_income: 0,
        by_category: {
          housing: 0,
          utilities: 0,
          groceries: 0,
          dining: 0,
          transport: 0,
          shopping: 0,
          entertainment: 0,
          health: 0,
          subscriptions: 0,
          transfer: 0,
          income: 0,
          other: 0
        },
        transaction_count: 0
      });
      setBudgetStatus([]);
      await refreshMonths();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [isNativeApp, refreshMonths, s.resetDataConfirmText, s.resetDataConfirmTitle, s.resetDone]);

  const onChangeLanguage = React.useCallback(async (next: Language) => {
    try {
      await setLanguage(next);
      setLang(next);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const onSelectModel = React.useCallback(async () => {
    try {
      if (!isNativeApp) {
        setToast(lang === "ru" ? "Выбор локальной модели доступен в desktop-версии." : "Local model selection is available in the desktop app.");
        return;
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: "GGUF model", extensions: ["gguf"] }]
      });
      if (!selected || Array.isArray(selected)) return;
      await setModelPath(selected);
      await onModelComplete();
      setToast(lang === "ru" ? "Модель выбрана." : "Model selected.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }, [isNativeApp, lang, onModelComplete]);

  const onChangeAutoLearnRules = React.useCallback(
    async (enabled: boolean) => {
      try {
        await setAutoLearnRules(enabled);
        setAutoLearnRulesEnabled(enabled);
      } catch (e) {
        setToast(e instanceof Error ? e.message : String(e));
      }
    },
    []
  );

  if (!isNativeApp && webView === "landing") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0%,_#f8fafc_38%,_#f8fafc_100%)] text-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Ledgr</div>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                Personal finance tracker with local AI categorization
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="#/demo"
                className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                Open Interactive Demo
              </a>
              <a
                href="https://github.com/Humanji7/ledgr/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Desktop Build (Releases)
              </a>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden border-slate-200/80 shadow-lg shadow-slate-200/60">
              <CardHeader className="pb-2">
                <div className="mb-2 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">CSV import/export</span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">Category correction</span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">Budgets & learned rules</span>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-700">Tauri desktop core</span>
                </div>
                <CardTitle className="text-xl">Recruiter-friendly demo entry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-700">
                  This web version simulates the product flow with persistent browser data so you can test the UX immediately.
                  The full product is a Tauri desktop app with native file dialogs and local processing.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Mode</div>
                    <div className="mt-1 text-sm font-semibold">Web Demo + Desktop App</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">State</div>
                    <div className="mt-1 text-sm font-semibold">Saved in browser</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Best test</div>
                    <div className="mt-1 text-sm font-semibold">Import a sample CSV</div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">What to try in 60 seconds</div>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    <li>Open the interactive demo.</li>
                    <li>Import a CSV (or use seeded demo data already loaded).</li>
                    <li>Edit a category and verify it appears in Learned Rules.</li>
                    <li>Adjust a budget and export filtered CSV.</li>
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => { window.location.hash = "/demo"; }}>
                    Open Interactive Demo
                  </Button>
                  <a
                    href="https://github.com/Humanji7/ledgr"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    View Source
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300/40">
                <CardHeader>
                  <CardTitle className="text-white">Why this project matters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-200">
                  <p>
                    Ledgr is a real product workflow, not a static mockup: import, classify, review, budget, and export.
                  </p>
                  <p>
                    The browser demo is intentionally built to feel like production behavior so non-technical reviewers can validate the UX by link.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes for testing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  <p>
                    Web demo stores changes in <code>localStorage</code>. Refresh to verify persistence.
                  </p>
                  <p>
                    Desktop-only features remain in the Tauri build (native dialogs and local runtime integrations).
                  </p>
                  <p>
                    Direct demo link: <code>#/demo</code>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (modelReady === null || wizardDone === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-700">
        {s.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ImportProgress open={busy} lang={lang} progress={importProgress} />
      <SettingsDialog
        open={showSettings}
        lang={lang}
        modelReady={modelReady}
        autoLearnRules={autoLearnRulesEnabled}
        onClose={() => setShowSettings(false)}
        onChangeLanguage={onChangeLanguage}
        onSelectModel={onSelectModel}
        onChangeAutoLearnRules={onChangeAutoLearnRules}
        disabled={busy}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:text-slate-900 focus:shadow"
      >
        {lang === "ru" ? "К содержимому" : "Skip to content"}
      </a>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <input
          ref={webImportInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) {
              void doImport(file);
            }
            e.currentTarget.value = "";
          }}
        />
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Ledgr</h1>
            <p className="text-sm text-slate-600">
              {lang === "ru" ? "Офлайн‑трекер финансов с локальной AI‑категоризацией" : "Offline finance tracker with local AI categorization"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isNativeApp ? (
              <Button type="button" variant="ghost" onClick={() => { window.location.hash = ""; }} disabled={busy}>
                Overview
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setShowSettings(true)} disabled={busy}>
              {s.settings}
            </Button>
            <Button type="button" variant="outline" onClick={onExportClick} disabled={busy}>
              {s.export}
            </Button>
            <Button type="button" onClick={onImportClick} disabled={busy}>
              {s.importCsv}
            </Button>
          </div>
        </header>

        {toast ? (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mb-4 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            {toast}
          </div>
        ) : null}

        {!isNativeApp ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {lang === "ru"
              ? "Web demo mode: данные сохраняются локально в браузере (localStorage). Импорт CSV, фильтры, бюджеты и редактирование категорий работают как интерактивное демо."
              : "Web demo mode: data is stored locally in your browser (localStorage). CSV import, filters, budgets, and category edits work as an interactive demo."}
          </div>
        ) : null}

        <main id="main">
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

          <HelpCard lang={lang} onReset={onResetData} />

          <div className="mb-6">
            <StatsCards lang={lang} stats={stats} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{s.filters}</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, startDate: null, endDate: null, category: null, month: null }));
                      setSearchQuery("");
                    }}
                    disabled={busy}
                  >
                    {s.clear}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DateFilter
                  months={availableMonths}
                  lang={lang}
                  value={{
                    startDate: filter.startDate,
                    endDate: filter.endDate,
                    category: filter.category,
                    month: filter.month
                  }}
                  onChange={(next) =>
                    setFilter((prev) => ({
                      ...prev,
                      startDate: next.startDate,
                      endDate: next.endDate,
                      category: next.category,
                      month: next.month
                    }))
                  }
                />
                <div className="mt-4">
                  <label htmlFor={searchId} className="mb-1 block text-xs font-medium text-slate-600">
                    {s.search}
                  </label>
                  <SearchInput
                    id={searchId}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery("")}
                    placeholder={s.searchPlaceholder}
                    clearLabel={s.clear}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{s.budgets}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowBudgets((v) => !v)}>
                    {showBudgets ? s.hide : s.manage}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BudgetProgress
                  monthLabel={filter.month ?? (filter.startDate ? filter.startDate.slice(0, 7) : new Date().toISOString().slice(0, 7))}
                  lang={lang}
                  status={budgetStatus}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{s.learnedRules}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowRules((v) => !v)}>
                    {showRules ? s.hide : s.view}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-600">{s.learnedRulesHint}</div>
              </CardContent>
            </Card>
          </div>

          {showBudgets ? (
            <div className="mb-6">
              <BudgetManager lang={lang} onUpdated={() => refresh(filter, debouncedSearch)} />
            </div>
          ) : null}

          {showRules ? (
            <div className="mb-6">
              <CustomRulesManager lang={lang} onUpdated={() => refresh(filter, debouncedSearch)} />
            </div>
          ) : null}

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{s.spendingByCategory}</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryPieChart lang={lang} stats={stats} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{s.quickImport}</CardTitle>
              </CardHeader>
              <CardContent>
                <FileDropzone lang={lang} onFileSelected={doImport} disabled={busy} />
              </CardContent>
            </Card>
          </div>

          <TransactionTable lang={lang} transactions={transactions} onChangeCategory={onChangeCategory} disabled={busy} />
        </main>
      </div>
    </div>
  );
}
