import * as React from "react";
import type { BudgetStatus, Category } from "@/types";
import type { Language } from "@/lib/strings";
import { formatCurrency, formatMonthLabel, getCategoryLabelMap, strings } from "@/lib/strings";

type Props = {
  monthLabel: string;
  status: BudgetStatus[];
  lang: Language;
};

function barColor(percentUsed: number) {
  if (percentUsed >= 100) return "bg-red-500";
  if (percentUsed >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export function BudgetProgress({ monthLabel, status, lang }: Props) {
  const s = strings[lang];
  const labels = React.useMemo(() => getCategoryLabelMap(lang), [lang]);

  const sorted = React.useMemo(() => {
    return [...status].sort((a, b) => a.category.localeCompare(b.category));
  }, [status]);

  if (sorted.length === 0) {
    return <div className="text-sm text-slate-600">{s.budgetsEmpty}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-slate-600">
        {s.budgetsStatusFor} {formatMonthLabel(monthLabel, lang)}
      </div>
      {sorted.map((b) => {
        const percent = Number.isFinite(b.percent_used) ? Math.max(0, b.percent_used) : 0;
        const width = Math.min(100, percent);
        return (
          <div key={b.category} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">
                {labels[b.category as Category] ?? b.category}
              </div>
              <div className="text-xs tabular-nums text-slate-600">
                {formatCurrency(b.spent, lang)} / {formatCurrency(b.monthly_limit, lang)} ({percent.toFixed(0)}%)
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${barColor(percent)}`} style={{ width: `${width}%` }} />
            </div>
            <div className="mt-1 text-xs tabular-nums text-slate-500">
              {s.remaining}: {formatCurrency(b.remaining, lang)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
