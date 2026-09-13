"use client";

import { useState, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Owns the one piece of layout state that has to be client-side: whether the
 * mobile navigation drawer is open. Everything inside `children` is still
 * rendered on the server.
 */
export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar user={user} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar user={user} onOpenSidebar={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[95rem] px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
