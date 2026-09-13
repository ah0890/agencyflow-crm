"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Building2, CalendarDays, GripVertical, Pencil, Trash2 } from "lucide-react";
import { DEAL_STAGES, optionOf, type Tone } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RowActions } from "@/components/ui/RowActions";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { useResourceMutation } from "@/lib/hooks/useResourceMutation";
import { DealFormDialog, type EditableDeal } from "./DealFormDialog";

export type BoardDeal = EditableDeal & {
  owner: { id: string; name: string; avatarColor: string };
  client: { id: string; name: string } | null;
};

/**
 * The sales pipeline Kanban board.
 *
 * Dragging a card writes the new stage optimistically and then PATCHes
 * /api/deals/:id/move. The service layer owns what a stage change means
 * (probability, closedAt, the activity entry and the owner notification), so
 * dragging a card and editing the stage in the form produce identical results.
 *
 * If the request fails the card springs back to its original column and a toast
 * explains why - the UI never silently diverges from the database.
 */
export function PipelineBoard({
  deals,
  users,
  clients,
  currentUserId,
  currency,
}: {
  deals: BoardDeal[];
  users: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  currentUserId: string;
  currency: string;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useQueryParams();
  const { run } = useResourceMutation();

  // Local copy so a drop can repaint instantly. When the server sends fresh
  // rows we adjust during render (React's documented pattern for deriving
  // state from props) rather than syncing in an effect, which would cause an
  // extra render pass and a visible flicker.
  const [items, setItems] = useState(deals);
  const [renderedDeals, setRenderedDeals] = useState(deals);
  if (deals !== renderedDeals) {
    setRenderedDeals(deals);
    setItems(deals);
  }

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BoardDeal | null>(null);
  const [deleting, setDeleting] = useState<BoardDeal | null>(null);

  // The top-bar quick-add links here with ?new=1. Reading it directly keeps the
  // URL as the single source of truth - no effect copying it into state.
  const quickAdd = searchParams.get("new") === "1";
  const dialogOpen = formOpen || quickAdd;

  function closeDialog() {
    setFormOpen(false);
    setEditing(null);
    if (quickAdd) setParams({ new: null });
  }

  const sensors = useSensors(
    // A small distance threshold keeps a click on the card from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(
    () =>
      DEAL_STAGES.map((stage) => {
        const stageDeals = items.filter((deal) => deal.stage === stage.value);
        return {
          ...stage,
          deals: stageDeals,
          total: stageDeals.reduce((sum, deal) => sum + deal.value, 0),
        };
      }),
    [items],
  );

  const draggingDeal = items.find((deal) => deal.id === draggingId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);

    const dealId = String(event.active.id);
    const targetStage = event.over ? String(event.over.id) : null;
    if (!targetStage) return;

    const deal = items.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    const previousStage = deal.stage;

    // Optimistic move.
    setItems((current) =>
      current.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)),
    );

    const stageLabel = optionOf(DEAL_STAGES, targetStage).label;
    const result = await run({
      path: `/api/deals/${dealId}/move`,
      method: "PATCH",
      body: { stage: targetStage },
      successMessage: `${deal.company} moved to ${stageLabel}`,
    });

    // Roll back if the server rejected it.
    if (!result) {
      setItems((current) =>
        current.map((d) =>
          d.id === dealId ? { ...d, stage: previousStage } : d,
        ),
      );
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    await run({
      path: `/api/deals/${deleting.id}`,
      method: "DELETE",
      successMessage: "Deal deleted",
    });
    setDeleting(null);
  }

  return (
    <>
      <DndContext
        // dnd-kit derives its accessibility ids from this. Without a fixed
        // value the server and client generate different ones and React logs
        // a hydration mismatch.
        id="agencyflow-pipeline"
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* One horizontally scrolling row of columns - the page never scrolls
            sideways, only this strip does. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
          <div className="flex min-w-max gap-3">
            {columns.map((column) => (
              <StageColumn
                key={column.value}
                id={column.value}
                label={column.label}
                tone={column.tone}
                count={column.deals.length}
                total={column.total}
                currency={currency}
              >
                {column.deals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    currency={currency}
                    dragging={deal.id === draggingId}
                    onEdit={() => {
                      setEditing(deal);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(deal)}
                  />
                ))}

                {column.deals.length === 0 ? (
                  <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text-subtle)]">
                    Drop a deal here
                  </p>
                ) : null}
              </StageColumn>
            ))}
          </div>
        </div>

        {/* The card that follows the cursor while dragging. */}
        <DragOverlay dropAnimation={null}>
          {draggingDeal ? (
            <div className="w-72 rotate-1 cursor-grabbing rounded-[var(--radius)] border border-[var(--accent-border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-lg)]">
              <p className="truncate text-sm font-medium text-[var(--text)]">
                {draggingDeal.company}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--accent-text)]">
                {formatCurrency(draggingDeal.value, { currency, compact: true })}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        deal={quickAdd ? null : editing}
        users={users}
        clients={clients}
        defaultOwnerId={currentUserId}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this deal?"
        message={
          <>
            <strong className="text-[var(--text)]">{deleting?.title}</strong>{" "}
            will be removed from the pipeline. This cannot be undone.
          </>
        }
        confirmLabel="Delete deal"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/* -------------------------------- column ---------------------------------- */

