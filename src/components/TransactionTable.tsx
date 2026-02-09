import * as React from "react";
import type { Category, Transaction } from "@/types";
import { VALID_CATEGORIES, categoryColors } from "@/types";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Language } from "@/lib/strings";
import { formatCurrency, getCategoryLabelMap, getCategorySourceLabel, strings } from "@/lib/strings";

type Props = {
  transactions: Transaction[];
  onChangeCategory: (id: string, category: Category) => void;
  disabled?: boolean;
  lang: Language;
};

export function TransactionTable({ transactions, onChangeCategory, disabled, lang }: Props) {
  const s = strings[lang];
  const labels = React.useMemo(() => getCategoryLabelMap(lang), [lang]);

  const ROW_HEIGHT = 48;
  const OVERSCAN = 8;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = React.useState(520);
  const [scrollTop, setScrollTop] = React.useState(0);

  const sorted = React.useMemo(() => {
    return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  React.useEffect(() => {
    setScrollTop(0);
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [sorted.length]);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight || 520);
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalHeight = sorted.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(sorted.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visible = sorted.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        <div>
          {s.tableShowing} <span className="font-semibold tabular-nums text-slate-900">{sorted.length}</span>{" "}
          {s.tableTransactions}
        </div>
        {sorted.length ? (
          <div className="tabular-nums text-slate-500">
            {sorted[sorted.length - 1]?.date} → {sorted[0]?.date}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-[140px_1fr_140px_180px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
        <div>{s.tableDate}</div>
        <div>{s.tableDescription}</div>
        <div className="text-right">{s.tableAmount}</div>
        <div>{s.tableCategory}</div>
      </div>
      <div
        ref={containerRef}
        className="max-h-[520px] overflow-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {sorted.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            {s.tableEmpty}
          </div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visible.map((t) => {
                const sourceLabel = getCategorySourceLabel(lang, t.category_source);
                const reasonTitle = t.category_reason ? `${sourceLabel}: ${t.category_reason}` : sourceLabel;
                return (
                  <div
                    key={t.id}
                    className="grid h-12 grid-cols-[140px_1fr_140px_180px] items-center gap-2 border-b border-slate-100 px-4 text-sm"
                  >
                  <div className="tabular-nums text-slate-700">{t.date}</div>
                  <div className="min-w-0 truncate text-slate-900" title={t.description}>
                    {t.description}
                  </div>
                  <div className={["text-right tabular-nums", t.amount < 0 ? "text-red-600" : "text-emerald-600"].join(" ")}>
                    {formatCurrency(t.amount, lang)}
                  </div>
                  <div className="relative">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label={`${s.tableChange}: ${t.description}`}
                          className="flex w-full flex-col items-start gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-60"
                        >
                          <Badge
                            title={reasonTitle}
                            style={{
                              backgroundColor: `${categoryColors[t.category]}22`,
                              borderColor: `${categoryColors[t.category]}44`,
                              color: categoryColors[t.category]
                            }}
                          >
                            {labels[t.category]}
                          </Badge>
                          <span className="text-[11px] text-slate-500" title={reasonTitle}>
                            {sourceLabel}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {VALID_CATEGORIES.map((cat) => (
                          <DropdownMenuItem key={cat} onSelect={() => onChangeCategory(t.id, cat)}>
                            <span
                              className="mr-2 inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: categoryColors[cat] }}
                            />
                            {labels[cat]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
