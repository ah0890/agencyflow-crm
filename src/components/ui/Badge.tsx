import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "tone-neutral",
  info: "tone-info",
  accent: "tone-accent",
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
  violet: "tone-violet",
};

type BadgeProps = {
  tone?: Tone;
  children: ReactNode;
  /** Show a leading status dot, used in tables and Kanban headers. */
  dot?: boolean;
  className?: string;
};

/** Small status pill. Colour comes from the `tone` on the matching Option. */
export function Badge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn("size-1.5 rounded-full", `dot-${tone}`)}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
