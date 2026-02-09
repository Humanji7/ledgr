import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Budget, Category } from "@/types";
import { VALID_CATEGORIES } from "@/types";
import { deleteBudget, getBudgets, setBudget } from "@/lib/tauri";
import type { Language } from "@/lib/strings";
import { getCategoryLabelMap, strings } from "@/lib/strings";

type Props = {
  onUpdated: () => void;
  lang: Language;
};

function isExpenseCategory(c: Category) {
  return c !== "income" && c !== "transfer";
}

export function BudgetManager({ onUpdated, lang }: Props) {
  const s = strings[lang];
  const labels = React.useMemo(() => getCategoryLabelMap(lang), [lang]);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [draft, setDraft] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    const b = await getBudgets();
    setBudgets(b);
    const nextDraft: Record<string, string> = {};
    for (const item of b) {
      nextDraft[item.category] = String(item.monthly_limit);
    }
    setDraft(nextDraft);
  }, []);

  React.useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const expenseCategories = React.useMemo(() => {
    return VALID_CATEGORIES.filter(isExpenseCategory);
  }, []);

  const onSaveAll = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const ops: Promise<void>[] = [];
      for (const cat of expenseCategories) {
        const raw = (draft[cat] ?? "").trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
          throw new Error(`${labels[cat]}: "${raw}"`);
        }
        ops.push(setBudget(cat, value));
      }
      await Promise.all(ops);
      await load();
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [draft, expenseCategories, load, onUpdated]);

  const onDelete = React.useCallback(
    async (category: string) => {
      setBusy(true);
      setError(null);
      try {
        await deleteBudget(category);
        await load();
        onUpdated();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [load, onUpdated]
  );

  const budgetSet = React.useMemo(() => new Set(budgets.map((b) => b.category)), [budgets]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{s.budgets}</CardTitle>
          <Button type="button" onClick={onSaveAll} disabled={busy}>
            {s.saveAll}
          </Button>
        </div>
        <div className="text-sm text-slate-600">{s.budgetsHint}</div>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        <div className="space-y-2">
          {expenseCategories.map((cat) => (
            <div key={cat} className="grid grid-cols-[1fr_160px_90px] items-center gap-2">
              <label htmlFor={`budget-${cat}`} className="text-sm text-slate-900">
                {labels[cat]}
              </label>
              <input
                id={`budget-${cat}`}
                name={`budget-${cat}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={draft[cat] ?? ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, [cat]: e.target.value }))}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !budgetSet.has(cat)}
                onClick={() => onDelete(cat)}
              >
                {s.delete}
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-slate-500">
          {s.budgetsTip}
        </div>
      </CardContent>
    </Card>
  );
}
