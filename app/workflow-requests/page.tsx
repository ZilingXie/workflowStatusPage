import { IncidentPriority, WorkflowRequestStatus, WorkflowRequestType } from "@prisma/client";
import { Download, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { UtcDateTimeFilterInput } from "@/components/UtcDateTimeFilterInput";
import { WorkflowFilterSelect } from "@/components/WorkflowFilterSelect";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { TYPE_COLOR_MAP } from "@/lib/ui";
import { cn } from "@/lib/utils";
import {
  buildWorkflowRequestWhere,
  parseWorkflowRequestFilters
} from "@/lib/workflowRequests";

type SearchParams = Record<string, string | string[] | undefined>;

const TYPE_FILTER_OPTIONS: WorkflowRequestType[] = [
  WorkflowRequestType.IMPROVEMENT,
  WorkflowRequestType.NEW_WORKFLOW
];

const STATUS_FILTER_OPTIONS: WorkflowRequestStatus[] = [
  WorkflowRequestStatus.PROPOSED,
  WorkflowRequestStatus.TRIAGED,
  WorkflowRequestStatus.PLANNED,
  WorkflowRequestStatus.IN_PROGRESS,
  WorkflowRequestStatus.DONE,
  WorkflowRequestStatus.REJECTED
];

const PRIORITY_FILTER_OPTIONS: IncidentPriority[] = [
  IncidentPriority.L,
  IncidentPriority.M,
  IncidentPriority.H
];

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function toSearchParams(params: SearchParams): URLSearchParams {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = asString(value);
    if (text) {
      search.set(key, text);
    }
  }

  return search;
}

function buildPageLink(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params.toString());
  next.set("page", String(page));
  return `/workflow-requests?${next.toString()}`;
}

function displayWorkflow(item: {
  type: WorkflowRequestType;
  workflowName: string | null;
  requestedWorkflowName: string | null;
}): string {
  if (item.type === WorkflowRequestType.IMPROVEMENT) {
    return item.workflowName ?? "-";
  }

  return item.requestedWorkflowName ?? "-";
}

function displayTypeLabel(type: WorkflowRequestType): string {
  return type === WorkflowRequestType.IMPROVEMENT ? "Improvement" : "New Workflow";
}

