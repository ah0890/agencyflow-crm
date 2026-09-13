"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  Info,
  Loader2,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import type { Alerts } from "@/server/services/notifications";

type Notification = {
  id: string;
  title: string;
  body: string;
  level: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type Payload = {
  notifications: Notification[];
  alerts: Alerts;
  unreadCount: number;
};

const LEVEL_ICON: Record<string, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCheck,
  WARNING: AlertTriangle,
  DANGER: CircleAlert,
};

const LEVEL_TONE: Record<string, string> = {
  INFO: "text-[var(--info-text)]",
  SUCCESS: "text-[var(--success-text)]",
  WARNING: "text-[var(--warning-text)]",
  DANGER: "text-[var(--danger-text)]",
};

/**
 * Notification dropdown.
 *
 * Shows two things: stored notifications (events that happened) and live
 * alerts (conditions that are true right now - overdue tasks, follow-ups due,
 * deadlines approaching). See src/server/services/notifications.ts for why the
 * second group is computed rather than stored.
 */
export function NotificationBell() {
  const { preferences } = usePreferences();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) setData(await response.json());
    } catch {
      // Offline or server restarting: leave the previous state on screen.
    }
  }, []);

  // Fetch once on mount. The request is started from a microtask so the effect
  // body itself performs no state update, and the badge fills in when the
  // response lands.
  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    await load();
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    await load();
  }

  // Settings > Notifications decides which alert groups are shown at all.
  const dueFollowUps = preferences.notifyFollowUps
    ? (data?.alerts.dueFollowUps ?? [])
    : [];
  const overdueTasks = preferences.notifyOverdueTasks
    ? (data?.alerts.overdueTasks ?? [])
    : [];
  const deadlines = preferences.notifyDeadlines
    ? (data?.alerts.deadlines ?? [])
    : [];

  const unread = data?.unreadCount ?? 0;
  const alertTotal =
    dueFollowUps.length + overdueTasks.length + deadlines.length;
  const badgeCount = unread + alertTotal;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        aria-label={`Notifications${badgeCount ? `, ${badgeCount} needing attention` : ""}`}
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      >
        <Bell className="size-4.5" />
        {badgeCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold leading-4 text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-fade-in absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Notifications
            </h2>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {data === null ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-4 animate-spin text-[var(--text-subtle)]" />
              </div>
            ) : null}

            {data && alertTotal > 0 ? (
              <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                  Needs attention
                </p>
                <ul className="space-y-1.5">
                  {overdueTasks.map((task) => (
                    <li key={task.id}>
                      <Link
                        href="/tasks?scope=overdue"
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-[var(--danger-text)]" />
                        <span>
                          Overdue task:{" "}
                          <span className="text-[var(--text)]">{task.title}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {dueFollowUps.map((followUp) => (
                    <li key={followUp.id}>
                      <Link
                        href="/follow-ups"
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-[var(--warning-text)]" />
                        <span>
                          Follow-up due:{" "}
                          <span className="text-[var(--text)]">
                            {followUp.title}
                          </span>{" "}
                          {formatRelative(followUp.dueAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {deadlines.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--warning-text)]" />
                        <span>
                          Deadline{" "}
                          <span className="text-[var(--text)]">
                            {project.name}
                          </span>{" "}
                          {formatRelative(project.deadline)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data && data.notifications.length === 0 && alertTotal === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                You are all caught up.
              </p>
            ) : null}

            {data?.notifications.map((notification) => {
              const Icon = LEVEL_ICON[notification.level] ?? Info;
              const body = (
                <>
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      LEVEL_TONE[notification.level],
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-[var(--text)]">
                        {notification.title}
                      </span>
                      {!notification.read ? (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                          aria-label="Unread"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--text-subtle)]">
                      {formatRelative(notification.createdAt)}
                    </span>
                  </span>
                </>
              );

              const className = cn(
                "flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-2)]",
                !notification.read && "bg-[var(--accent-soft)]/30",
              );

              return notification.link ? (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => {
                    setOpen(false);
                    if (!notification.read) void markRead(notification.id);
                  }}
                  className={className}
                >
                  {body}
                </Link>
              ) : (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => void markRead(notification.id)}
                  className={className}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
