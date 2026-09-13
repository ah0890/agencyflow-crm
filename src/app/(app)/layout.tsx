import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

/**
 * The authentication boundary for the whole application.
 *
 * Every page in the (app) route group renders inside this layout, so a single
 * check here protects all of them - there is no route that can forget to guard
 * itself.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
