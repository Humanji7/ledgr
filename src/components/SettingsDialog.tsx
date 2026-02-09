import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/lib/strings";
import { languageOptions, strings } from "@/lib/strings";

type Props = {
  open: boolean;
  lang: Language;
  modelReady: boolean;
  autoLearnRules: boolean;
  onClose: () => void;
  onChangeLanguage: (lang: Language) => void;
  onSelectModel: () => void;
  onChangeAutoLearnRules: (enabled: boolean) => void;
  disabled?: boolean;
};

export function SettingsDialog({
  open,
  lang,
  modelReady,
  autoLearnRules,
  onClose,
  onChangeLanguage,
  onSelectModel,
  onChangeAutoLearnRules,
  disabled
}: Props) {
  const s = strings[lang];

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{s.settings}</CardTitle>
              <Button type="button" variant="ghost" onClick={onClose}>
                {s.close}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{s.language}</label>
                <select
                  value={lang}
                  onChange={(e) => onChangeLanguage(e.target.value as Language)}
                  disabled={disabled}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{s.model}</label>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <div className="text-slate-700">
                    {modelReady ? s.modelReady : s.modelMissing}
                    {!modelReady ? <span className="ml-2 text-xs text-slate-500">{s.modelOptionalHint}</span> : null}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={onSelectModel} disabled={disabled}>
                    {s.selectModel}
                  </Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">{s.autoLearnRules}</label>
                <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    checked={autoLearnRules}
                    onChange={(e) => onChangeAutoLearnRules(e.target.checked)}
                    disabled={disabled}
                  />
                  <div>
                    <div className="text-sm text-slate-800">{autoLearnRules ? s.enabled : s.disabledLabel}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{s.autoLearnRulesHint}</div>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