function StageColumn({
  id,
  label,
  tone,
  count,
  total,
  currency,
  children,
}: {
  id: string;
  label: string;
  tone: Tone;
  count: number;
  total: number;
  currency: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} stage, ${count} deals`}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-[var(--radius)] border bg-[var(--surface)] transition-colors",
        isOver
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--border)]",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", `dot-${tone}`)} />
          <span className="truncate text-xs font-semibold text-[var(--text)]">
            {label}
          </span>
          <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 text-[10px] tabular-nums text-[var(--text-muted)]">
            {count}
          </span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
          {formatCurrency(total, { currency, compact: true })}
        </span>
      </header>

      <div className="flex max-h-[calc(100vh-19rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
        {children}
      </div>
    </section>
  );
}

/* --------------------------------- card ----------------------------------- */

function DealCard({
  deal,
  currency,
  dragging,
  onEdit,
  onDelete,
}: {
  deal: BoardDeal;
  currency: string;
  dragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: deal.id });

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "group rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3 transition-colors hover:border-[var(--border-strong)]",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Only the handle starts a drag, so the menu and links stay clickable
            and keyboard users get a real focusable control. */}
        <button
          type="button"
          className="-ml-1 cursor-grab touch-none rounded p-0.5 text-[var(--text-subtle)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          aria-label={`Drag ${deal.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text)]">
            {deal.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--text-subtle)]">
            <Building2 className="size-3 shrink-0" />
            {deal.company}
          </p>
        </div>

        <RowActions
          label={`Actions for ${deal.title}`}
          actions={[
            {
              label: "Edit",
              icon: <Pencil className="size-3.5" />,
              onSelect: onEdit,
            },
            {
              label: "Delete",
              icon: <Trash2 className="size-3.5" />,
              destructive: true,
              onSelect: onDelete,
            },
          ]}
        />
      </div>

      <p className="mt-2 text-base font-semibold tabular-nums text-[var(--text)]">
        {formatCurrency(deal.value, { currency })}
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-[var(--text-subtle)]">
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar
            name={deal.owner.name}
            color={deal.owner.avatarColor}
            size="xs"
          />
          <span className="truncate">{deal.contactName}</span>
        </span>
        {deal.expectedCloseDate ? (
          <span className="flex shrink-0 items-center gap-1">
            <CalendarDays className="size-3" />
            {formatDate(deal.expectedCloseDate)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

/** Page header button, sharing the deal dialog. */
export function NewDealButton({
  users,
  clients,
  currentUserId,
}: {
  users: Array<{ value: string; label: string }>;
  clients: Array<{ value: string; label: string }>;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>New deal</Button>
      <DealFormDialog
        open={open}
        onClose={() => setOpen(false)}
        users={users}
        clients={clients}
        defaultOwnerId={currentUserId}
      />
    </>
  );
}
