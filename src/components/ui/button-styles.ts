import { cn } from "@/lib/utils";

/**
 * Button appearance, kept in a plain module (no "use client") so server
 * components can style a <Link> as a button. A function exported from a client
 * module is only a reference on the server and cannot be called there.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "subtle";
export type ButtonSize = "sm" | "md" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)]",
  ghost:
    "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
  danger:
    "bg-[var(--danger)] text-white hover:brightness-110 shadow-[var(--shadow-sm)]",
  subtle:
    "bg-[var(--accent-soft)] text-[var(--accent-text)] hover:brightness-125",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icon: "size-9 justify-center",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center rounded-[var(--radius)] font-medium transition-colors duration-150",
    "disabled:opacity-50 disabled:pointer-events-none select-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
