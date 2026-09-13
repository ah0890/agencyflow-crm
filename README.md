# AgencyFlow CRM

A modern full-stack CRM for digital agencies to manage leads, clients, projects, tasks, follow-ups, and business operations from one centralized dashboard.

Built with Next.js 16, TypeScript, Prisma and SQLite. Clone it, run two commands, and you have a populated CRM running locally — no database server, no cloud account, no API keys.

```bash
npm install && npm run db:setup && npm run dev
```

Then sign in at <http://localhost:3000> with **sarah@agencyflow.dev** / **demo1234**.

---

## Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Database schema](#database-schema)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database and seed data](#database-and-seed-data)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Design decisions worth knowing](#design-decisions-worth-knowing)
- [Future improvements](#future-improvements)
- [License](#license)

---

## Screenshots

> Replace these placeholders with your own captures. Suggested shots: the
> dashboard, the pipeline board mid-drag, a lead detail page, the reports page,
> and one mobile view.

| Dashboard | Sales pipeline |
| --- | --- |
| _`docs/screenshots/dashboard.png`_ | _`docs/screenshots/pipeline.png`_ |

| Reports | Lead detail |
| --- | --- |
| _`docs/screenshots/reports.png`_ | _`docs/screenshots/lead-detail.png`_ |

---

## Features

### Sales

- **Leads** — capture prospects with source, industry, qualification score (0–100), expected value, owner and next follow-up date. Seven-stage status pipeline from New to Won/Lost.
- **Lead conversion** — one action turns a qualified lead into a client, optionally creating a won deal at the same time. Runs in a database transaction, so a half-converted lead is impossible.
- **Deals** — a drag-and-drop Kanban board across seven stages, plus a sortable table view of the same data. Win probability, `closedAt` and the activity log all follow the stage automatically.
- **Clients** — company profiles with contact details, account manager, status, derived revenue and linked projects, deals and follow-ups.

### Delivery

- **Projects** — budget, type, priority, start date, deadline, progress bar and a staffed team, shown as cards.
- **Tasks** — four-stage workflow (To Do → In Progress → Review → Completed) with assignee, priority and due date. Ticking a task recalculates its project's progress percentage automatically.
- **Follow-ups** — scheduled calls, emails, meetings and demos linked to a lead or a client, with upcoming / overdue / completed views.

### Insight

- **Dashboard** — eight KPI tiles, a six-month revenue trend, a lead conversion funnel, pipeline value by stage, leads by source, projects by status, upcoming follow-ups, biggest open deals and a live activity feed.
- **Reports** — configurable 3/6/12-month window covering revenue, win rate, conversion, task and project completion, lead sources, project mix and per-person team performance.
- **Activity timeline** — an append-only audit trail. Every service-layer write records an event, so the global feed and each record's own history are always complete.
- **Notifications** — a bell menu combining stored events (a lead assigned to you, a deal you own closing) with live alerts computed on read (overdue tasks, follow-ups due within 48 hours, deadlines within a week).

### Throughout

- **Global search** across leads, clients, projects, deals and tasks, with `Ctrl`/`Cmd` + `K`, arrow-key navigation and Enter to open.
- **URL-driven filtering** — search, filters, sort and page number all live in the query string, so every view is a shareable link that survives a refresh.
- **Full CRUD** on every entity with inline validation, loading states, toasts, confirmation dialogs and empty states.
- **Dark-first design** with a supported light theme, four accent colours and a density toggle — all applied server-side, so there is no theme flash.
- **Responsive** from 390px phones to wide desktops.
- **Accessible** — labelled inputs wired to their errors, a focus-trapped dialog, visible focus rings, keyboard-operable menus and `prefers-reduced-motion` support.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) | Server components render the data-heavy pages in one pass; route handlers give a real HTTP API in the same codebase. |
| Language | **TypeScript 6** (strict) | Types run end to end, from the Prisma schema through the services to the forms. |
| Database | **SQLite** via **Prisma 7** | Zero setup for anyone cloning the repo. Prisma provides migrations and a fully typed client. |
| Styling | **Tailwind CSS 4** | Design tokens as CSS variables, so the theme switch is a variable swap rather than a second stylesheet. |
| Validation | **Zod 4** | One schema per entity validates the browser form *and* the API route. |
| Forms | **react-hook-form** | Uncontrolled inputs, few re-renders, clean server-error mapping. |
| Charts | **Recharts** | Hover/tooltip behaviour for the two figures that need it; the rest are plain HTML. |
| Drag & drop | **@dnd-kit** | Accessible, keyboard-capable, no legacy HTML5 drag API. |
| Auth | **jose** + **bcryptjs** | A signed JWT in an httpOnly cookie — small, dependency-light and swappable. |
| Testing | **Vitest** | Runs the real services against a real throwaway SQLite file. |

### Why this stack

The brief asked for something modern, easy to run locally, easy for another developer to read, and deployable later. Those pushed toward one codebase rather than a separate API and SPA, and toward an embedded database rather than a server.

SQLite is the decision most worth defending. It means `npm install` is genuinely all the setup there is — no Docker, no connection string, no cloud tier that expires. Because everything goes through Prisma, moving to Postgres later is a provider change in `prisma/schema.prisma` plus a new `DATABASE_URL`; no application code changes.

---

## Architecture

Four layers, each with one job:

```
 Browser
   │
   ├── app/(app)/**/page.tsx ......... UI. Server components: read searchParams,
   │                                   call a service, render finished HTML.
   │
   ├── components/** ................. Presentation + the small amount of client
   │                                   state dialogs and drag-and-drop need.
   ▼
 HTTP
   │
   ├── app/api/**/route.ts ........... Transport. Authenticate, parse the body,
   │                                   call a service, return JSON. ~10 lines each.
   ▼
 Business logic
   │
   ├── server/services/*.ts .......... All the rules live here: stage transitions,
   │                                   progress recalculation, conversion,
   │                                   activity logging, notifications.
   │
   ├── lib/validation/schemas.ts ..... Zod schemas shared by forms and API.
   ▼
 Data
   │
   └── lib/db.ts + Prisma ............ The only thing that touches SQLite.
```

**The rule that holds it together:** nothing outside `server/services/` writes to
the database. That is what guarantees every change produces an activity entry —
there is no code path that can quietly skip it.

### How data flows

Take "drag a deal from Qualified to Won":

1. `PipelineBoard` moves the card immediately (optimistic) and `PATCH`es `/api/deals/:id/move`.
2. The route handler authenticates via the session cookie and calls `moveDeal()`.
3. `moveDeal()` validates with `moveDealSchema`, updates the stage, sets probability to 100 and stamps `closedAt`, writes a `DEAL_WON` activity and notifies the deal's owner.
4. `useResourceMutation` calls `router.refresh()`, so every server component re-queries: the board, the KPI tiles and the activity feed all update together.
5. If the request had failed, the card springs back to its original column and a toast explains why.

Editing the same deal's stage through the form takes the identical path from
step 3, which is why the two can never disagree.

---

## Database schema

Nine models plus a join table.

```
User ───┬─< Lead ──────┬─< Deal >─── Client
        │              │              │
        │              └─< FollowUp >─┘
        │                             │
        ├─< Project >─────────────────┘
        │     │
        │     ├─< Task
        │     └─< ProjectMember >─ User
        │
        ├─< Activity   (links to any record: lead, client, deal, project, task, follow-up)
        └─< Notification
```

| Model | Purpose | Notable fields |
| --- | --- | --- |
| `User` | Agency staff | `role`, `avatarColor`, `passwordHash` |
| `Lead` | A prospect | `status`, `score`, `estimatedValue`, `nextFollowUpAt`, `convertedClientId` |
| `Client` | A paying company | `status`, `accountManagerId` (revenue is derived, not stored) |
| `Deal` | A pipeline opportunity | `stage`, `value`, `probability`, `closedAt`, `position` |
| `Project` | Delivery work | `status`, `budget`, `progress`, `startDate`, `deadline` |
| `ProjectMember` | Staffing join table | unique on `(projectId, userId)` |
| `Task` | A unit of work | `status`, `priority`, `dueDate`, `completedAt` |
| `FollowUp` | A scheduled touchpoint | `dueAt`, `completed`, linked to a lead **or** a client |
| `Activity` | Append-only audit trail | `type`, `message`, optional FK to any record |
| `Notification` | Per-user inbox | `type`, `level`, `read` |

Two deliberate choices:

- **Statuses are `String`, not enums.** SQLite has no `ENUM` type, so the
  vocabulary lives in [`src/lib/constants.ts`](src/lib/constants.ts) and is
  enforced by Zod. One file defines the value, the label, and the colour used by
  every badge and chart.
- **Derived values are not stored.** A client's total revenue is summed from its
  won deals on read. A stored total would drift the moment a deal was edited.

Cascade behaviour: deleting a client removes its projects and their tasks, but
its deals survive with the link cleared, so revenue history is never destroyed.

---

## Getting started

**Requirements:** Node.js 20 or newer (developed on 22) and npm. Nothing else.

```bash
git clone https://github.com/<your-username>/agencyflow-crm.git
cd agencyflow-crm

npm install          # installs dependencies and generates the Prisma client
cp .env.example .env # then set AUTH_SECRET — see below
npm run db:setup     # creates the SQLite file and loads the demo data
npm run dev          # http://localhost:3000
```

Generate a real secret before doing anything beyond local development:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Demo accounts

Every seeded user shares the password **`demo1234`**.

| Email | Role | Good for demonstrating |
| --- | --- | --- |
| `sarah@agencyflow.dev` | Owner | Everything — use this one |
| `daniel@agencyflow.dev` | Sales | Owning leads and deals |
| `marcus@agencyflow.dev` | Project Manager | Projects and delivery |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:setup` | Create the database and seed it (first-time setup) |
| `npm run db:seed` | Re-seed (wipes and rebuilds the demo data) |
| `npm run db:reset` | Drop the schema, recreate it, re-seed |
| `npm run db:studio` | Browse the data in Prisma Studio |
| `npm test` | Run the test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Environment variables

Copy `.env.example` to `.env`. The file is git-ignored; **no secrets are committed to this repository.**

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` | SQLite file, relative to the project root. Swap for a `postgresql://` URL to move databases. |
| `AUTH_SECRET` | yes | — | Signs the session JWT. Must be at least 16 characters; use 32 random bytes. |
| `SESSION_MAX_AGE_DAYS` | no | `7` | How long a login lasts. |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | no | `true` | Shows the demo account picker on the login screen. Set `false` for a real deployment. |
| `SEED_DEMO_PASSWORD` | no | `demo1234` | Password given to every seeded user. |

---

## Database and seed data

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma) and
applied with `prisma db push`. For a deployment you would switch to versioned
migrations with `npx prisma migrate dev`.

