# AgencyFlow CRM — demo script

A 7–9 minute walkthrough. Every step below has been verified end to end against
a production build, so nothing here depends on luck.

**Before you record**

```bash
npm run db:seed     # back to a known, fully populated state
npm run build && npm start   # production build: no dev badge, faster navigation
```

Sign in as **sarah@agencyflow.dev** / **demo1234**. Use a 1440×900 window.
Keep the browser zoom at 100%.

The thread to hold onto: **one prospect travels from an inbound enquiry all the
way to delivered project work, and every screen updates itself as it goes.**

---

## 0 · Opening (0:00 – 0:30)

> "This is AgencyFlow, a CRM I built for digital agencies. It handles the full
> lifecycle: leads, the sales pipeline, clients, delivery projects, tasks and
> follow-ups. Next.js, TypeScript, Prisma and SQLite — it runs locally with one
> command and no external services."

Show the login screen, then sign in.

---

## 1 · Dashboard (0:30 – 1:45)

Point at the KPI row, then the charts.

> "Everything here is computed from the operational tables at request time —
> there's no summary table to go stale. Eight KPIs, six months of closed-won
> revenue, and the lead funnel."

Worth saying out loud:

- **Pipeline value** shows both the raw figure and a *weighted* one — each open deal counted at its stage's win probability.
- **Pending tasks** and **Upcoming follow-ups** turn red when something is overdue.
- Every tile is a link into the list it summarises.

Scroll to the activity feed at the bottom.

> "This feed is an audit trail. Every write in the app goes through a service
> layer, and that's the only thing that touches the database — so nothing can
> change without being recorded here."

---

## 2 · Leads, and validation (1:45 – 3:00)

Go to **Leads**.

> "Twenty-six prospects. Search, filters and sorting all live in the URL, so any
> view I'm looking at is a link I can send someone."

Type `hal` in the search box — show it filtering. Then set **Status: Qualified**.
Point out the URL changing. Click **Clear**.

Click **New lead** and press **Create lead** on the empty form.

> "Validation is one Zod schema shared by the form and the API — so the browser
> catches this instantly, and the server still checks it independently."

Now fill it in properly:

| Field | Value |
| --- | --- |
| Contact name | `Marcus Webb` |
| Company | `Zephyr Analytics` |
| Email | `marcus@zephyr.io` |
| Source | `Referral` |
| Industry | `Software` |
| Status | `Qualified` |
| Lead score | `88` |
| Expected deal value | `42000` |

Create it. Note the toast and the row appearing at the top.

---

## 3 · The lead record (3:00 – 3:45)

Click into **Marcus Webb**.

> "Contact details, the expected value, the score, and on the right the activity
> timeline for this specific record — the same component as the dashboard feed,
> just a different query."

Click **Edit**, change the score to `95`, save. Point out the tile updating.

---

## 4 · Conversion — the key moment (3:45 – 4:45)

Click **Convert to client**.

> "This is the hand-off from sales to delivery, and it's the most interesting
> piece of logic in the app. It creates the client, marks the lead as won, links
> the two, and optionally opens a won deal for the revenue — all inside one
> database transaction. If any part fails, none of it happens. There's a test
> that proves exactly that."

Pick an account manager, leave **Also create a won deal** ticked, convert.

You land on the new client page. Point at **Total revenue $42,000**.

> "That revenue figure isn't stored anywhere — it's summed from this client's
> won deals every time the page loads. A stored total would drift the moment
> someone edited a deal."

Optionally navigate back to the lead to show the **Converted to** badge.

---

## 5 · Pipeline (4:45 – 5:45)

Go to **Deals**.

> "Seven stages, every open deal on the board, column totals across the top."

**Drag a card** from one column to the next. Wait for the toast.

> "Dragging writes the change optimistically and then saves it. The service layer
> owns what a stage change *means* — the win probability snaps to the stage, a
> close date gets stamped on Won or Lost, an activity is recorded and the deal's
> owner is notified. Editing the stage in the form runs the exact same code, so
> the two can never disagree. If the save failed, the card would spring back."

Drag something into **Won** to show the success toast and the notification badge
incrementing.

Click **List** to show the same data as a sortable table.

---

## 6 · Projects and tasks (5:45 – 7:00)

Go to **Projects**.

> "Delivery work as cards — budget, deadline, progress and the staffed team."

Open a project that is in progress. Scroll to its task list.

**Tick a task checkbox.** Then scroll up to the progress bar.

> "That's the rule that makes this feel like a real CRM rather than a set of
> forms. Completing a task recalculates the project's progress percentage, which
> also moves the completion figure in Reports — no manual bookkeeping anywhere."

Tick a second one to show the bar move again.

---

## 7 · Follow-ups and notifications (7:00 – 7:45)

Go to **Follow-ups**.

> "Scheduled touchpoints against a lead or a client. Overdue ones are flagged in
> red."

Click **Schedule follow-up**, add one for a client, save. Tick it complete.

Open the **notification bell** in the top bar.

> "Two kinds of thing in here. Stored events — a lead assigned to you, a deal
> closing. And live alerts underneath: overdue tasks, follow-ups due, deadlines
> approaching. Those are recomputed on every read rather than stored, because a
> due date is a condition, not an event — so it can never be stale or duplicated."

---

## 8 · Reports (7:45 – 8:30)

Go to **Reports**.

> "Revenue, win rate, conversion and delivery throughput, over a three, six or
> twelve month window."

Switch **6m → 12m** to show the range change.

Scroll to **Team performance**.

> "Per person: revenue closed, pipeline owned, leads and tasks completed. All of
> it derived from the same tables everything else writes to."

---

## 9 · Search, theme and mobile (8:30 – 9:00)

Press **Ctrl/Cmd + K**, type `zephyr`, use the arrow keys and press Enter.

> "Global search across leads, clients, projects, deals and tasks — keyboard
> only."

Go to **Settings → Appearance**. Switch to **Light**, then back to **Dark**.
Change the accent colour.

> "Themed with CSS variables, and the choice is stored in a cookie so the server
> renders the right theme on the first byte — no flash. Chart colours stay fixed
> regardless of accent, because they carry meaning."

Finally, narrow the window to phone width to show the responsive layout.

---

## Closing (9:00 – 9:30)

> "Under the hood: server components do the rendering, all the business logic
> sits in a service layer that's the only thing allowed to write, and sixty-nine
> tests run against a real database covering the transitions I showed — the
> conversion transaction, the stage rules, the progress recalculation and the
> dashboard maths."

Optionally run `npm test` on camera. It takes about 20 seconds.

---

## Things to avoid on camera

- Don't demo in `npm run dev` if you can avoid it — production navigation is much snappier.
- Don't delete a client you plan to show later; it cascades to its projects and tasks.
- If a form misbehaves mid-take, `npm run db:seed` puts everything back in seconds.
