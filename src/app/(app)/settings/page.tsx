import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getUsers } from "@/server/services/users";
import { USER_ROLES, optionOf } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const team = await getUsers();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, how AgencyFlow looks, and what it notifies you about"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSettings user={user} />
        <PreferencesSettings />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Team"
          description={`${team.length} active people in this workspace`}
        />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => {
            const role = optionOf(USER_ROLES, member.role);
            return (
              <div
                key={member.id}
                className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3"
              >
                <Avatar
                  name={member.name}
                  color={member.avatarColor}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {member.name}
                    {member.id === user.id ? (
                      <span className="ml-1.5 text-xs text-[var(--text-subtle)]">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-[var(--text-subtle)]">
                    {member.email}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={role.tone}>{role.label}</Badge>
                    <span className="text-[10px] text-[var(--text-subtle)]">
                      {member._count.leads} leads · {member._count.deals} deals
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}
