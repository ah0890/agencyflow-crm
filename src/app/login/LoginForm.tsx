"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/schemas";
import { ApiError, apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

const DEMO_ACCOUNTS = [
  { email: "sarah@agencyflow.dev", role: "Owner - sees everything" },
  { email: "daniel@agencyflow.dev", role: "Head of New Business" },
  { email: "marcus@agencyflow.dev", role: "Delivery Lead" },
];

const DEMO_PASSWORD = "demo1234";

/**
 * Login form.
 *
 * The same `loginSchema` validates here and in the API route, so the client
 * catches obvious mistakes instantly while the server stays the authority.
 */
export function LoginForm({ showDemo }: { showDemo: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: showDemo
      ? { email: DEMO_ACCOUNTS[0]!.email, password: DEMO_PASSWORD }
      : { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await apiRequest("/api/auth/login", { method: "POST", body: values });
      // A full refresh so the server layout picks up the new session cookie.
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger-text)]"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {formError}
          </div>
        ) : null}

        <TextInput
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@agency.com"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <TextInput
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full justify-center">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {showDemo ? (
        <div className="mt-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium text-[var(--text)]">
            Demo accounts
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
            Password for all accounts:{" "}
            <code className="text-[var(--accent-text)]">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-3 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", account.email);
                    setValue("password", DEMO_PASSWORD);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="truncate text-[var(--text-muted)]">
                    {account.email}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--text-subtle)]">
                    {account.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
