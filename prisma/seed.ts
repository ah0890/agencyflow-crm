/**
 * Demo data for AgencyFlow CRM.
 *
 * Run with `npm run db:seed`. The script is idempotent: it wipes every table
 * first, then rebuilds a realistic agency in a fixed shape so the dashboard,
 * pipeline and reports all look populated immediately after install.
 *
 * Dates are generated relative to "today", so the demo never looks stale no
 * matter when it is run. A seeded PRNG keeps the output reproducible.
 */

import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

/** Deterministic PRNG (mulberry32) so every seed run produces the same demo. */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260913);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function between(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const NOW = new Date();

function daysAgo(days: number, hour = 10): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hour, between(0, 59), 0, 0);
  return d;
}

function daysAhead(days: number, hour = 10): Date {
  return daysAgo(-days, hour);
}

function monthsAgo(months: number, day = 15): Date {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() - months, day, 12, 0, 0);
  return d;
}

/* -------------------------------------------------------------------------- */
/*                                    Data                                    */
/* -------------------------------------------------------------------------- */

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

const USERS = [
  {
    name: "Sarah Mitchell",
    email: "sarah@agencyflow.dev",
    role: "OWNER",
    jobTitle: "Founder & Managing Director",
    avatarColor: "#6366f1",
  },
  {
    name: "Daniel Okoro",
    email: "daniel@agencyflow.dev",
    role: "SALES",
    jobTitle: "Head of New Business",
    avatarColor: "#06b6d4",
  },
  {
    name: "Priya Raman",
    email: "priya@agencyflow.dev",
    role: "SALES",
    jobTitle: "Account Executive",
    avatarColor: "#a855f7",
  },
  {
    name: "Marcus Feld",
    email: "marcus@agencyflow.dev",
    role: "PROJECT_MANAGER",
    jobTitle: "Delivery Lead",
    avatarColor: "#10b981",
  },
  {
    name: "Elena Rossi",
    email: "elena@agencyflow.dev",
    role: "PROJECT_MANAGER",
    jobTitle: "Senior Project Manager",
    avatarColor: "#f59e0b",
  },
  {
    name: "Tom Whitaker",
    email: "tom@agencyflow.dev",
    role: "ADMIN",
    jobTitle: "Operations Manager",
    avatarColor: "#ef4444",
  },
];

