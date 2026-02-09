import * as React from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  clearLabel?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  "aria-label"?: string;
};

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  clearLabel = "Clear",
  id,
  name = "search",
  autoComplete = "off",
  "aria-label": ariaLabel
}: Props) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={ariaLabel ?? placeholder}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 pr-16 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      {value ? (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(""))}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