[`prisma/seed.ts`](prisma/seed.ts) builds a complete fictional agency:

- 6 team members
- 10 clients across different industries and statuses
- 26 leads spread over every stage and source
- 48 deals — an open pipeline in every column, six months of wins, and some losses so the win rate is not 100%
- 14 projects with 68 tasks
- 20 follow-ups, some deliberately overdue
- 88 activity entries and 6 notifications

Two details make it demo-ready. All dates are generated **relative to today**, so
the data never looks stale. And a seeded PRNG makes the output **reproducible** —
re-seeding gives the same agency back.

The seed is destructive by design: it clears every table first, so `npm run db:seed` always returns you to a known state. Handy if a demo goes sideways mid-recording.

---

## Testing

```bash
npm test
```

69 tests across 7 files, run against a real SQLite database (`test.db`), created
fresh before the suite and truncated between individual tests. The services are
exercised for real — a mocked Prisma client would verify none of the behaviour
that actually matters here.

| File | Covers |
| --- | --- |
| `tests/leads.test.ts` | Create, update, delete, search, status-change logging, notification on assignment, conversion, and **transaction rollback** when conversion fails |
| `tests/clients.test.ts` | CRUD, derived revenue from won deals, active-project counting, cascade rules |
| `tests/deals.test.ts` | Stage transitions, probability, `closedAt`, won/lost activity types, pipeline totals, win rate |
| `tests/projects-tasks.test.ts` | Project rules, team replacement, and **progress recalculation** as tasks complete, reopen, move and get deleted |
| `tests/follow-ups.test.ts` | Scheduling, completion, lead `nextFollowUpAt` syncing, scope filters |
| `tests/dashboard.test.ts` | Every KPI against known data, empty-database safety, monthly bucketing |
| `tests/validation.test.ts` | Field errors, coercion, ranges, cross-field rules, and the partial-update regression below |

