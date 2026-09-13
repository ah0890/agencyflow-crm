import type { Metadata } from "next";
import {
  getFollowUpCounts,
  listFollowUps,
} from "@/server/services/follow-ups";
import { getLeadOptions } from "@/server/services/leads";
import { getClientOptions } from "@/server/services/clients";
import { getUserOptions } from "@/server/services/users";
import { getCurrentUser } from "@/lib/auth/session";
import { FOLLOWUP_TYPES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { ScopeTabs } from "@/components/ui/ScopeTabs";
import {
  FollowUpsList,
  NewFollowUpButton,
} from "@/components/follow-ups/FollowUpsList";

export const metadata: Metadata = { title: "Follow-ups" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [result, counts, leads, clients, users, user] = await Promise.all([
    listFollowUps({
      q: one(params.q),
      type: one(params.type),
      ownerId: one(params.ownerId),
      scope: one(params.scope),
      page: Number(one(params.page) ?? 1) || 1,
    }),
    getFollowUpCounts(),
    getLeadOptions(),
    getClientOptions(),
    getUserOptions(),
    getCurrentUser(),
  ]);

  const scopes = [
    { value: "", label: "Upcoming" },
    { value: "overdue", label: `Overdue (${counts.overdue})` },
    { value: "completed", label: "Completed" },
    { value: "all", label: "All" },
  ];

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={`${counts.upcoming} due in the next 7 days · ${counts.overdue} overdue`}
        actions={
          <NewFollowUpButton
            leads={leads}
            clients={clients}
            users={users}
            currentUserId={user?.id ?? ""}
          />
        }
      />

      <Card>
        <ScopeTabs param="scope" options={scopes} />

        <FilterBar
          searchPlaceholder="Search follow-ups..."
          filters={[
            { key: "type", label: "Type", options: FOLLOWUP_TYPES },
            { key: "ownerId", label: "Owner", options: users },
          ]}
        />

        <FollowUpsList
          rows={result.items}
          leads={leads}
          clients={clients}
          users={users}
          currentUserId={user?.id ?? ""}
        />

        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
        />
      </Card>
    </>
  );
}
