import type { Metadata } from "next";
import { CLIENT_SORT_OPTIONS, listClients } from "@/server/services/clients";
import { getUserOptions } from "@/server/services/users";
import { getCurrentUser } from "@/lib/auth/session";
import { getServerPreferences } from "@/lib/preferences.server";
import { CLIENT_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import {
  ClientsTable,
  NewClientButton,
} from "@/components/clients/ClientsTable";

export const metadata: Metadata = { title: "Clients" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [result, users, user, preferences] = await Promise.all([
    listClients({
      q: one(params.q),
      status: one(params.status),
      accountManagerId: one(params.accountManagerId),
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
        title="Clients"
        description={`${result.total} accounts on the books`}
        actions={
          <NewClientButton users={users} currentUserId={user?.id ?? ""} />
        }
      />

      <Card>
        <FilterBar
          searchPlaceholder="Search company, contact or email..."
          filters={[
            { key: "status", label: "Status", options: CLIENT_STATUSES },
            { key: "accountManagerId", label: "Manager", options: users },
          ]}
          sortOptions={CLIENT_SORT_OPTIONS}
        />

        <ClientsTable
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