One test documents a bug worth knowing about. Zod's `.partial()` keeps
`.default()` values, so a `PATCH` sending only `{ projectId }` also re-applied
`status: "TODO"` — silently reopening completed tasks. `partialWithoutDefaults()`
in [`src/lib/validation/common.ts`](src/lib/validation/common.ts) strips the
defaults first, and the behaviour is pinned by a test.

---

## Project structure

```
agencyflow-crm/
├── prisma/
│   ├── schema.prisma            # 9 models + 1 join table
│   └── seed.ts                  # realistic demo agency
├── src/
│   ├── app/
│   │   ├── (app)/               # authenticated routes (one guard covers all)
│   │   │   ├── dashboard/ leads/ clients/ deals/
│   │   │   ├── projects/ tasks/ follow-ups/ reports/ settings/
│   │   │   ├── layout.tsx       # the auth boundary
│   │   │   ├── error.tsx        # route error boundary
│   │   │   └── not-found.tsx
│   │   ├── api/                 # REST route handlers
│   │   ├── login/
│   │   ├── layout.tsx           # theme applied server-side, no flash
│   │   └── globals.css          # all design tokens
│   ├── components/
│   │   ├── ui/                  # Button, Modal, Field, DataTable, ...
│   │   ├── charts/              # BarList, FunnelChart, TrendChart, ...
│   │   ├── layout/              # Sidebar, Topbar, GlobalSearch, notifications
│   │   └── leads|clients|deals|projects|tasks|follow-ups|settings/
│   ├── lib/
│   │   ├── constants.ts         # the domain vocabulary — single source of truth
│   │   ├── validation/          # Zod schemas shared by forms and API
│   │   ├── auth/                # session cookie + password hashing
│   │   ├── hooks/               # useQueryParams, useResourceMutation
│   │   └── utils.ts             # formatting helpers
│   └── server/
│       ├── services/            # all business logic (12 modules)
│       ├── errors.ts            # framework-free domain errors
│       ├── http.ts              # error → status code mapping
│       └── route-helpers.ts     # auth + error wrapper for route handlers
└── tests/                       # Vitest suites against a real SQLite file
```

