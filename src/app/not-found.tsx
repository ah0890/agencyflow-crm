import Link from "next/link";
import { buttonStyles } from "@/components/ui/button-styles";

/** Top-level 404 for URLs outside the application shell. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-[var(--accent-text)]">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className={buttonStyles("primary", "md", "mt-6")}>
        Go to AgencyFlow
      </Link>
    </main>
  );
}
