import type { Metadata } from "next";
import {
  PROJECT_SORT_OPTIONS,
  listProjects,
} from "@/server/services/projects";
import { getClientOptions } from "@/server/services/clients";
import { getUserOptions } from "@/server/services/users";
import { getCurrentUser } from "@/lib/auth/session";
import { getServerPreferences } from "@/lib/preferences.server";
import { PRIORITIES, PROJECT_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import {
  NewProjectButton,
  ProjectsGrid,
} from "@/components/projects/ProjectsGrid";

export const metadata: Metadata = { title: "Projects" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [result, clients, users, user, preferences] = await Promise.all([
    listProjects({
      q: one(params.q),
      status: one(params.status),
      clientId: one(params.clientId),
      priority: one(params.priority),
      sort: one(params.sort),
      page: Number(one(params.page) ?? 1) || 1,
      pageSize: 9,
    }),
    getClientOptions(),
    getUserOptions(),
    getCurrentUser(),
    getServerPreferences(),
  ]);

  return (
    <>
      <PageHeader
        title="Projects"
        description={`${result.total} projects across all clients`}
        actions={
          <NewProjectButton
            clients={clients}
            users={users}
            currentUserId={user?.id ?? ""}
          />
        }
      />

      <Card className="mb-4">
        <FilterBar
          searchPlaceholder="Search project or client..."
          filters={[
            { key: "status", label: "Status", options: PROJECT_STATUSES },
            { key: "priority", label: "Priority", options: PRIORITIES },
            { key: "clientId", label: "Client", options: clients },
          ]}
          sortOptions={PROJECT_SORT_OPTIONS}
        />
      </Card>

      <ProjectsGrid
        projects={result.items}
        clients={clients}
        users={users}
        currentUserId={user?.id ?? ""}
        currency={preferences.currency}
      />

      {result.pageCount > 1 ? (
        <Card className="mt-4">
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
          />
        </Card>
      ) : null}
    </>
  );
}
