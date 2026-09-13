import {
  ArrowRightLeft,
  Briefcase,
  CheckCircle2,
  CircleDot,
  PhoneCall,
  Plus,
  Trash2,
  TrendingDown,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

export type TimelineActivity = {
  id: string;
  type: string;
  message: string;
  detail: string | null;
  createdAt: Date | string;
  user: { id: string; name: string; avatarColor: string } | null;
};

/**
 * Icon and colour for each activity type.
 *
 * Anything not listed falls back to a neutral dot, so a new activity type can
 * be added to the services without breaking the timeline.
 */
const APPEARANCE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  LEAD_CREATED: { icon: UserPlus, tone: "info" },
  LEAD_UPDATED: { icon: CircleDot, tone: "neutral" },
  LEAD_STATUS_CHANGED: { icon: ArrowRightLeft, tone: "accent" },
  LEAD_CONVERTED: { icon: Trophy, tone: "success" },
  LEAD_DELETED: { icon: Trash2, tone: "danger" },
  CLIENT_CREATED: { icon: Users, tone: "success" },
  CLIENT_UPDATED: { icon: CircleDot, tone: "neutral" },
  CLIENT_DELETED: { icon: Trash2, tone: "danger" },
  DEAL_CREATED: { icon: Plus, tone: "violet" },
  DEAL_UPDATED: { icon: CircleDot, tone: "neutral" },
  DEAL_STAGE_CHANGED: { icon: ArrowRightLeft, tone: "accent" },
  DEAL_WON: { icon: Trophy, tone: "success" },
  DEAL_LOST: { icon: TrendingDown, tone: "danger" },
  DEAL_DELETED: { icon: Trash2, tone: "danger" },
  PROJECT_CREATED: { icon: Briefcase, tone: "accent" },
  PROJECT_UPDATED: { icon: CircleDot, tone: "neutral" },
  PROJECT_STATUS_CHANGED: { icon: ArrowRightLeft, tone: "warning" },
  PROJECT_DELETED: { icon: Trash2, tone: "danger" },
  TASK_CREATED: { icon: Plus, tone: "neutral" },
  TASK_UPDATED: { icon: CircleDot, tone: "neutral" },
  TASK_COMPLETED: { icon: CheckCircle2, tone: "success" },
  TASK_DELETED: { icon: Trash2, tone: "danger" },
  FOLLOWUP_SCHEDULED: { icon: PhoneCall, tone: "info" },
  FOLLOWUP_COMPLETED: { icon: CheckCircle2, tone: "success" },
  FOLLOWUP_DELETED: { icon: Trash2, tone: "danger" },
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "tone-neutral",
  info: "tone-info",
  accent: "tone-accent",
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
  violet: "tone-violet",
};

/**
 * Chronological event list.
 *
 * The same component renders the global feed on the dashboard and the
 * per-record history on every detail page - only the query behind it changes.
 */
export function ActivityTimeline({
  activities,
  emptyMessage = "No activity recorded yet.",
  className,
}: {
  activities: TimelineActivity[];
  emptyMessage?: string;
  className?: string;
}) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ol className={cn("relative space-y-4", className)}>
      {activities.map((activity, index) => {
        const appearance = APPEARANCE[activity.type] ?? {
          icon: CircleDot,
          tone: "neutral" as Tone,
        };
        const Icon = appearance.icon;
        const last = index === activities.length - 1;

        return (
          <li key={activity.id} className="relative flex gap-3">
            {/* Connector line between events */}
            {!last ? (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-[var(--border)]"
                aria-hidden
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                TONE_CLASS[appearance.tone],
              )}
              aria-hidden
            >
              <Icon className="size-3.5" />
            </span>

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm leading-snug text-[var(--text)]">
                {activity.message}
              </p>
              {activity.detail ? (
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {activity.detail}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-[var(--text-subtle)]">
                {activity.user ? `${activity.user.name} · ` : ""}
                {formatRelative(activity.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