const CLIENTS = [
  {
    name: "Northwind Interiors",
    contactName: "Helen Carver",
    email: "helen@northwindinteriors.com",
    phone: "+44 20 7946 0112",
    website: "https://northwindinteriors.com",
    industry: "Retail & Furniture",
    status: "ACTIVE",
    address: "42 Shoreditch High St, London E1 6PN",
    notes: "Retainer client since 2024. Quarterly campaign reviews.",
  },
  {
    name: "Lumen Health",
    contactName: "Dr. Amara Blake",
    email: "amara@lumenhealth.io",
    phone: "+1 415 555 0184",
    website: "https://lumenhealth.io",
    industry: "Healthcare",
    status: "ACTIVE",
    address: "1200 Market St, San Francisco, CA 94102",
    notes: "HIPAA considerations on all content. Slow legal review cycles.",
  },
  {
    name: "Verdant Coffee Roasters",
    contactName: "Joel Mbeki",
    email: "joel@verdantroasters.com",
    phone: "+1 503 555 0147",
    website: "https://verdantroasters.com",
    industry: "Food & Beverage",
    status: "ACTIVE",
    address: "88 Alberta Ave, Portland, OR 97211",
    notes: "E-commerce replatform completed. Now on a growth retainer.",
  },
  {
    name: "Atlas Freight Group",
    contactName: "Karl Jensen",
    email: "k.jensen@atlasfreight.com",
    phone: "+49 40 5550 2231",
    website: "https://atlasfreight.com",
    industry: "Logistics",
    status: "ACTIVE",
    address: "Hafenstrasse 14, 20359 Hamburg",
    notes: "Enterprise procurement. Invoices via portal, net 45.",
  },
  {
    name: "Solace Wellness Studio",
    contactName: "Nadia Hassan",
    email: "nadia@solacewellness.co",
    phone: "+971 4 555 0190",
    website: "https://solacewellness.co",
    industry: "Fitness & Wellness",
    status: "ACTIVE",
    address: "Al Wasl Rd, Dubai",
    notes: "Very responsive. Great candidate for a case study.",
  },
  {
    name: "Brightpath Education",
    contactName: "Michael Osei",
    email: "michael@brightpath.edu.gh",
    phone: "+233 30 255 0123",
    website: "https://brightpath.edu.gh",
    industry: "Education",
    status: "ACTIVE",
    address: "Ring Road East, Accra",
    notes: "Budget cycles align to the academic year.",
  },
  {
    name: "Ironclad Legal",
    contactName: "Ruth Vandermeer",
    email: "r.vandermeer@ironcladlegal.com",
    phone: "+1 212 555 0166",
    website: "https://ironcladlegal.com",
    industry: "Professional Services",
    status: "ON_HOLD",
    address: "500 Fifth Ave, New York, NY 10110",
    notes: "Paused pending internal restructure. Revisit next quarter.",
  },
  {
    name: "Kestrel Outdoor Co.",
    contactName: "Ben Alvarez",
    email: "ben@kestreloutdoor.com",
    phone: "+1 720 555 0138",
    website: "https://kestreloutdoor.com",
    industry: "Apparel & Outdoor",
    status: "ACTIVE",
    address: "1450 Pearl St, Boulder, CO 80302",
    notes: "Seasonal spend. Heavy Q3/Q4 paid media.",
  },
  {
    name: "Meridian Capital Partners",
    contactName: "Yuki Tanaka",
    email: "y.tanaka@meridiancp.com",
    phone: "+65 6555 0177",
    website: "https://meridiancp.com",
    industry: "Financial Services",
    status: "PROSPECT",
    address: "1 Raffles Place, Singapore 048616",
    notes: "Brand refresh proposal under review by the partners.",
  },
  {
    name: "Fable & Thread",
    contactName: "Imogen Price",
    email: "imogen@fableandthread.co.uk",
    phone: "+44 161 555 0154",
    website: "https://fableandthread.co.uk",
    industry: "Fashion & Lifestyle",
    status: "CHURNED",
    address: "12 Northern Quarter, Manchester M4 1LZ",
    notes: "Moved work in-house after their Series A. Left on good terms.",
  },
];

const LEADS = [
  ["Grace Lindqvist", "Halcyon Hotels", "Hospitality", "REFERRAL", "NEGOTIATION", 88, 68000],
  ["Owen Castellanos", "Pivot Robotics", "Manufacturing", "EVENT", "PROPOSAL_SENT", 76, 52000],
  ["Amelia Strand", "Truewell Organics", "Food & Beverage", "WEBSITE", "QUALIFIED", 71, 34000],
  ["Rohan Mehta", "Anchorpoint Realty", "Real Estate", "COLD_OUTREACH", "CONTACTED", 54, 28000],
  ["Beatrice Coleman", "Silverline Dental", "Healthcare", "ADVERTISING", "NEW", 42, 18500],
  ["Kwame Adjei", "Motion Athletics", "Sportswear", "SOCIAL_MEDIA", "QUALIFIED", 79, 46000],
  ["Linnea Berg", "Nordic Timber Co.", "Manufacturing", "PARTNER", "CONTACTED", 61, 39000],
  ["Diego Fuentes", "Casa Verde Travel", "Travel & Tourism", "WEBSITE", "NEW", 48, 22000],
  ["Farah Nasser", "Zenith Aesthetics", "Healthcare", "REFERRAL", "PROPOSAL_SENT", 83, 57000],
  ["Isaac Brennan", "Loop Fintech", "Financial Services", "EVENT", "NEGOTIATION", 90, 96000],
  ["Chloe Dubois", "Maison Lumière", "Home & Decor", "SOCIAL_MEDIA", "CONTACTED", 58, 31000],
  ["Samuel Achebe", "GreenGrid Energy", "Energy", "COLD_OUTREACH", "QUALIFIED", 73, 74000],
  ["Hannah Pike", "Bookbarn Collective", "Retail", "WEBSITE", "NEW", 39, 14000],
  ["Viktor Novak", "Prague Print House", "Printing", "PARTNER", "LOST", 33, 16000],
  ["Nina Alvarado", "Tidewater Marine", "Marine Services", "REFERRAL", "WON", 85, 61000],
  ["Julian Reyes", "Stackhouse Analytics", "Software", "ADVERTISING", "CONTACTED", 66, 43000],
  ["Maya Sorensen", "Petalworks Florists", "Retail", "SOCIAL_MEDIA", "NEW", 45, 12500],
  ["Tobias Krause", "Alpine Sportswear", "Sportswear", "EVENT", "QUALIFIED", 68, 38000],
  ["Ayesha Malik", "Crescent Foods", "Food & Beverage", "WEBSITE", "PROPOSAL_SENT", 77, 49000],
  ["Peter Hollis", "Hollis & Sons Brewery", "Food & Beverage", "COLD_OUTREACH", "LOST", 29, 21000],
  ["Sofia Bianchi", "Terracotta Ceramics", "Home & Decor", "REFERRAL", "CONTACTED", 63, 26000],
  ["Nathan Cole", "Summit Legal Group", "Professional Services", "PARTNER", "NEW", 51, 35000],
  ["Zara Okonjo", "Beacon Childcare", "Education", "WEBSITE", "QUALIFIED", 70, 29500],
  ["Lars Pedersen", "Fjord Logistics", "Logistics", "COLD_OUTREACH", "NEW", 44, 58000],
  ["Rachel Kim", "Hearthstone Bakery", "Food & Beverage", "SOCIAL_MEDIA", "CONTACTED", 57, 17500],
  ["Ahmed Farouk", "Dunes Resort Group", "Hospitality", "EVENT", "WON", 87, 82000],
] as const;

