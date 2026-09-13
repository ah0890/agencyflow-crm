import {
  Briefcase,
  CheckSquare,
  Contact,
  KanbanSquare,
  LayoutDashboard,
  PhoneCall,
  PieChart,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the sidebar, the mobile drawer and the quick-add
 * menu. Adding a section means adding one entry here.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Marks the section for the "..." group heading in the sidebar. */
  group: "overview" | "sales" | "delivery" | "system";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "overview" },
  { href: "/leads", label: "Leads", icon: Contact, group: "sales" },
  { href: "/clients", label: "Clients", icon: Users, group: "sales" },
  { href: "/deals", label: "Deals", icon: KanbanSquare, group: "sales" },
  { href: "/projects", label: "Projects", icon: Briefcase, group: "delivery" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, group: "delivery" },
  { href: "/follow-ups", label: "Follow-ups", icon: PhoneCall, group: "delivery" },
  { href: "/reports", label: "Reports", icon: PieChart, group: "system" },
  { href: "/settings", label: "Settings", icon: Settings, group: "system" },
];

export const NAV_GROUPS: Array<{ id: NavItem["group"]; label: string | null }> = [
  { id: "overview", label: null },
  { id: "sales", label: "Sales" },
  { id: "delivery", label: "Delivery" },
  { id: "system", label: "Insights" },
];

/** Entities the quick-add button can create. */
export const QUICK_ADD = [
  { key: "lead", label: "New lead", href: "/leads?new=1" },
  { key: "client", label: "New client", href: "/clients?new=1" },
  { key: "deal", label: "New deal", href: "/deals?new=1" },
  { key: "project", label: "New project", href: "/projects?new=1" },
  { key: "task", label: "New task", href: "/tasks?new=1" },
  { key: "followUp", label: "New follow-up", href: "/follow-ups?new=1" },
] as const;

/** Highlight a nav item for its own page and any detail page beneath it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
