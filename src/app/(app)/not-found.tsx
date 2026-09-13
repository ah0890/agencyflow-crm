import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonStyles } from "@/components/ui/button-styles";

/**
 * Shown when a record id does not exist. Rendered inside the app shell so the
 * user keeps their navigation and can carry on rather than hitting a dead end.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-subtle)]">
        <SearchX className="size-6" />
      </span>
      <h1 className="text-lg font-semibold text-[var(--text)]">
        We could not find that record
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--text-muted)]">
        It may have been deleted, or the link might be out of date.
      </p>
      <Link href="/dashboard" className={buttonStyles("primary", "md", "mt-6")}>
        Back to dashboard
      </Link>
    </div>
  );
}
