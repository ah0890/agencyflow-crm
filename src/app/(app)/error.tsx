"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Error boundary for the application routes.
 *
 * A failed query renders this instead of a blank page, and `reset()` re-runs
 * the server component so a transient failure can be retried in place.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger-text)]">
        <AlertTriangle className="size-6" />
      </span>
      <h1 className="text-lg font-semibold text-[var(--text)]">
        Something went wrong
      </h1>
      <p className="mt-1.5 max-w-md text-sm text-[var(--text-muted)]">
        This screen failed to load. Trying again usually fixes it - if not, the
        details are in the server console.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-[var(--text-subtle)]">
          Reference: {error.digest}
        </p>
      ) : null}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
