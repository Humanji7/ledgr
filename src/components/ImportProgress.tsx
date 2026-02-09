import * as React from "react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/strings";
import { strings } from "@/lib/strings";
import type { ImportProgressEvent } from "@/types";

type Props = {
  open: boolean;
  title?: string;
  onCancel?: () => void;
  lang?: Language;
  progress?: ImportProgressEvent | null;
};

export function ImportProgress({ open, title, onCancel, lang = "en", progress }: Props) {
  const s = strings[lang];
  const resolvedTitle = title ?? s.importProgressTitle;
  if (!open) return null;

  const stageLabel = (() => {
    const stage = progress?.stage;
    if (!stage) return resolvedTitle;
    switch (stage) {
      case "parsing":
        return s.importStageParsing;
      case "dedup":
        return s.importStageDedup;
      case "categorizing":
        return s.importStageCategorizing;
      case "inserting":
        return s.importStageInserting;
      case "done":
        return s.importStageDone;
      default:
        return stage;
    }
  })();

  const pct = progress?.total ? Math.min(100, Math.round((progress.processed / progress.total) * 100)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          <div className="text-sm font-medium text-slate-900">{stageLabel}</div>
        </div>
        <div className="mt-2 text-sm text-slate-600">
          {s.importProgressBody}
        </div>
        {progress ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
              <div>
                {s.importCounts}: <span className="font-mono tabular-nums">{progress.processed}</span>
                {progress.total ? (
                  <>
                    {" "}
                    / <span className="font-mono tabular-nums">{progress.total}</span>
                  </>
                ) : null}
              </div>
              {pct !== null ? <div className="font-mono tabular-nums text-slate-500">{pct}%</div> : null}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-[width] duration-150"
                style={{ width: pct !== null ? `${pct}%` : "20%" }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span>
                {s.importMetricDuplicates}:{" "}
                <span className="font-mono tabular-nums">{progress.duplicates_skipped}</span>
              </span>
              <span>
                {s.importMetricRules}: <span className="font-mono tabular-nums">{progress.rules_used}</span>
              </span>
              <span>
                {s.importMetricLlm}: <span className="font-mono tabular-nums">{progress.llm_used}</span>
              </span>
            </div>
          </div>
        ) : null}
        {onCancel ? (
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              {lang === "ru" ? "Отмена" : "Cancel"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
