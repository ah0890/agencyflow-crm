import { z } from "zod";
import {
  CLIENT_STATUSES,
  DEAL_STAGES,
  FOLLOWUP_TYPES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
  USER_ROLES,
  valuesOf,
} from "@/lib/constants";
import {
  money,
  partialWithoutDefaults,
  optionalDate,
  optionalId,
  optionalText,
  percentage,
  requiredDate,
  requiredId,
  requiredText,
} from "./common";

/**
 * One Zod schema per entity, used in three places:
 *   1. the client form (react-hook-form resolver),
 *   2. the API route handler (never trust the client),
 *   3. the unit tests.
 *
 * Every schema has a `create` form and an `update` form. Update is a partial of
 * create so a PATCH can send only the fields that changed.
 */

/* -------------------------------------------------------------------------- */
/*                                    Auth                                    */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/*                                    Leads                                   */
/* -------------------------------------------------------------------------- */

export const createLeadSchema = z.object({
  name: requiredText("Contact name"),
  company: requiredText("Company"),
  email: z.email("Enter a valid email address"),
  phone: optionalText(40),
  source: z.enum(valuesOf(LEAD_SOURCES)),
  industry: optionalText(80),
  status: z.enum(valuesOf(LEAD_STATUSES)).default("NEW"),
  score: percentage.default(50),
  estimatedValue: money.default(0),
  notes: optionalText(2000),
  nextFollowUpAt: optionalDate,
  ownerId: requiredId("Assigned to"),
});

export const updateLeadSchema = partialWithoutDefaults(createLeadSchema);

export type CreateLeadInput = z.input<typeof createLeadSchema>;
export type UpdateLeadInput = z.input<typeof updateLeadSchema>;

/** Converting a lead spawns a client and, optionally, a deal. */
export const convertLeadSchema = z.object({
  accountManagerId: requiredId("Account manager"),
  createDeal: z.coerce.boolean().default(true),
  dealValue: money.optional(),
});

/* -------------------------------------------------------------------------- */
/*                                   Clients                                  */
/* -------------------------------------------------------------------------- */

export const createClientSchema = z.object({
  name: requiredText("Company name"),
  contactName: requiredText("Primary contact"),
  email: z.email("Enter a valid email address"),
  phone: optionalText(40),
  website: optionalText(200),
  industry: optionalText(80),
  status: z.enum(valuesOf(CLIENT_STATUSES)).default("ACTIVE"),
  address: optionalText(300),
  notes: optionalText(2000),
  accountManagerId: requiredId("Account manager"),
});

export const updateClientSchema = partialWithoutDefaults(createClientSchema);

export type CreateClientInput = z.input<typeof createClientSchema>;

/* -------------------------------------------------------------------------- */
/*                                    Deals                                   */
/* -------------------------------------------------------------------------- */

export const createDealSchema = z.object({
  title: requiredText("Deal title"),
  company: requiredText("Company"),
  contactName: requiredText("Contact person"),
  value: money.default(0),
  stage: z.enum(valuesOf(DEAL_STAGES)).default("NEW"),
  probability: percentage.optional(),
  expectedCloseDate: optionalDate,
  notes: optionalText(2000),
  ownerId: requiredId("Assigned to"),
  leadId: optionalId,
  clientId: optionalId,
});

export const updateDealSchema = partialWithoutDefaults(createDealSchema);

/** The Kanban board only ever moves a deal between columns. */
export const moveDealSchema = z.object({
  stage: z.enum(valuesOf(DEAL_STAGES)),
  position: z.coerce.number().int().min(0).optional(),
});

export type CreateDealInput = z.input<typeof createDealSchema>;

/* -------------------------------------------------------------------------- */
/*                                  Projects                                  */
/* -------------------------------------------------------------------------- */

export const createProjectSchema = z
  .object({
    name: requiredText("Project name"),
    clientId: requiredId("Client"),
    type: z.enum(valuesOf(PROJECT_TYPES)).default("WEB_DEVELOPMENT"),
    status: z.enum(valuesOf(PROJECT_STATUSES)).default("PLANNING"),
    priority: z.enum(valuesOf(PRIORITIES)).default("MEDIUM"),
    description: optionalText(2000),
    budget: money.default(0),
    progress: percentage.default(0),
    startDate: requiredDate("Start date"),
    deadline: optionalDate,
    managerId: requiredId("Project manager"),
    memberIds: z.array(z.string()).default([]),
  })
  .refine(
    (data) => !data.deadline || data.deadline >= data.startDate,
    { path: ["deadline"], error: "Deadline must be on or after the start date" },
  );

