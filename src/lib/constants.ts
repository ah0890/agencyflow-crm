/**
 * Domain vocabulary for the whole CRM.
 *
 * SQLite has no ENUM type, so these arrays are the authority: Zod validates
 * against them, the UI renders labels and colours from them, and the seed
 * script draws from them. Adding a status means editing this file only.
 *
 * `tone` maps to the badge palette defined in src/app/globals.css.
 */

export type Option<T extends string = string> = {
  value: T;
  label: string;
  tone: Tone;
};

export type Tone =
  | "neutral"
  | "info"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "violet";

/* -------------------------------------------------------------------------- */
/*                                    Leads                                   */
/* -------------------------------------------------------------------------- */

export const LEAD_STATUSES = [
  { value: "NEW", label: "New", tone: "neutral" },
  { value: "CONTACTED", label: "Contacted", tone: "info" },
  { value: "QUALIFIED", label: "Qualified", tone: "accent" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent", tone: "violet" },
  { value: "NEGOTIATION", label: "Negotiation", tone: "warning" },
  { value: "WON", label: "Won", tone: "success" },
  { value: "LOST", label: "Lost", tone: "danger" },
] as const satisfies readonly Option[];

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

/** Stages a lead passes through before a win/loss decision. Drives the funnel. */
export const LEAD_FUNNEL_ORDER: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
];

export const LEAD_SOURCES = [
  { value: "WEBSITE", label: "Website", tone: "info" },
  { value: "REFERRAL", label: "Referral", tone: "success" },
  { value: "COLD_OUTREACH", label: "Cold Outreach", tone: "neutral" },
  { value: "SOCIAL_MEDIA", label: "Social Media", tone: "violet" },
  { value: "EVENT", label: "Event", tone: "warning" },
  { value: "PARTNER", label: "Partner", tone: "accent" },
  { value: "ADVERTISING", label: "Advertising", tone: "danger" },
] as const satisfies readonly Option[];

export type LeadSource = (typeof LEAD_SOURCES)[number]["value"];

/* -------------------------------------------------------------------------- */
/*                                   Clients                                  */
/* -------------------------------------------------------------------------- */

export const CLIENT_STATUSES = [
  { value: "ACTIVE", label: "Active", tone: "success" },
  { value: "PROSPECT", label: "Prospect", tone: "info" },
  { value: "ON_HOLD", label: "On Hold", tone: "warning" },
  { value: "CHURNED", label: "Churned", tone: "danger" },
] as const satisfies readonly Option[];

export type ClientStatus = (typeof CLIENT_STATUSES)[number]["value"];

/* -------------------------------------------------------------------------- */
/*                                    Deals                                   */
/* -------------------------------------------------------------------------- */

export const DEAL_STAGES = [
  { value: "NEW", label: "New", tone: "neutral" },
  { value: "CONTACTED", label: "Contacted", tone: "info" },
  { value: "QUALIFIED", label: "Qualified", tone: "accent" },
  { value: "PROPOSAL", label: "Proposal", tone: "violet" },
  { value: "NEGOTIATION", label: "Negotiation", tone: "warning" },
  { value: "WON", label: "Won", tone: "success" },
  { value: "LOST", label: "Lost", tone: "danger" },
] as const satisfies readonly Option[];

export type DealStage = (typeof DEAL_STAGES)[number]["value"];

/** Stages that still count toward open pipeline value. */
export const OPEN_DEAL_STAGES: DealStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
];

/**
 * Default win probability per stage. Used to pre-fill the form and to compute
 * weighted pipeline value on the dashboard.
 */
export const STAGE_PROBABILITY: Record<DealStage, number> = {
  NEW: 10,
  CONTACTED: 20,
  QUALIFIED: 40,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  WON: 100,
  LOST: 0,
};

/* -------------------------------------------------------------------------- */
/*                                  Projects                                  */
/* -------------------------------------------------------------------------- */

export const PROJECT_STATUSES = [
  { value: "PLANNING", label: "Planning", tone: "info" },
  { value: "IN_PROGRESS", label: "In Progress", tone: "accent" },
  { value: "ON_HOLD", label: "On Hold", tone: "warning" },
  { value: "COMPLETED", label: "Completed", tone: "success" },
  { value: "CANCELLED", label: "Cancelled", tone: "danger" },
] as const satisfies readonly Option[];

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];

export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
];

