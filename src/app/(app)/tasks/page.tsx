import type { Metadata } from "next";
import { TASK_SORT_OPTIONS, listTasks } from "@/server/services/tasks";
import { getProjectOptions } from "@/server/services/projects";
import { getUserOptions } from "@/server/services/users";
import { PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { ScopeTabs } from "@/components/ui/ScopeTabs";
import { NewTaskButton, TasksTable } from "@/components/tasks/TasksTable";

export const metadata: Metadata = { title: "Tasks" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const SCOPES = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const [result, projects, users] = await Promise.all([
    listTasks({
      q: one(params.q),
      status: one(params.status),
      priority: one(params.priority),
      projectId: one(params.projectId),
      assigneeId: one(params.assigneeId),
      scope: one(params.scope),
      sort: one(params.sort),
      page: Number(one(params.page) ?? 1) || 1,
    }),
    getProjectOptions(),
    getUserOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Tasks"
        description={`${result.total} tasks in this view`}
        actions={<NewTaskButton projects={projects} users={users} />}
      />

      <Card>
        <ScopeTabs param="scope" options={SCOPES} />

        <FilterBar
          searchPlaceholder="Search task titles..."
          filters={[
            { key: "status", label: "Status", options: TASK_STATUSES },
            { key: "priority", label: "Priority", options: PRIORITIES },
            { key: "assigneeId", label: "Assignee", options: users },
            { key: "projectId", label: "Project", options: projects },
          ]}
          sortOptions={TASK_SORT_OPTIONS}
        />

        <TasksTable rows={result.items} projects={projects} users={users} />

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
