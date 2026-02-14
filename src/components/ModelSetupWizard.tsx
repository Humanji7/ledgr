import * as React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setModelPath, setWizardCompleted } from "@/lib/tauri";
import type { Language } from "@/lib/strings";
import { strings } from "@/lib/strings";

const MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/blob/main/qwen2.5-1.5b-instruct-q4_k_m.gguf";

type Step = "welcome" | "download" | "select" | "done" | "skipped";

const STEPS: Step[] = ["welcome", "download", "select", "done"];

type Props = {
  onComplete: () => void;
  lang: Language;
};

function StepIndicator({ current, lang }: { current: Step; lang: Language }) {
  const stepIndex = STEPS.indexOf(current === "skipped" ? "done" : current);

  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i <= stepIndex
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </div>
          {i < STEPS.length - 1 ? (
            <div
              className={`h-0.5 w-8 ${
                i < stepIndex ? "bg-slate-900" : "bg-slate-200"
              }`}
            />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function ModelSetupWizard({ onComplete, lang }: Props) {
  const s = strings[lang];
  const [step, setStep] = React.useState<Step>("welcome");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const finish = React.useCallback(async () => {
    try {
      await setWizardCompleted();
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [onComplete]);

  const skip = React.useCallback(async () => {
    setStep("skipped");
    try {
      await setWizardCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const openDownloadPage = React.useCallback(async () => {
    try {
      await openUrl(MODEL_URL);
    } catch {
      // Fallback: shell.open may fail in dev mode
    }
  }, []);

  const pickModel = React.useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "GGUF model", extensions: ["gguf"] }],
      });
      if (!selected || Array.isArray(selected)) {
        setBusy(false);
        return;
      }
      await setModelPath(selected);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="mx-auto mt-12 w-full max-w-2xl px-6">
      <StepIndicator current={step} lang={lang} />
      <Card>
        {step === "welcome" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardWelcomeTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm leading-relaxed text-slate-700">
                {s.wizardWelcomeBody}
              </p>
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={skip}>
                  {s.wizardSkip}
                </Button>
                <Button type="button" onClick={() => setStep("download")}>
                  {s.wizardNext}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "download" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardDownloadTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-relaxed text-slate-700">
                {s.wizardDownloadBody}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mb-3"
                onClick={openDownloadPage}
              >
                {s.wizardOpenLink}
              </Button>
              <p className="mb-6 text-xs text-slate-500">
                {s.wizardDownloadHint}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("welcome")}
                  >
                    {s.wizardBack}
                  </Button>
                  <Button type="button" variant="ghost" onClick={skip}>
                    {s.wizardSkip}
                  </Button>
                </div>
                <Button type="button" onClick={() => setStep("select")}>
                  {s.wizardDownloaded}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "select" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardSelectTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm leading-relaxed text-slate-700">
                {s.wizardSelectBody}
              </p>
              <Button
                type="button"
                className="mb-4"
                onClick={pickModel}
                disabled={busy}
              >
                {busy ? s.selecting : s.wizardSelectFile}
              </Button>
              {error ? (
                <p className="mb-4 text-sm text-red-600">{error}</p>
              ) : null}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("download")}
                  >
                    {s.wizardBack}
                  </Button>
                  <Button type="button" variant="ghost" onClick={skip}>
                    {s.wizardSkip}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "done" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardDoneTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm leading-relaxed text-slate-700">
                {s.wizardDoneBody}
              </p>
              <div className="flex justify-end">
                <Button type="button" onClick={finish}>
                  {s.wizardStart}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}

        {step === "skipped" ? (
          <>
            <CardHeader>
              <CardTitle>{s.wizardSkippedTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm leading-relaxed text-slate-700">
                {s.wizardSkippedBody}
              </p>
              <div className="flex justify-end">
                <Button type="button" onClick={onComplete}>
                  {s.wizardStart}
                </Button>
              </div>
            </CardContent>
          </>
        ) : null}
      </Card>
    </div>
  );
}
