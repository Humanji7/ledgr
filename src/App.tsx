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
  resetData,
  setModelPath,
  setLanguage,
  updateCategory
} from "@/lib/tauri";
import { useDebounce } from "@/hooks/useDebounce";
import type { BudgetStatus, Category, ImportProgressEvent, Transaction, TransactionFilter } from "@/types";
import type { Language } from "@/lib/strings";
import { strings, toastExported, toastImported } from "@/lib/strings";

export default function App() {
  const searchId = React.useId();

  const [lang, setLang] = React.useState<Language>("en");
  const s = strings[lang];

  const [modelReady, setModelReady] = React.useState<boolean | null>(null);
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
        const [ok, savedLang, autoLearn] = await Promise.all([
          checkModelSetup(),
          getLanguage(),
          getAutoLearnRules()
        ]);
        if (cancelled) return;
        if (savedLang === "ru" || savedLang === "en") setLang(savedLang);
        setAutoLearnRulesEnabled(autoLearn);
        setModelReady(ok);
        await refreshMonths();
      } catch (e) {
        if (cancelled) return;
        setModelReady(false);
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
    async (path: string) => {
      setBusy(true);
      setToast(null);
      setImportProgress(null);
      try {
        const result = await importCsv(path);
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
    const selected = await open({
      multiple: false,
      filters: [{ name: "CSV", extensions: ["csv"] }]
    });
    if (!selected || Array.isArray(selected)) return;
    await doImport(selected);
  }, [doImport]);

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
  }, [filter.endDate, filter.startDate, lang]);

  const onResetData = React.useCallback(async () => {
    try {
      const ok = await confirm(
        s.resetDataConfirmText,
        { title: s.resetDataConfirmTitle, kind: "warning" }
      );
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
  }, [refreshMonths, s.resetDataConfirmText, s.resetDataConfirmTitle, s.resetDone]);

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
  }, [lang, onModelComplete]);

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

  if (modelReady === null) {
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
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Ledgr</h1>
            <p className="text-sm text-slate-600">
              {lang === "ru" ? "Офлайн‑трекер финансов с локальной AI‑категоризацией" : "Offline finance tracker with local AI categorization"}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        <main id="main">
          {!modelReady ? (
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
