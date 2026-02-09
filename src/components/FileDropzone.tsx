import * as React from "react";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/strings";
import { strings } from "@/lib/strings";

type Props = {
  onFileSelected: (path: string) => void;
  disabled?: boolean;
  lang: Language;
};

export function FileDropzone({ onFileSelected, disabled, lang }: Props) {
  const s = strings[lang];
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [lastFile, setLastFile] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<string[]>("tauri://file-drop", (event) => {
      const paths = event.payload ?? [];
      const first = paths[0];
      if (first) {
        setLastFile(first);
        onFileSelected(first);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      unlisten?.();
    };
  }, [onFileSelected]);

  const onDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragActive(true);
  }, [disabled]);

  const onDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    // Actual file paths are provided by the Tauri window-level file-drop event.
    setLastFile(e.dataTransfer.files?.[0]?.name ?? null);
  }, []);

  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center",
        disabled ? "opacity-60" : "cursor-default",
        isDragActive ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
      ].join(" ")}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="text-sm font-medium text-slate-900">{s.dropzoneTitle}</div>
      <div className="mt-1 text-sm text-slate-600">{s.dropzoneSubtitle}</div>
      {lastFile ? (
        <div className="mt-3 text-xs text-slate-500">
          {s.last}: {lastFile}
        </div>
      ) : null}
      <div className="mt-4">
        <Button type="button" variant="outline" disabled>
          {lang === "ru" ? "Drag & Drop включён" : "Drag & Drop Enabled"}
        </Button>
      </div>
    </div>
  );
}