const LEAD_NOTES = [
  "Wants a full site rebuild before their trade show in the autumn.",
  "Current agency contract expires in three months. Timing is good.",
  "Budget confirmed by the CFO. Waiting on a scope of work.",
  "Interested but wants to see two comparable case studies first.",
  "Warm intro from an existing client. Very engaged on the first call.",
  "Asked specifically about conversion rate optimisation and analytics.",
  "Needs multilingual support - flag to the dev team when scoping.",
  "Price sensitive. Positioned the mid-tier retainer as the entry point.",
];

const PROJECT_BLUEPRINTS = [
  ["Website Redesign & Build", "WEB_DEVELOPMENT", "Full rebuild on a headless CMS with a new design system."],
  ["SEO Growth Retainer", "SEO", "Technical SEO fixes, content roadmap and monthly reporting."],
  ["Brand Identity Refresh", "BRANDING", "New logo suite, typography, colour system and brand guidelines."],
  ["Q4 Paid Media Campaign", "PAID_ADS", "Google and Meta campaigns targeting the holiday season."],
  ["Social Content Programme", "SOCIAL_MEDIA", "Twelve posts per month plus community management."],
  ["Shopify Store Migration", "ECOMMERCE", "Migrate from WooCommerce, rebuild checkout and product pages."],
  ["Content Marketing Engine", "CONTENT_MARKETING", "Long-form articles, lead magnets and an email nurture sequence."],
  ["Customer Portal App", "MOBILE_APP", "React Native client portal with document upload and messaging."],
  ["Conversion Rate Optimisation", "WEB_DEVELOPMENT", "Ongoing A/B testing programme across key landing pages."],
  ["Annual Report Microsite", "WEB_DEVELOPMENT", "Interactive microsite with data visualisations."],
  ["Local SEO Expansion", "SEO", "Location pages and Google Business Profile optimisation for 12 sites."],
  ["Rebrand Rollout", "BRANDING", "Apply the new identity across web, print and packaging."],
  ["Lifecycle Email Programme", "CONTENT_MARKETING", "Welcome, win-back and post-purchase automation flows."],
  ["Performance Audit & Fixes", "WEB_DEVELOPMENT", "Core Web Vitals remediation and image pipeline rework."],
];

const TASK_TITLES = [
  "Kick-off call with the client",
  "Draft the information architecture",
  "Wireframe the key templates",
  "Design the homepage concept",
  "Client review round one",
  "Build the component library",
  "Integrate the CMS",
  "Write the page copy",
  "Set up analytics and goal tracking",
  "Technical SEO audit",
  "Fix Core Web Vitals issues",
  "Accessibility pass (WCAG AA)",
  "Cross-browser QA",
  "Populate staging content",
  "Client UAT sign-off",
  "Deploy to production",
  "Post-launch monitoring",
  "Prepare the monthly report",
  "Refresh ad creative",
  "Keyword gap analysis",
  "Competitor teardown",
  "Set up conversion tracking",
  "Schedule the social calendar",
  "Photography shot list",
  "Handover documentation",
];