/**
 * `.partial()` is not available on a refined schema, so the update shape is
 * declared from the same field definitions and re-applies the date check.
 */
export const updateProjectSchema = z
  .object({
    name: requiredText("Project name").optional(),
    clientId: requiredId("Client").optional(),
    type: z.enum(valuesOf(PROJECT_TYPES)).optional(),
    status: z.enum(valuesOf(PROJECT_STATUSES)).optional(),
    priority: z.enum(valuesOf(PRIORITIES)).optional(),
    description: optionalText(2000).optional(),
    budget: money.optional(),
    progress: percentage.optional(),
    startDate: requiredDate("Start date").optional(),
    deadline: optionalDate.optional(),
    managerId: requiredId("Project manager").optional(),
    memberIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      !data.deadline || !data.startDate || data.deadline >= data.startDate,
    { path: ["deadline"], error: "Deadline must be on or after the start date" },
  );

export type CreateProjectInput = z.input<typeof createProjectSchema>;

/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */

export const createTaskSchema = z.object({
  title: requiredText("Task title"),
  description: optionalText(2000),
  projectId: optionalId,
  assigneeId: optionalId,
  priority: z.enum(valuesOf(PRIORITIES)).default("MEDIUM"),
  status: z.enum(valuesOf(TASK_STATUSES)).default("TODO"),
  dueDate: optionalDate,
});

export const updateTaskSchema = partialWithoutDefaults(createTaskSchema);

export type CreateTaskInput = z.input<typeof createTaskSchema>;

/* -------------------------------------------------------------------------- */
/*                                 Follow-ups                                 */
/* -------------------------------------------------------------------------- */

export const createFollowUpSchema = z
  .object({
    title: requiredText("Title"),
    type: z.enum(valuesOf(FOLLOWUP_TYPES)).default("CALL"),
    notes: optionalText(2000),
    dueAt: requiredDate("Date and time"),
    ownerId: requiredId("Assigned to"),
    leadId: optionalId,
    clientId: optionalId,
  })
  .refine((data) => Boolean(data.leadId || data.clientId), {
    path: ["leadId"],
    error: "Link the follow-up to either a lead or a client",
  });

export const updateFollowUpSchema = z.object({
  title: requiredText("Title").optional(),
  type: z.enum(valuesOf(FOLLOWUP_TYPES)).optional(),
  notes: optionalText(2000).optional(),
  dueAt: requiredDate("Date and time").optional(),
  ownerId: requiredId("Assigned to").optional(),
  leadId: optionalId.optional(),
  clientId: optionalId.optional(),
  completed: z.coerce.boolean().optional(),
  outcome: optionalText(500).optional(),
});

export type CreateFollowUpInput = z.input<typeof createFollowUpSchema>;

/* -------------------------------------------------------------------------- */
/*                                  Settings                                  */
/* -------------------------------------------------------------------------- */

export const updateProfileSchema = z.object({
  name: requiredText("Name"),
  email: z.email("Enter a valid email address"),
  jobTitle: optionalText(80),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour")
    .optional(),
  role: z.enum(valuesOf(USER_ROLES)).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(100, "That password is too long"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  });

/** User-tunable CRM behaviour, persisted in localStorage (see usePreferences). */
export const preferencesSchema = z.object({
  theme: z.enum(["dark", "light"]).default("dark"),
  accent: z.enum(["indigo", "cyan", "violet", "emerald"]).default("indigo"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  currency: z.enum(["USD", "EUR", "GBP", "PKR", "AED"]).default("USD"),
  defaultLeadOwnerId: z.string().optional(),
  notifyFollowUps: z.boolean().default(true),
  notifyOverdueTasks: z.boolean().default(true),
  notifyDeadlines: z.boolean().default(true),
});

export type Preferences = z.infer<typeof preferencesSchema>;