Roughly 136 source files and 17,000 lines of TypeScript.

---

## Design decisions worth knowing

**Server components by default.** List pages read `searchParams`, run one query
and return finished HTML. Only six components ship meaningful client JavaScript:
the dialogs, the Kanban board, global search, the notification bell, the filter
bar and the theme controls.

**The URL is the state.** Filters, sort and pagination live in the query string.
No client-side store, and `/leads?status=QUALIFIED&sort=score` is a link you can
send someone.

**Preferences in a cookie, not localStorage.** The server can read a cookie, so
`<html>` arrives already carrying the right theme — no flash, no blocking
script — and server components can format money in the chosen currency.

**Chart colours are independent of the UI accent.** The accent is
user-switchable; chart meaning must not move with it. The chart palette is a
fixed pair validated for colour-vision deficiency and contrast against both the
light and dark surfaces. Single-series charts use one colour — bar length
already encodes magnitude, so shading by value would spend the colour channel
on information the chart is already showing.

**Errors are typed, not stringly.** Services throw `NotFoundError` /
`BusinessRuleError`; `server/http.ts` maps them to 404/400. Route handlers carry
no try/catch at all.

### Known limitations

- `notFound()` inside a streamed route renders the correct 404 UI but the HTTP
  status stays 200, because the shell has already been flushed. Cosmetic, and
  inherent to streaming SSR.
- Every signed-in user can see and edit all records. Roles are stored and
  displayed but not yet enforced — see below.
- `npm audit` reports advisories in the **Prisma CLI's** own transitive
  dependencies (`mysql2`, `deepmerge-ts`). They are `devDependencies` only, and
  this project uses SQLite, so that driver never loads.

---

## Future improvements

Roughly in the order I would tackle them:

1. **Role-based permissions** — enforce the `role` field so sales users see only their own pipeline. The service layer is the natural chokepoint.
2. **Versioned migrations** — replace `db push` with `prisma migrate` before any real deployment.
3. **Email integration** — log sent mail against a lead, and send the follow-up reminders that are currently in-app only.
4. **File attachments** — proposals and contracts on clients and projects.
5. **Real-time updates** — push activity and board changes over SSE so two people working the pipeline see each other's moves.
6. **Time tracking and invoicing** — hours against tasks, turning budgets into billing.
7. **Custom fields** — let each agency add their own lead and client attributes.
8. **End-to-end tests** — Playwright over the critical flows to complement the service-level suite.
9. **Postgres + deployment** — swap the provider, add a CI pipeline, deploy.

---

## License

[MIT](LICENSE) — free to use, modify and learn from.
