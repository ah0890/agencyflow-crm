"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  isActivePath,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/Avatar";
import { labelOf, USER_ROLES } from "@/lib/constants";

/**
 * Primary navigation.
 *
 * One component serves both breakpoints: a permanent rail from `lg` up, and a
 * slide-in drawer below it. The parent (AppShell) owns the open state.
 */
export function Sidebar({
  user,
  open,
  onClose,
}: {
  user: SessionUser;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-[var(--overlay)] backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-[var(--border)] px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white"
              aria-hidden
            >
              AF
            </span>
            <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
              AgencyFlow
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => {
            const items = NAV_ITEMS.filter((item) => item.group === group.id);
            if (items.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                {group.label ? (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                    {group.label}
                  </p>
                ) : null}

                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-text)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute inset-y-1.5 -left-3 w-0.5 rounded-r bg-[var(--accent)]"
                          aria-hidden
                        />
                      ) : null}
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-[var(--radius)] p-2 transition-colors hover:bg-[var(--surface-2)]"
          >
            <Avatar name={user.name} color={user.avatarColor} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--text)]">
                {user.name}
              </span>
              <span className="block truncate text-xs text-[var(--text-subtle)]">
                {user.jobTitle ?? labelOf(USER_ROLES, user.role)}
              </span>
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