export default async function WorkflowRequestsPage({
  searchParams = {}
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const session = requireServerSession();
  const rawParams = toSearchParams(searchParams);
  const filters = parseWorkflowRequestFilters(rawParams);
  const where = buildWorkflowRequestWhere(filters);

  const [total, items, statusCountsRaw, workflowNameGroups, requestedWorkflowNameGroups, assigneeGroups] =
    await Promise.all([
      prisma.workflowRequest.count({ where }),
      prisma.workflowRequest.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        select: {
          id: true,
          type: true,
          title: true,
          workflowName: true,
          requestedWorkflowName: true,
          priority: true,
          status: true,
          proposedBy: true,
          assigneeUsername: true,
          createdAt: true
        }
      }),
      prisma.workflowRequest.groupBy({
        by: ["status"],
        orderBy: {
          status: "asc"
        },
        _count: {
          status: true
        }
      }),
      prisma.workflowRequest.groupBy({
        by: ["workflowName"],
        orderBy: {
          workflowName: "asc"
        },
        take: 1000
      }),
      prisma.workflowRequest.groupBy({
        by: ["requestedWorkflowName"],
        orderBy: {
          requestedWorkflowName: "asc"
        },
        take: 1000
      }),
      prisma.workflowRequest.groupBy({
        by: ["assigneeUsername"],
        orderBy: {
          assigneeUsername: "asc"
        },
        take: 1000
      })
    ] as const);

  const workflowOptions = Array.from(
    new Set(
      [
        ...workflowNameGroups.map((item) => item.workflowName),
        ...requestedWorkflowNameGroups.map((item) => item.requestedWorkflowName)
      ]
        .map((item) => (item ?? "").trim())
        .filter((item) => item.length > 0)
    )
  );

  const assigneeOptions = Array.from(
    new Set(
      assigneeGroups
        .map((item) => (item.assigneeUsername ?? "").trim())
        .filter((item) => item.length > 0)
    )
  );

  const typeFilterOptions = ["", ...TYPE_FILTER_OPTIONS];
  const statusFilterOptions = ["", ...STATUS_FILTER_OPTIONS];
  const priorityFilterOptions = ["", ...PRIORITY_FILTER_OPTIONS];
  const workflowFilterOptions = ["", ...workflowOptions];
  const assigneeFilterOptions = ["", ...assigneeOptions];

  const statusCounts: Record<WorkflowRequestStatus, number> = {
    PROPOSED: 0,
    TRIAGED: 0,
    PLANNED: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    REJECTED: 0
  };

  for (const row of statusCountsRaw) {
    statusCounts[row.status] = row._count.status;
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <AppShell session={session} activeNav="workflow-requests">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workflow Requests</h1>
            <p className="text-sm text-muted-foreground">Track improvement requests and new workflow proposals</p>
          </div>
          <div className="flex items-center gap-2">
            {session.role === "ADMIN" ? (
              <a
                href={`/api/v1/workflow-requests/export.csv?${rawParams.toString()}`}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </a>
            ) : null}
            <Link
              href="/workflow-requests/new"
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Request
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Proposed" value={statusCounts.PROPOSED} borderColor="border-blue-500/20" bgColor="bg-blue-500/10" />
          <KpiCard label="Triaged" value={statusCounts.TRIAGED} borderColor="border-cyan-500/20" bgColor="bg-cyan-500/10" />
          <KpiCard label="Planned" value={statusCounts.PLANNED} borderColor="border-indigo-500/20" bgColor="bg-indigo-500/10" />
          <KpiCard label="In Progress" value={statusCounts.IN_PROGRESS} borderColor="border-amber-500/20" bgColor="bg-amber-500/10" />
          <KpiCard label="Done" value={statusCounts.DONE} borderColor="border-emerald-500/20" bgColor="bg-emerald-500/10" />
          <KpiCard label="Rejected" value={statusCounts.REJECTED} borderColor="border-zinc-500/20" bgColor="bg-zinc-500/10" />
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <WorkflowFilterSelect
                name="type"
                initialValue={filters.type ?? ""}
                options={typeFilterOptions}
                emptyOptionLabel="All"
                autoSubmitOnSelect
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <WorkflowFilterSelect
                name="status"
                initialValue={filters.status ?? ""}
                options={statusFilterOptions}
                emptyOptionLabel="All"
                autoSubmitOnSelect
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Priority</label>
              <WorkflowFilterSelect
                name="priority"
                initialValue={filters.priority ?? ""}
                options={priorityFilterOptions}
                emptyOptionLabel="All"
                autoSubmitOnSelect
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Workflow</label>
              <WorkflowFilterSelect
                name="workflow"
                initialValue={filters.workflow ?? ""}
                options={workflowFilterOptions}
                emptyOptionLabel="All"
                autoSubmitOnSelect
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Assignee</label>
              <WorkflowFilterSelect
                name="assignee"
                initialValue={filters.assignee ?? ""}
                options={assigneeFilterOptions}
                emptyOptionLabel="All"
                autoSubmitOnSelect
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From (UTC)</label>
              <UtcDateTimeFilterInput name="from" initialValue={asString(searchParams.from) ?? ""} autoSubmitOnChange />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To (UTC)</label>
              <UtcDateTimeFilterInput name="to" initialValue={asString(searchParams.to) ?? ""} autoSubmitOnChange />
            </div>

            <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
            <Link
              href="/workflow-requests"
              className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Reset
            </Link>
          </form>
        </section>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Workflow</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Created (UTC)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No workflow requests found
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                      <td className="max-w-[240px] truncate px-4 py-3 font-medium text-foreground" title={item.title}>
                        {item.title}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            TYPE_COLOR_MAP[item.type]
                          )}
                        >
                          {displayTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{displayWorkflow(item)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.assigneeUsername ?? "--"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.createdAt.toISOString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/workflow-requests/${item.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                        >
                          Details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((filters.page - 1) * filters.pageSize + 1, total)}-
              {Math.min(filters.page * filters.pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={buildPageLink(rawParams, Math.max(1, filters.page - 1))}
                aria-disabled={filters.page <= 1}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary aria-disabled:pointer-events-none aria-disabled:opacity-30"
              >
                Prev
              </Link>
              {pageNumbers.map((pageNo) => (
                <Link
                  key={pageNo}
                  href={buildPageLink(rawParams, pageNo)}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    pageNo === filters.page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {pageNo}
                </Link>
              ))}
              <Link
                href={buildPageLink(rawParams, Math.min(totalPages, filters.page + 1))}
                aria-disabled={filters.page >= totalPages}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary aria-disabled:pointer-events-none aria-disabled:opacity-30"
              >
                Next
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  borderColor,
  bgColor
}: {
  label: string;
  value: number;
  borderColor: string;
  bgColor: string;
}): JSX.Element {
  return (
    <div className={cn("rounded-lg border bg-card p-4", borderColor)}>
      <div className={cn("mb-2 h-1.5 w-10 rounded-full", bgColor)} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
