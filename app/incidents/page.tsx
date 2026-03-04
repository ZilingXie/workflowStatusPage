import { IncidentPriority, IncidentStatus } from "@prisma/client";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoRefresh } from "@/components/AutoRefresh";
import { UtcDateTimeFilterInput } from "@/components/UtcDateTimeFilterInput";
import { WorkflowFilterSelect } from "@/components/WorkflowFilterSelect";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { buildIncidentWhere, parseIncidentFilters } from "@/lib/incidents";

type SearchParams = Record<string, string | string[] | undefined>;
const DEFAULT_FILTER_WINDOW_MS = 24 * 60 * 60 * 1000;
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
  const now = new Date();
  const fromParam = asString(searchParams.from);
  const toParam = asString(searchParams.to);
  const shouldApplyDefaultWindow = !fromParam && !toParam;
  const defaultFrom = new Date(now.getTime() - DEFAULT_FILTER_WINDOW_MS).toISOString();
  const defaultTo = now.toISOString();
  const effectiveFrom = shouldApplyDefaultWindow ? defaultFrom : fromParam;
  const effectiveTo = shouldApplyDefaultWindow ? defaultTo : toParam;
  const rawParams = toSearchParams({
    ...searchParams,
    ...(effectiveFrom ? { from: effectiveFrom } : {}),
    ...(effectiveTo ? { to: effectiveTo } : {})
  });
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

  return (
    <AppShell
      session={session}
      title="Incidents"
      subtitle="Track failed workflows and response lifecycle"
      topRightActions={
        session.role === "ADMIN" ? (
          <a href={`/api/v1/incidents/export.csv?${rawParams.toString()}`}>Export CSV</a>
        ) : null
      }
    >
      <AutoRefresh intervalMs={15000} />

      <section className="kpi-grid">
        <article className="card stack" style={{ gap: 4 }}>
          <h3>OPEN</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.OPEN}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>IN_PROGRESS</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.IN_PROGRESS}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>RESOLVED</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.RESOLVED}</p>
        </article>
      </section>

      <section className="card stack">
        <h2>Filters</h2>
        <form method="GET" className="form-row">
          <label className="stack status-filter-field" style={{ gap: 4 }}>
            <span>Status</span>
            <WorkflowFilterSelect
              name="status"
              initialValue={filters.status ?? ""}
              options={statusFilterOptions}
              emptyOptionLabel="All"
              placeholder="Select status"
              autoSubmitOnSelect
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>Workflow</span>
            <WorkflowFilterSelect
              name="workflow"
              initialValue={filters.workflow ?? ""}
              options={workflowFilterOptions}
              placeholder="All workflow"
              emptyOptionLabel="All workflow"
              autoSubmitOnSelect
            />
          </label>

          <label className="stack priority-filter-field" style={{ gap: 4 }}>
            <span>Priority</span>
            <WorkflowFilterSelect
              name="priority"
              initialValue={filters.priority ?? ""}
              options={priorityFilterOptions}
              emptyOptionLabel="All priority"
              placeholder="Select priority"
              autoSubmitOnSelect
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>From (UTC)</span>
            <UtcDateTimeFilterInput
              name="from"
              initialValue={effectiveFrom ?? ""}
              autoSubmitOnChange
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>To (UTC)</span>
            <UtcDateTimeFilterInput
              name="to"
              initialValue={effectiveTo ?? ""}
              autoSubmitOnChange
            />
          </label>

          <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
          <Link href="/incidents" className="filter-reset-button" style={{ alignSelf: "end" }}>
            Reset
          </Link>
        </form>
      </section>

      <section className="card stack">
        <h2>Failure List</h2>
        <table>
          <thead>
            <tr>
              <th>Failed At (UTC)</th>
              <th>Workflow</th>
              <th>Execution ID</th>
              <th>Summary</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Handler</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  No incidents found.
                </td>
              </tr>
            ) : (
              items.map((incident) => (
                <tr key={incident.id}>
                  <td>{incident.failedAt.toISOString()}</td>
                  <td>
                    {isHttpUrl(incident.workflowId) ? (
                      <a href={incident.workflowId} target="_blank" rel="noreferrer">
                        {incident.workflowName}
                      </a>
                    ) : (
                      incident.workflowName
                    )}
                  </td>
                  <td>
                    <a href={incident.executionUrl} target="_blank" rel="noreferrer">
                      {incident.executionId}
                    </a>
                  </td>
                  <td title={incident.errorMessage}>{incident.errorMessage.slice(0, 120)}</td>
                  <td>
                    <span className={`badge priority-badge priority-${incident.priority}`}>
                      {incident.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${incident.status}`}>{incident.status}</span>
                  </td>
                  <td>{incident.resolvedBy ?? "-"}</td>
                  <td>
                    <Link href={`/incidents/${incident.id}`}>View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="actions" style={{ justifyContent: "space-between" }}>
          <p className="muted">
            Page {filters.page} / {totalPages} (Total {total})
          </p>
          <div className="actions">
            {filters.page > 1 ? (
              <Link href={buildPageLink(rawParams, filters.page - 1)}>Previous</Link>
            ) : (
              <span className="muted">Previous</span>
            )}
            {filters.page < totalPages ? (
              <Link href={buildPageLink(rawParams, filters.page + 1)}>Next</Link>
            ) : (
              <span className="muted">Next</span>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
