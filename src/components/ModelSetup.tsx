import * as React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setModelPath } from "@/lib/tauri";
import type { Language } from "@/lib/strings";
import { strings } from "@/lib/strings";

type Props = {
  onComplete: () => void;
  lang: Language;
};

export function ModelSetup({ onComplete, lang }: Props) {
  const s = strings[lang];
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const pickModel = React.useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "GGUF model", extensions: ["gguf"] }]
      });

      if (!selected || Array.isArray(selected)) return;
      await setModelPath(selected);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [onComplete]);

  return (
    <div className="mx-auto mt-16 w-full max-w-2xl px-6">
      <Card>
        <CardHeader>
          <CardTitle>{s.modelSetupTitle}</CardTitle>
          <div className="text-sm text-slate-600">{s.modelSetupBody}</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={pickModel} disabled={busy}>
              {busy ? s.selecting : s.selectModel}
            </Button>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </div>
          <div className="mt-4 text-xs text-slate-500">
            {lang === "ru"
              ? "Подсказка: храните модель в стабильном месте. Вы можете выбрать её заново позже через сброс данных."
              : "Tip: Keep the model in a stable location. You can re-select it later by resetting data."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
