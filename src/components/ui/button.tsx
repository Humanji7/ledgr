import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-slate-900 text-white hover:bg-slate-900/90 active:bg-slate-900/80",
          variant === "outline" &&
            "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
          variant === "ghost" && "bg-transparent text-slate-900 hover:bg-slate-100",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-9 px-3",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

