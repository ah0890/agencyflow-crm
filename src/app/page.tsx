import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/** Send people to the dashboard when signed in, otherwise to the login page. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
