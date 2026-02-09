import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentId: string;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const contentId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return <DropdownContext.Provider value={{ open, setOpen, contentId }}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({
  asChild,
  children
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  const child = React.isValidElement(children) ? children : null;
  if (asChild && child) {
    return React.cloneElement(child as React.ReactElement, {
      onClick: (e: React.MouseEvent) => {
        child.props?.onClick?.(e);
        ctx.setOpen(!ctx.open);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        child.props?.onKeyDown?.(e);
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.setOpen(true);
        }
      },
      "aria-haspopup": "menu",
      "aria-expanded": ctx.open,
      "aria-controls": ctx.contentId
    });
  }

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.setOpen(true);
        }
      }}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      aria-controls={ctx.contentId}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  align = "start",
  className,
  children
}: {
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuContent must be used within DropdownMenu");

  const ref = React.useRef<HTMLDivElement | null>(null);

  const focusFirst = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    items[0]?.focus();
  }, []);

  React.useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-dropdown-content]")) return;
      ctx.setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [ctx]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const t = window.setTimeout(() => focusFirst(), 0);
    return () => window.clearTimeout(t);
  }, [ctx.open, focusFirst]);

  if (!ctx.open) return null;

  return (
    <div
      id={ctx.contentId}
      ref={ref}
      data-dropdown-content
      role="menu"
      tabIndex={-1}
      onKeyDown={(e) => {
        const el = ref.current;
        if (!el) return;
        const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length === 0) return;

        const current = document.activeElement as HTMLElement | null;
        const currentIndex = current ? items.indexOf(current) : -1;

        if (e.key === "Escape") {
          e.preventDefault();
          ctx.setOpen(false);
          return;
        }
        if (e.key === "Tab") {
          ctx.setOpen(false);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = items[(currentIndex + 1) % items.length] ?? items[0];
          next?.focus();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const next = items[(currentIndex - 1 + items.length) % items.length] ?? items[items.length - 1];
          next?.focus();
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          items[0]?.focus();
          return;
        }
        if (e.key === "End") {
          e.preventDefault();
          items[items.length - 1]?.focus();
          return;
        }
      }}
      className={cn(
        "absolute z-50 mt-2 min-w-[12rem] rounded-md border border-slate-200 bg-white p-1 text-slate-900 shadow-lg",
        align === "end" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  onSelect,
  className,
  children
}: {
  onSelect?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuItem must be used within DropdownMenu");

  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        className
      )}
      onClick={() => {
        onSelect?.();
        ctx.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
