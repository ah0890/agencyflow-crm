import type { Metadata } from "next";
import { listLeads, LEAD_SORT_OPTIONS } from "@/server/services/leads";
import { getUserOptions } from "@/server/services/users";
import { getCurrentUser } from "@/lib/auth/session";
import { getServerPreferences } from "@/lib/preferences.server";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { LeadsTable, NewLeadButton } from "@/components/leads/LeadsTable";

export const metadata: Metadata = { title: "Leads" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Leads list.
 *
 * Filters, search, sort and page all live in the URL, so this server component
 * reads them, runs one query, and returns finished HTML. Every filtered view is
 * a shareable link and survives a refresh.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [result, users, user, preferences] = await Promise.all([
    listLeads({
      q: one(params.q),
      status: one(params.status),
      source: one(params.source),
      ownerId: one(params.ownerId),
      sort: one(params.sort),
      page: Number(one(params.page) ?? 1) || 1,
    }),
    getUserOptions(),
    getCurrentUser(),
    getServerPreferences(),
  ]);

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${result.total} prospects in the pipeline`}
        actions={
          <NewLeadButton users={users} currentUserId={user?.id ?? ""} />
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search name, company or email..."
          filters={[
            { key: "status", label: "Status", options: LEAD_STATUSES },
            { key: "source", label: "Source", options: LEAD_SOURCES },
            { key: "ownerId", label: "Owner", options: users },
          ]}
          sortOptions={LEAD_SORT_OPTIONS}
        />

        <LeadsTable
          rows={result.items}
          users={users}
          currentUserId={user?.id ?? ""}
          currency={preferences.currency}
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