export const PROJECT_TYPES = [
  { value: "WEB_DEVELOPMENT", label: "Web Development", tone: "accent" },
  { value: "SEO", label: "SEO", tone: "success" },
  { value: "BRANDING", label: "Branding", tone: "violet" },
  { value: "PAID_ADS", label: "Paid Ads", tone: "warning" },
  { value: "SOCIAL_MEDIA", label: "Social Media", tone: "info" },
  { value: "CONTENT_MARKETING", label: "Content Marketing", tone: "neutral" },
  { value: "ECOMMERCE", label: "E-commerce", tone: "danger" },
  { value: "MOBILE_APP", label: "Mobile App", tone: "accent" },
] as const satisfies readonly Option[];

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */

export const TASK_STATUSES = [
  { value: "TODO", label: "To Do", tone: "neutral" },
  { value: "IN_PROGRESS", label: "In Progress", tone: "accent" },
  { value: "REVIEW", label: "Review", tone: "violet" },
  { value: "COMPLETED", label: "Completed", tone: "success" },
] as const satisfies readonly Option[];

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export const PRIORITIES = [
  { value: "LOW", label: "Low", tone: "neutral" },
  { value: "MEDIUM", label: "Medium", tone: "info" },
  { value: "HIGH", label: "High", tone: "warning" },
  { value: "URGENT", label: "Urgent", tone: "danger" },
] as const satisfies readonly Option[];

export type Priority = (typeof PRIORITIES)[number]["value"];

/* -------------------------------------------------------------------------- */
/*                                 Follow-ups                                 */
/* -------------------------------------------------------------------------- */

export const FOLLOWUP_TYPES = [
  { value: "CALL", label: "Call", tone: "accent" },
  { value: "EMAIL", label: "Email", tone: "info" },
  { value: "MEETING", label: "Meeting", tone: "violet" },
  { value: "DEMO", label: "Demo", tone: "warning" },
  { value: "CHECK_IN", label: "Check-in", tone: "neutral" },
] as const satisfies readonly Option[];

export type FollowUpType = (typeof FOLLOWUP_TYPES)[number]["value"];

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

export const USER_ROLES = [
  { value: "OWNER", label: "Owner", tone: "violet" },
  { value: "ADMIN", label: "Admin", tone: "accent" },
  { value: "SALES", label: "Sales", tone: "info" },
  { value: "PROJECT_MANAGER", label: "Project Manager", tone: "success" },
] as const satisfies readonly Option[];

export type UserRole = (typeof USER_ROLES)[number]["value"];

/* -------------------------------------------------------------------------- */
/*                                 Activities                                 */
/* -------------------------------------------------------------------------- */

export const ACTIVITY_TYPES = [
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_STATUS_CHANGED",
  "LEAD_CONVERTED",
  "LEAD_DELETED",
  "CLIENT_CREATED",
  "CLIENT_UPDATED",
  "CLIENT_DELETED",
  "DEAL_CREATED",
  "DEAL_UPDATED",
  "DEAL_STAGE_CHANGED",
  "DEAL_WON",
  "DEAL_LOST",
  "DEAL_DELETED",
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_STATUS_CHANGED",
  "PROJECT_DELETED",
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "TASK_DELETED",
  "FOLLOWUP_SCHEDULED",
  "FOLLOWUP_COMPLETED",
  "FOLLOWUP_DELETED",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/* -------------------------------------------------------------------------- */
/*                                Notifications                               */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_TYPES = [
  "FOLLOWUP_DUE",
  "TASK_OVERDUE",
  "PROJECT_DEADLINE",
  "LEAD_ASSIGNED",
  "DEAL_STAGE_CHANGED",
  "SYSTEM",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_LEVELS = [
  "INFO",
  "SUCCESS",
  "WARNING",
  "DANGER",
] as const;

export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/** Turn an options array into the plain string union Zod needs. */
export function valuesOf<T extends readonly Option[]>(
  options: T,
): [T[number]["value"], ...T[number]["value"][]] {
  return options.map((o) => o.value) as [
    T[number]["value"],
    ...T[number]["value"][],
  ];
}

/** Look up an option so the UI can render a label/tone from a raw DB string. */
export function optionOf<T extends readonly Option[]>(
  options: T,
  value: string | null | undefined,
): Option {
  return (
    options.find((o) => o.value === value) ?? {
      value: value ?? "UNKNOWN",
      label: value ?? "Unknown",
      tone: "neutral",
    }
  );
}

/** Human label for a raw DB string, falling back to the raw value. */
export function labelOf<T extends readonly Option[]>(
  options: T,
  value: string | null | undefined,
): string {
  return optionOf(options, value).label;
}

/** Rows per page for every paginated table in the app. */
export const PAGE_SIZE = 10;
