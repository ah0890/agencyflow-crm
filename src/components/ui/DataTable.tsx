import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Table chrome shared by every list view.
 *
 * The horizontal scroll wrapper is what keeps wide tables usable on a phone:
 * the page itself never scrolls sideways, only the table does.
 */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "border-b border-[var(--border)] px-4 align-middle text-[var(--text)]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      style={{ paddingTop: "var(--row-py)", paddingBottom: "var(--row-py)" }}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-[var(--surface-2)] last:[&>td]:border-b-0",
        className,
      )}
    >
      {children}
    </tr>
  );
}
