import * as React from "react";
import type { Category } from "@/types";
import { VALID_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/strings";
import { formatMonthLabel, getCategoryLabelMap, strings } from "@/lib/strings";

type Preset = { kind: "all" } | { kind: "month"; value: string } | { kind: "custom" };

type FilterChange = {
  startDate: string | null;
  endDate: string | null;
  category: Category | null;
  month: string | null;
};

type Props = {
  months: string[]; // ["2026-01", ...]
  value: FilterChange;
  onChange: (next: FilterChange) => void;
  lang: Language;
};

function formatForInput(yyyyMmDd: string | null) {
  if (!yyyyMmDd) return "";
  const [y, m, d] = yyyyMmDd.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}`;
}

function isValidYmd(y: number, m: number, d: number) {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function normalizeDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // Accept a wide range of separators (., /, -, spaces, locale variants).
  const parts = s.match(/\d+/g);
  if (!parts || parts.length !== 3) return null;

  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;

  // YYYY-MM-DD
  if (parts[0]?.length === 4) {
    y = Number(parts[0]);
    m = Number(parts[1]);
    d = Number(parts[2]);
  } else if (parts[2]?.length === 4) {
    // DD.MM.YYYY
    d = Number(parts[0]);
    m = Number(parts[1]);
    y = Number(parts[2]);
  }

  if (y === null || m === null || d === null) return null;
  if (!isValidYmd(y, m, d)) return null;

  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return null;
}

function startEndForMonth(yyyyMm: string) {
  const [yRaw, mRaw] = yyyyMm.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  const start = `${yRaw}-${mRaw}-01`;
  const lastDay = new Date(y, m, 0).getDate(); // month is 1-based here, Date expects next month index
  const end = `${yRaw}-${mRaw}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function DateFilter({ months, value, onChange, lang }: Props) {
  const s = strings[lang];
  const labels = React.useMemo(() => getCategoryLabelMap(lang), [lang]);

  const periodId = React.useId();
  const categoryId = React.useId();
  const fromId = React.useId();
  const toId = React.useId();

  const fromRef = React.useRef<HTMLInputElement | null>(null);
  const toRef = React.useRef<HTMLInputElement | null>(null);

  const [draftFrom, setDraftFrom] = React.useState(() => formatForInput(value.startDate));
  const [draftTo, setDraftTo] = React.useState(() => formatForInput(value.endDate));
  const [error, setError] = React.useState<string | null>(null);

  const preset: Preset = React.useMemo(() => {
    if (value.month) return { kind: "month", value: value.month };
    if (value.startDate || value.endDate) return { kind: "custom" };
    return { kind: "all" };
  }, [value.endDate, value.month, value.startDate]);

  React.useEffect(() => {
    const active = document.activeElement;
    if (active === fromRef.current || active === toRef.current) return;
    setDraftFrom(formatForInput(value.startDate));
    setDraftTo(formatForInput(value.endDate));
    setError(null);
  }, [value.endDate, value.startDate, value.month]);

  const presetValue = preset.kind === "month" ? `month:${preset.value}` : preset.kind;

  const onPresetChange = React.useCallback(
    (next: string) => {
      if (next === "all") {
        setError(null);
        onChange({ startDate: null, endDate: null, category: value.category, month: null });
        return;
      }
      if (next === "custom") {
        setError(null);
        onChange({ startDate: value.startDate, endDate: value.endDate, category: value.category, month: null });
        return;
      }
      if (next.startsWith("month:")) {
        const m = next.slice("month:".length);
        const { start, end } = startEndForMonth(m);
        setError(null);
        onChange({ startDate: start, endDate: end, category: value.category, month: m });
      }
    },
    [onChange, value.category, value.endDate, value.startDate]
  );

  const onCategoryChange = React.useCallback(
    (next: string) => {
      onChange({
        startDate: value.startDate,
        endDate: value.endDate,
        category: next === "all" ? null : (next as Category),
        month: value.month
      });
    },
    [onChange, value.endDate, value.month, value.startDate]
  );

  const applyCustomRange = React.useCallback(() => {
    const start = normalizeDate(draftFrom);
    const end = normalizeDate(draftTo);

    if (draftFrom.trim() && !start) {
      setError(s.invalidFrom);
      return;
    }
    if (draftTo.trim() && !end) {
      setError(s.invalidTo);
      return;
    }
    if (start && end && start > end) {
      setError(s.invalidRange);
      return;
    }

    setError(null);
    onChange({
      startDate: start,
      endDate: end,
      category: value.category,
      month: null
    });
  }, [draftFrom, draftTo, onChange, value.category]);

  const tryApplyOnBlur = React.useCallback(() => {
    const start = normalizeDate(draftFrom);
    const end = normalizeDate(draftTo);
    if (draftFrom.trim() && !start) return;
    if (draftTo.trim() && !end) return;
    applyCustomRange();
  }, [applyCustomRange, draftFrom, draftTo]);

  const isDirty = React.useMemo(() => {
    const start = normalizeDate(draftFrom);
    const end = normalizeDate(draftTo);
    return start !== value.startDate || end !== value.endDate || value.month !== null;
  }, [draftFrom, draftTo, value.endDate, value.month, value.startDate]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_220px_1fr_1fr]">
      <div>
        <label htmlFor={periodId} className="mb-1 block text-xs font-medium text-slate-600">
          {s.filtersPeriod}
        </label>
        <select
          id={periodId}
          name="period"
          value={presetValue}
          onChange={(e) => onPresetChange(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="all">{s.allTime}</option>
          {months.map((m) => (
            <option key={m} value={`month:${m}`}>
              {formatMonthLabel(m, lang)}
            </option>
          ))}
          <option value="custom">{s.customRange}</option>
        </select>
      </div>

      <div>
        <label htmlFor={categoryId} className="mb-1 block text-xs font-medium text-slate-600">
          {s.filtersCategory}
        </label>
        <select
          id={categoryId}
          name="category"
          value={value.category ?? "all"}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="all">{s.allCategories}</option>
          {VALID_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {labels[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={fromId} className="mb-1 block text-xs font-medium text-slate-600">
          {s.filtersFrom}
        </label>
        <input
          ref={fromRef}
          type="text"
          id={fromId}
          name="from"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD.MM.YYYY"
          value={draftFrom}
          onChange={(e) => setDraftFrom(e.target.value)}
          onBlur={tryApplyOnBlur}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            applyCustomRange();
          }}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div>
        <label htmlFor={toId} className="mb-1 block text-xs font-medium text-slate-600">
          {s.filtersTo}
        </label>
        <input
          ref={toRef}
          type="text"
          id={toId}
          name="to"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD.MM.YYYY"
          value={draftTo}
          onChange={(e) => setDraftTo(e.target.value)}
          onBlur={tryApplyOnBlur}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            applyCustomRange();
          }}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-4">
        <div className="text-xs text-slate-500">
          {value.startDate || value.endDate ? (
            <>
              {s.applied}: <span className="font-mono">{value.startDate ?? "…"}</span> →{" "}
              <span className="font-mono">{value.endDate ?? "…"}</span>
            </>
          ) : (
            s.appliedAllTime
          )}
        </div>
        <div className="flex items-center gap-2">
          {error ? <div className="text-xs text-red-600">{error}</div> : null}
          <Button type="button" variant="outline" size="sm" onClick={applyCustomRange}>
            {s.applyDates}
          </Button>
        </div>
      </div>
    </div>
  );
}
