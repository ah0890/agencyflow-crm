import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, KanbanSquare, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  {
    icon: Users,
    title: "Leads to clients",
    body: "Capture prospects, score them, and convert in one click.",
  },
  {
    icon: KanbanSquare,
    title: "Visual pipeline",
    body: "Drag deals between stages and watch the forecast update.",
  },
  {
    icon: BarChart3,
    title: "Live analytics",
    body: "Every KPI is derived from your data, never stored stale.",
  },
];

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== "false";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel - hidden on small screens where the form is what matters */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--border)] bg-[var(--bg-elevated)] p-12 lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
            AF
          </span>
          <span className="text-base font-semibold tracking-tight text-[var(--text)]">
            AgencyFlow CRM
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[var(--text)]">
            Run your agency from one place.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
            Leads, clients, deals, projects, tasks and follow-ups, with the
            reporting to tell you what is actually working.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <item.icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-[var(--text)]">
                    {item.title}
                  </span>
                  <span className="block text-sm text-[var(--text-muted)]">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[var(--text-subtle)]">
          Demo environment seeded with a fictional agency.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
              AF
            </span>
            <span className="text-base font-semibold tracking-tight text-[var(--text)]">
              AgencyFlow CRM
            </span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Welcome back. Enter your details to continue.
          </p>

          <LoginForm showDemo={showDemo} />
        </div>
      </section>
    </div>
  );
}
