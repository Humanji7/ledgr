import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/lib/strings";
import { strings } from "@/lib/strings";

type Props = {
  onReset: () => Promise<void> | void;
  lang: Language;
};

export function HelpCard({ onReset, lang }: Props) {
  const s = strings[lang];
  const [open, setOpen] = React.useState(true);

  if (!open) {
    return (
      <div className="mb-6">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {s.showHelp}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{s.helpTitle}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={onReset}
              >
                {s.resetData}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {s.hide}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-slate-700">
            {lang === "ru" ? (
              <div>
                <div className="font-medium text-slate-900">Быстрый старт</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Один раз выберите GGUF‑модель (на экране “Настройка модели”).</li>
                  <li>Импортируйте CSV из банка (поддерживаются форматы Chase).</li>
                  <li>Используйте период/категорию и поиск, чтобы фильтровать данные.</li>
                  <li>Экспорт сохраняет текущий отфильтрованный диапазон.</li>
                </ol>
              </div>
            ) : (
              <div>
                <div className="font-medium text-slate-900">Quick start</div>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Select a GGUF model once (Model Setup).</li>
                  <li>Import a bank CSV (Chase formats supported).</li>
                  <li>Use Month / Date range / Category + Search to slice your data.</li>
                  <li>Export saves the currently filtered range.</li>
                </ol>
              </div>
            )}

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              {lang === "ru" ? (
                <>
                  <div className="font-medium text-slate-900">Почему бывает “Импортировано 0”</div>
                  <div className="mt-1">
                    Ledgr удаляет дубли по хэшу{" "}
                    <span className="font-mono">date + description + amount</span>. Повторный импорт того же CSV
                    ожидаемо даст “Импортировано 0” и много “пропущено дублей”.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium text-slate-900">Why “Imported 0” happens</div>
                  <div className="mt-1">
                    Ledgr de-duplicates imports by a hash of{" "}
                    <span className="font-mono">date + description + amount</span>. Re-importing the same CSV is
                    expected to show <span className="font-mono">Imported 0</span> with many duplicates skipped.
                  </div>
                </>
              )}
            </div>

            <div>
              <div className="font-medium text-slate-900">
                {lang === "ru" ? "Выученные правила" : "Learned rules (training)"}
              </div>
              <div className="mt-1">{s.learnedRulesHint}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
