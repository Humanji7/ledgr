import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Category, CustomRule } from "@/types";
import { deleteCustomRule, getCustomRules } from "@/lib/tauri";
import type { Language } from "@/lib/strings";
import { getCategoryLabelMap, strings } from "@/lib/strings";

type Props = {
  onUpdated?: () => void;
  lang: Language;
};

export function CustomRulesManager({ onUpdated, lang }: Props) {
  const s = strings[lang];
  const labels = React.useMemo(() => getCategoryLabelMap(lang), [lang]);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rules, setRules] = React.useState<CustomRule[]>([]);

  const load = React.useCallback(async () => {
    const r = await getCustomRules();
    setRules(r);
  }, []);

  React.useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const onDelete = React.useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await deleteCustomRule(id);
        await load();
        onUpdated?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [load, onUpdated]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.learnedRules}</CardTitle>
        <div className="text-sm text-slate-600">{s.learnedRulesHint}</div>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        {rules.length === 0 ? (
          <div className="text-sm text-slate-600">{s.rulesEmpty}</div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_140px_90px_90px] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <div>{s.rulesPattern}</div>
              <div>{s.tableCategory}</div>
              <div className="text-right">{s.rulesUses}</div>
              <div />
            </div>
            {rules.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_140px_90px_90px] items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
              >
                <div className="truncate font-mono text-xs text-slate-700" title={r.pattern}>
                  {r.pattern}
                </div>
                <div className="text-slate-900">{labels[r.category as Category] ?? r.category}</div>
                <div className="text-right tabular-nums text-slate-700">{r.hit_count}</div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onDelete(r.id)}>
                    {s.delete}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
