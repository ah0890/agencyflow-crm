import type { Metadata } from "next";
import Link from "next/link";
import { KanbanSquare, List } from "lucide-react";
import {
  DEAL_SORT_OPTIONS,
  getPipelineSummary,
  listBoardDeals,
  listDeals,
} from "@/server/services/deals";
import { getUserOptions } from "@/server/services/users";
import { getClientOptions } from "@/server/services/clients";
import { getCurrentUser } from "@/lib/auth/session";
import { getServerPreferences } from "@/lib/preferences.server";
import { DEAL_STAGES, optionOf } from "@/lib/constants";
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { TableWrap, Td, Th, Tr } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  NewDealButton,
  PipelineBoard,
} from "@/components/deals/PipelineBoard";

export const metadata: Metadata = { title: "Deals" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Sales pipeline.
 *
 * Two views of the same data: a Kanban board (the default, for working the
 * pipeline) and a table (for scanning and sorting). The view is a URL parameter
 * so a particular view is linkable.
 */
export default async function DealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = one(params.view) === "list" ? "list" : "board";
  const q = one(params.q);
  const ownerId = one(params.ownerId);

  const [summary, users, clients, user, preferences] = await Promise.all([
    getPipelineSummary(),
    getUserOptions(),
    getClientOptions(),
    getCurrentUser(),
    getServerPreferences(),
  ]);

  const currency = preferences.currency;
  const money = (value: number, compact = true) =>
    formatCurrency(value, { currency, compact });

  // The board needs every card; the table pages.
  const boardDeals =
    view === "board" ? await listBoardDeals({ q, ownerId }) : [];

  const listResult =
    view === "list"
      ? await listDeals({
          q,
          ownerId,
          stage: one(params.stage),
          sort: one(params.sort),
          page: Number(one(params.page) ?? 1) || 1,
        })
      : null;

  return (
    <>
      <PageHeader
        title="Deals"
        description={`${money(summary.openValue)} open across ${summary.openCount} deals · ${formatPercent(summary.winRate)} win rate`}
        actions={
          <>
            <ViewToggle view={view} />
            <NewDealButton
              users={users}
              clients={clients}
              currentUserId={user?.id ?? ""}
            />
          </>
        }
      />

      {view === "board" ? (
        <>
          <div className="mb-4">
            <Card>
              <FilterBar
                searchPlaceholder="Search the pipeline..."
                filters={[{ key: "ownerId", label: "Owner", options: users }]}
              />
            </Card>
          </div>

          <PipelineBoard
            deals={boardDeals}
            users={users}
            clients={clients}
            currentUserId={user?.id ?? ""}
            currency={currency}
          />
        </>
      ) : (
        <Card>
          <FilterBar
            searchPlaceholder="Search deal, company or contact..."
            filters={[
              { key: "stage", label: "Stage", options: DEAL_STAGES },
              { key: "ownerId", label: "Owner", options: users },
            ]}
            sortOptions={DEAL_SORT_OPTIONS}
          />

          {listResult!.items.length === 0 ? (
            <EmptyState
              icon={<KanbanSquare className="size-5" />}
              title="No deals match this view"
              description="Try clearing the filters, or add a deal to the pipeline."
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Deal</Th>
                  <Th>Stage</Th>
                  <Th align="right">Value</Th>
                  <Th align="right">Probability</Th>
                  <Th>Owner</Th>
                  <Th>Expected close</Th>
                </tr>
              </thead>
              <tbody>
                {listResult!.items.map((deal) => {
                  const stage = optionOf(DEAL_STAGES, deal.stage);
                  return (
                    <Tr key={deal.id}>
                      <Td>
                        <span className="block truncate font-medium text-[var(--text)]">
                          {deal.title}
                        </span>
                        <span className="block truncate text-xs text-[var(--text-subtle)]">
                          {deal.company} · {deal.contactName}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={stage.tone} dot>
                          {stage.label}
                        </Badge>
                      </Td>
                      <Td align="right">
                        <span className="text-sm font-medium tabular-nums text-[var(--text)]">
                          {money(deal.value, false)}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="text-sm tabular-nums text-[var(--text-muted)]">
                          {deal.probability}%
                        </span>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <Avatar
                            name={deal.owner.name}
                            color={deal.owner.avatarColor}
                            size="xs"
                          />
                          <span className="truncate text-xs text-[var(--text-muted)]">
                            {deal.owner.name}
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatDate(deal.expectedCloseDate)}
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}

          <Pagination
            page={listResult!.page}
            pageCount={listResult!.pageCount}
            total={listResult!.total}
            pageSize={listResult!.pageSize}
          />
        </Card>
      )}
    </>
  );
}

/** Board / list switch. Rendered as links so it works without JavaScript. */
function ViewToggle({ view }: { view: "board" | "list" }) {
  const base =
    "inline-flex h-9 items-center gap-1.5 px-3 text-sm transition-colors";

  return (
    <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
      <Link
        href="/deals"
        aria-current={view === "board" ? "page" : undefined}
        className={cn(
          base,
          view === "board"
            ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
        )}
      >
        <KanbanSquare className="size-4" />
        Board
      </Link>
      <Link
        href="/deals?view=list"
        aria-current={view === "list" ? "page" : undefined}
        className={cn(
          base,
          "border-l border-[var(--border)]",
          view === "list"
            ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
        )}
      >
        <List className="size-4" />
        List
      </Link>
    </div>
  );
}
