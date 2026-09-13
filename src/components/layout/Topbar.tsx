"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import { QUICK_ADD } from "@/lib/navigation";
import { USER_ROLES, labelOf } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { usePreferences } from "@/components/providers/PreferencesProvider";

/** Top bar: search, quick-add, theme, notifications and the user menu. */
export function Topbar({
  user,
  onOpenSidebar,
}: {
  user: SessionUser;
  onOpenSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)]/85 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>

      <QuickAddMenu />
      <ThemeToggle />
      <NotificationBell />
      <UserMenu user={user} />
    </header>
  );
}

/* ------------------------------- quick add -------------------------------- */

function QuickAddMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Create new record"
        className="flex h-9 items-center gap-1.5 rounded-[var(--radius)] bg-[var(--accent)] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] sm:px-3"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">New</span>
      </button>

      {open ? (
        <div className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] py-1 shadow-[var(--shadow-lg)]">
          {QUICK_ADD.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------ theme toggle ------------------------------ */

function ThemeToggle() {
  const { preferences, setPreference } = usePreferences();
  const dark = preferences.theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setPreference("theme", dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="hidden size-9 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] sm:flex"
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}

/* ------------------------------- user menu -------------------------------- */

function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false));

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-[var(--radius)] p-1 transition-colors hover:bg-[var(--surface-2)]"
      >
        <Avatar name={user.name} color={user.avatarColor} size="sm" />
        <ChevronDown className="hidden size-3.5 text-[var(--text-subtle)] sm:block" />
      </button>

      {open ? (
        <div className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {user.name}
            </p>
            <p className="truncate text-xs text-[var(--text-subtle)]">
              {user.email}
            </p>
            <p className="mt-1.5 inline-block rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-text)]">
              {labelOf(USER_ROLES, user.role)}
            </p>
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <SettingsIcon className="size-4" />
            Settings
          </Link>

          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 border-t border-[var(--border)] px-4 py-2.5 text-left text-sm text-[var(--danger-text)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            <LogOut className="size-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- utilities ------------------------------- */

/** Close a dropdown on outside click or Escape. */
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onDismiss]);
}
