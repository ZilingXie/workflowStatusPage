import { IncidentPriority, IncidentStatus } from "@prisma/client";
import { AlertCircle, CheckCircle2, Clock, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoRefreshControls } from "@/components/AutoRefreshControls";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowFilterSelect } from "@/components/WorkflowFilterSelect";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import {
  buildIncidentWhere,
  parseIncidentFilters,
  resolveIncidentListStatusFilter
} from "@/lib/incidents";

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_FILTER_OPTIONS: IncidentStatus[] = [
  IncidentStatus.OPEN,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.RESOLVED
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
  return `/incidents?${next.toString()}`;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default async function IncidentsPage({
  searchParams = {}
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const session = requireServerSession();
  const statusParam = asString(searchParams.status);
  const hasStatusParam = Object.prototype.hasOwnProperty.call(searchParams, "status");
  const effectiveStatus = resolveIncidentListStatusFilter(statusParam, hasStatusParam);
  const rawParams = toSearchParams(searchParams);

  if (effectiveStatus) {
    rawParams.set("status", effectiveStatus);
  } else {
    rawParams.delete("status");
  }

  rawParams.delete("from");
  rawParams.delete("to");
  const filters = parseIncidentFilters(rawParams);
  const where = buildIncidentWhere(filters);

  const [total, items, statusCountsRaw, workflowOptionsRaw] = await Promise.all([
    prisma.incident.count({ where }),
    prisma.incident.findMany({
      where,
      orderBy: {
        failedAt: "desc"
      },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        failedAt: true,
        workflowId: true,
        workflowName: true,
        executionId: true,
        executionUrl: true,
        priority: true,
        errorMessage: true,
        status: true,
        resolvedBy: true
      }
    }),
    prisma.incident.groupBy({
      by: ["status"],
      orderBy: {
        status: "asc"
      },
      _count: {
        status: true
      }
    }),
    prisma.incident.groupBy({
      by: ["workflowName"],
      orderBy: {
        workflowName: "asc"
      },
      take: 1000
    })
  ] as const);

  const workflowOptions = Array.from(
    new Set(
      workflowOptionsRaw
        .map((item) => item.workflowName.trim())
        .filter((name) => name.length > 0)
    )
  );

  const workflowFilterOptions = ["", ...workflowOptions];
  const statusFilterOptions = ["", ...STATUS_FILTER_OPTIONS];
  const priorityFilterOptions = ["", ...PRIORITY_FILTER_OPTIONS];

  const statusCounts: Record<IncidentStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0
  };

  for (const row of statusCountsRaw) {
    statusCounts[row.status] = row._count.status;
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <AppShell session={session} activeNav="incidents">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Incidents</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage workflow execution failures</p>
          </div>
          <div className="flex items-center gap-2">
            <AutoRefreshControls intervalMs={15_000} />
            {session.role === "ADMIN" ? (
              <a
                href={`/api/v1/incidents/export.csv?${rawParams.toString()}`}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </a>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-lg border border-red-500/20 bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.OPEN}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-amber-500/20 bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.IN_PROGRESS}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-emerald-500/20 bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{statusCounts.RESOLVED}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <form method="GET" className="flex flex-wrap items-end gap-3">
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
              <label className="text-xs text-muted-foreground">Priority</label>
              <WorkflowFilterSelect
                name="priority"
                initialValue={filters.priority ?? ""}
                options={priorityFilterOptions}
                emptyOptionLabel="All"
                autoSubmitOnSelect
              />
            </div>

            <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
          </form>
        </section>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Failed At (UTC)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Workflow</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Execution ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Summary</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Handler</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No incidents found
                    </td>
                  </tr>
                ) : (
                  items.map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-b border-border/50 transition-colors hover:bg-secondary/20"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">{incident.failedAt.toISOString()}</td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {isHttpUrl(incident.workflowId) ? (
                          <a
                            href={incident.workflowId}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-blue-700 underline decoration-blue-500/60 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-700 dark:text-blue-300 dark:decoration-blue-300/70 dark:hover:text-blue-200 dark:hover:decoration-blue-200"
                          >
                            {incident.workflowName}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          incident.workflowName
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={incident.executionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-700 underline decoration-blue-500/60 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-700 dark:text-blue-300 dark:decoration-blue-300/70 dark:hover:text-blue-200 dark:hover:decoration-blue-200"
                        >
                          {incident.executionId}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="max-w-[320px] px-4 py-3 text-xs text-black dark:text-white">
                        {incident.errorMessage.slice(0, 120)}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={incident.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{incident.resolvedBy ?? "--"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/incidents/${incident.id}`}
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