const FOLLOWUP_TITLES = [
  "Discovery call",
  "Send the proposal deck",
  "Contract review call",
  "Quarterly business review",
  "Check in on the campaign results",
  "Chase the signed statement of work",
  "Demo the staging site",
  "Renewal conversation",
  "Introduce the delivery team",
  "Share the case study",
];

/* -------------------------------------------------------------------------- */
/*                                    Seed                                    */
/* -------------------------------------------------------------------------- */

async function clearDatabase() {
  // Order matters: children before parents.
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Seeding AgencyFlow CRM demo data...");
  await clearDatabase();

  /* ---------------------------------- users --------------------------------- */
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];
  for (const u of USERS) {
    users.push(
      await prisma.user.create({
        data: { ...u, passwordHash, createdAt: daysAgo(between(400, 700)) },
      }),
    );
  }
  const [sarah, daniel, priya, marcus, elena] = users;
  const salesTeam = [daniel!, priya!, sarah!];
  const pmTeam = [marcus!, elena!];
  console.log(`  ${users.length} users`);

  /* --------------------------------- clients -------------------------------- */
  const clients = [];
  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i]!;
    clients.push(
      await prisma.client.create({
        data: {
          ...c,
          accountManagerId: pick(pmTeam).id,
          createdAt: daysAgo(between(60, 540)),
        },
      }),
    );
  }
  console.log(`  ${clients.length} clients`);

  /* ---------------------------------- leads --------------------------------- */
  const leads = [];
  for (let i = 0; i < LEADS.length; i++) {
    const [name, company, industry, source, status, score, value] = LEADS[i]!;
    const createdAt = daysAgo(between(1, 120));
    const isOpen = status !== "WON" && status !== "LOST";

    leads.push(
      await prisma.lead.create({
        data: {
          name,
          company,
          industry,
          source,
          status,
          score,
          estimatedValue: value,
          email: `${name.split(" ")[0]!.toLowerCase()}@${company
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 18)}.com`,
          phone: `+1 ${between(200, 989)} 555 0${between(100, 199)}`,
          notes: pick(LEAD_NOTES),
          // Only open leads carry a next action; keep a few overdue so the
          // notification bell has something real to show.
          nextFollowUpAt: isOpen
            ? between(0, 4) === 0
              ? daysAgo(between(1, 5), 9)
              : daysAhead(between(0, 21), 9)
            : null,
          convertedAt: status === "WON" ? daysAgo(between(5, 40)) : null,
          ownerId: pick(salesTeam).id,
          createdAt,
          updatedAt: createdAt,
        },
      }),
    );
  }
  // Point the won leads at a real client so the "converted" relation is
  // populated in the demo data, not just the status column.
  const wonLeads = leads.filter((l) => l.status === "WON");
  for (let i = 0; i < wonLeads.length; i++) {
    const lead = wonLeads[i]!;
    const client = clients[i % clients.length]!;
    await prisma.lead.update({
      where: { id: lead.id },
      data: { convertedClientId: client.id },
    });
    lead.convertedClientId = client.id;
  }

  console.log(`  ${leads.length} leads (${wonLeads.length} converted)`);

  /* ---------------------------------- deals --------------------------------- */
  const STAGE_PROB: Record<string, number> = {
    NEW: 10,
    CONTACTED: 20,
    QUALIFIED: 40,
    PROPOSAL: 60,
    NEGOTIATION: 80,
    WON: 100,
    LOST: 0,
  };

  const deals = [];

  // Open pipeline, spread across the board so every Kanban column has cards.
  const openPlan: Array<[string, number]> = [
    ["NEW", 3],
    ["CONTACTED", 3],
    ["QUALIFIED", 4],
    ["PROPOSAL", 3],
    ["NEGOTIATION", 3],
  ];

  let leadCursor = 0;
  for (const [stage, count] of openPlan) {
    for (let i = 0; i < count; i++) {
      const lead = leads[leadCursor % leads.length]!;
      leadCursor++;
      const createdAt = daysAgo(between(3, 90));
      deals.push(
        await prisma.deal.create({
          data: {
            title: `${lead.company} - ${pick(PROJECT_BLUEPRINTS)[0]}`,
            company: lead.company,
            contactName: lead.name,
            value: Math.round(lead.estimatedValue / 500) * 500 || between(20, 90) * 1000,
            stage,
            probability: STAGE_PROB[stage]!,
            expectedCloseDate: daysAhead(between(5, 75)),
            position: i,
            ownerId: lead.ownerId,
            leadId: lead.id,
            notes: "Scope discussed on the last call. Awaiting written sign-off.",
            createdAt,
            updatedAt: createdAt,
          },
        }),
      );
    }
  }

  // Won deals spread over the last six months so the revenue chart has a trend.
  const wonPerMonth = [4, 3, 5, 4, 6, 3];
  for (let m = 0; m < wonPerMonth.length; m++) {
    for (let i = 0; i < wonPerMonth[m]!; i++) {
      const client = clients[between(0, clients.length - 1)]!;
      const closedAt = monthsAgo(m, between(3, 27));
      const blueprint = pick(PROJECT_BLUEPRINTS);
      deals.push(
        await prisma.deal.create({
          data: {
            title: `${client.name} - ${blueprint[0]}`,
            company: client.name,
            contactName: client.contactName,
            value: between(12, 95) * 1000,
            stage: "WON",
            probability: 100,
            expectedCloseDate: closedAt,
            closedAt,
            position: i,
            ownerId: pick(salesTeam).id,
            clientId: client.id,
            createdAt: new Date(closedAt.getTime() - between(20, 70) * 86_400_000),
            updatedAt: closedAt,
          },
        }),
      );
    }
  }

  // A handful of losses so the win-rate report is not a flat 100%.
  for (let i = 0; i < 7; i++) {
    const lead = leads[(leadCursor + i) % leads.length]!;
    const closedAt = daysAgo(between(10, 150));
    deals.push(
      await prisma.deal.create({
        data: {
          title: `${lead.company} - ${pick(PROJECT_BLUEPRINTS)[0]}`,
          company: lead.company,
          contactName: lead.name,
          value: between(8, 60) * 1000,
          stage: "LOST",
          probability: 0,
          expectedCloseDate: closedAt,
          closedAt,
          position: i,
          ownerId: pick(salesTeam).id,
          leadId: lead.id,
          notes: pick([
            "Went with a cheaper freelancer.",
            "Project shelved after a budget freeze.",
            "Lost to an incumbent agency.",
            "No response after the proposal. Marked closed.",
          ]),
          createdAt: new Date(closedAt.getTime() - between(15, 60) * 86_400_000),
          updatedAt: closedAt,
        },
      }),
    );
  }
  console.log(`  ${deals.length} deals`);

  /* -------------------------------- projects -------------------------------- */
  const activeClients = clients.filter((c) => c.status === "ACTIVE");
  const statusPlan = [
    "IN_PROGRESS",
    "IN_PROGRESS",
    "IN_PROGRESS",
    "IN_PROGRESS",
    "IN_PROGRESS",
    "PLANNING",
    "PLANNING",
    "PLANNING",
    "ON_HOLD",
    "COMPLETED",
    "COMPLETED",
    "COMPLETED",
    "COMPLETED",
    "CANCELLED",
  ];

  const projects = [];
  for (let i = 0; i < PROJECT_BLUEPRINTS.length; i++) {
    const [name, type, description] = PROJECT_BLUEPRINTS[i]!;
    const status = statusPlan[i] ?? "IN_PROGRESS";
    const client = activeClients[i % activeClients.length]!;
    const startDate = daysAgo(between(20, 200));
    const deadline = daysAhead(between(-40, 90));
    const completed = status === "COMPLETED";

    const project = await prisma.project.create({
      data: {
        name,
        type,
        description,
        status,
        priority: pick(["LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "URGENT"]),
        budget: between(8, 120) * 1000,
        progress: completed
          ? 100
          : status === "PLANNING"
            ? between(0, 15)
            : status === "CANCELLED"
              ? between(10, 40)
              : between(25, 90),
        startDate,
        deadline: completed ? daysAgo(between(5, 60)) : deadline,
        completedAt: completed ? daysAgo(between(2, 50)) : null,
        clientId: client.id,
        managerId: pick(pmTeam).id,
        createdAt: startDate,
      },
    });

    // Staff two or three people onto each project.
    const memberPool = users.filter((u) => u.id !== project.managerId);
    const memberCount = between(2, 3);
    const chosen = new Set<string>();
    while (chosen.size < memberCount) {
      chosen.add(pick(memberPool).id);
    }
    for (const userId of chosen) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId, role: "CONTRIBUTOR" },
      });
    }

    projects.push(project);
  }
  console.log(`  ${projects.length} projects`);

  /* ---------------------------------- tasks --------------------------------- */
  let taskCount = 0;
  for (const project of projects) {
    const count = between(3, 6);
    const titles = [...TASK_TITLES].sort(() => rng() - 0.5).slice(0, count);

    for (let i = 0; i < titles.length; i++) {
      const projectDone = project.status === "COMPLETED";
      const status = projectDone
        ? "COMPLETED"
        : pick([
            "TODO",
            "TODO",
            "IN_PROGRESS",
            "IN_PROGRESS",
            "REVIEW",
            "COMPLETED",
            "COMPLETED",
          ]);
      const isDone = status === "COMPLETED";
      // Leave a few open tasks in the past so "Overdue" states are visible.
      const dueDate = isDone
        ? daysAgo(between(3, 60))
        : between(0, 5) === 0
          ? daysAgo(between(1, 9))
          : daysAhead(between(0, 30));

      await prisma.task.create({
        data: {
          title: titles[i]!,
          description:
            rng() > 0.55
              ? "Agreed in the last status call. See the shared brief for detail."
              : null,
          status,
          priority: pick(["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"]),
          dueDate,
          completedAt: isDone ? daysAgo(between(1, 40)) : null,
          projectId: project.id,
          assigneeId: pick(users).id,
          createdAt: daysAgo(between(30, 120)),
        },
      });
      taskCount++;
    }
  }

  // A few standalone tasks that are not tied to a project.
  for (let i = 0; i < 5; i++) {
    await prisma.task.create({
      data: {
        title: pick([
          "Update the agency portfolio site",
          "Renew the design software licences",
          "Write the Q3 new-business report",
          "Refresh the proposal template",
          "Book the team offsite",
        ]),
        status: pick(["TODO", "IN_PROGRESS", "REVIEW"]),
        priority: pick(["LOW", "MEDIUM", "HIGH"]),
        dueDate: daysAhead(between(1, 25)),
        assigneeId: pick(users).id,
        createdAt: daysAgo(between(1, 30)),
      },
    });
    taskCount++;
  }
  console.log(`  ${taskCount} tasks`);

  /* -------------------------------- follow-ups ------------------------------ */
  const openLeads = leads.filter(
    (l) => l.status !== "WON" && l.status !== "LOST",
  );
  let followUpCount = 0;

  // Upcoming follow-ups against leads.
  for (let i = 0; i < 10; i++) {
    const lead = openLeads[i % openLeads.length]!;
    await prisma.followUp.create({
      data: {
        title: pick(FOLLOWUP_TITLES),
        type: pick(["CALL", "EMAIL", "MEETING", "DEMO", "CHECK_IN"]),
        notes: "Confirm the scope and the decision timeline.",
        dueAt: i < 3 ? daysAgo(between(1, 4), 14) : daysAhead(between(0, 18), 14),
        ownerId: lead.ownerId,
        leadId: lead.id,
        createdAt: daysAgo(between(2, 25)),
      },
    });
    followUpCount++;
  }

  // Client check-ins, including some already completed.
  for (let i = 0; i < 10; i++) {
    const client = clients[i % clients.length]!;
    const done = i % 3 === 0;
    const dueAt = done ? daysAgo(between(3, 30), 11) : daysAhead(between(1, 25), 11);
    await prisma.followUp.create({
      data: {
        title: pick(FOLLOWUP_TITLES),
        type: pick(["MEETING", "CALL", "CHECK_IN", "EMAIL"]),
        notes: "Review performance against the agreed KPIs.",
        dueAt,
        completed: done,
        completedAt: done ? dueAt : null,
        outcome: done ? "Went well. Client happy with progress." : null,
        ownerId: client.accountManagerId,
        clientId: client.id,
        createdAt: daysAgo(between(5, 45)),
      },
    });
    followUpCount++;
  }
  console.log(`  ${followUpCount} follow-ups`);

  /* -------------------------------- activities ------------------------------ */
  const activities: Array<{
    type: string;
    message: string;
    detail?: string | null;
    userId: string;
    leadId?: string;
    clientId?: string;
    dealId?: string;
    projectId?: string;
    createdAt: Date;
  }> = [];

  for (const lead of leads.slice(0, 18)) {
    activities.push({
      type: "LEAD_CREATED",
      message: `Lead ${lead.name} from ${lead.company} was added`,
      detail: `Source: ${lead.source}`,
      userId: lead.ownerId,
      leadId: lead.id,
      createdAt: lead.createdAt,
    });
    if (lead.status !== "NEW") {
      activities.push({
        type: "LEAD_STATUS_CHANGED",
        message: `${lead.company} moved to ${lead.status.replace("_", " ").toLowerCase()}`,
        detail: `New -> ${lead.status}`,
        userId: lead.ownerId,
        leadId: lead.id,
        createdAt: new Date(lead.createdAt.getTime() + 86_400_000 * between(1, 14)),
      });
    }
  }

  for (const client of clients) {
    activities.push({
      type: "CLIENT_CREATED",
      message: `${client.name} became a client`,
      detail: client.industry,
      userId: client.accountManagerId,
      clientId: client.id,
      createdAt: client.createdAt,
    });
  }

  for (const deal of deals.slice(0, 24)) {
    activities.push({
      type: "DEAL_CREATED",
      message: `Deal opened: ${deal.title}`,
      detail: `Value ${deal.value}`,
      userId: deal.ownerId,
      dealId: deal.id,
      createdAt: deal.createdAt,
    });
    if (deal.stage === "WON") {
      activities.push({
        type: "DEAL_WON",
        message: `Deal won: ${deal.title}`,
        detail: `Closed at ${deal.value}`,
        userId: deal.ownerId,
        dealId: deal.id,
        createdAt: deal.closedAt ?? deal.updatedAt,
      });
    }
  }

  for (const project of projects) {
    activities.push({
      type: "PROJECT_CREATED",
      message: `Project started: ${project.name}`,
      detail: project.type,
      userId: project.managerId,
      projectId: project.id,
      createdAt: project.createdAt,
    });
  }

  for (const a of activities) {
    await prisma.activity.create({ data: a });
  }
  console.log(`  ${activities.length} activities`);

  /* ------------------------------ notifications ----------------------------- */
  const overdueTasks = await prisma.task.count({
    where: { status: { not: "COMPLETED" }, dueDate: { lt: NOW } },
  });
  const dueFollowUps = await prisma.followUp.count({
    where: { completed: false, dueAt: { lte: daysAhead(2) } },
  });

  const notifications = [
    {
      title: "Follow-ups need attention",
      body: `${dueFollowUps} follow-ups are due in the next 48 hours.`,
      type: "FOLLOWUP_DUE",
      level: "WARNING",
      link: "/follow-ups",
      createdAt: daysAgo(0, 8),
    },
    {
      title: "Overdue tasks",
      body: `${overdueTasks} tasks are past their due date.`,
      type: "TASK_OVERDUE",
      level: "DANGER",
      link: "/tasks",
      createdAt: daysAgo(0, 9),
    },
    {
      title: "New lead assigned to you",
      body: "Isaac Brennan from Loop Fintech is in negotiation - worth a call today.",
      type: "LEAD_ASSIGNED",
      level: "INFO",
      link: "/leads",
      createdAt: daysAgo(1, 16),
    },
    {
      title: "Deal moved to Negotiation",
      body: "Halcyon Hotels - Website Redesign & Build advanced a stage.",
      type: "DEAL_STAGE_CHANGED",
      level: "SUCCESS",
      link: "/deals",
      createdAt: daysAgo(1, 11),
    },
    {
      title: "Project deadline approaching",
      body: "Q4 Paid Media Campaign is due within the week.",
      type: "PROJECT_DEADLINE",
      level: "WARNING",
      link: "/projects",
      createdAt: daysAgo(2, 15),
    },
    {
      title: "Monthly report ready",
      body: "Your pipeline summary for last month is available in Reports.",
      type: "SYSTEM",
      level: "INFO",
      link: "/reports",
      read: true,
      createdAt: daysAgo(4, 10),
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: { ...n, userId: sarah!.id },
    });
  }
  console.log(`  ${notifications.length} notifications`);

  console.log("\nDone. Sign in with:");
  console.log(`  email:    ${USERS[0]!.email}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
