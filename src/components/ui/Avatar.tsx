import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

type AvatarProps = {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-14 text-lg",
};

/**
 * Initials avatar. The agency has no file uploads, so a stable colour per user
 * (stored on the User record) does the identifying work instead.
 */
export function Avatar({
  name,
  color = "#6366f1",
  size = "md",
  className,
}: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
