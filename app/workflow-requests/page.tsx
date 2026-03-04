import { IncidentPriority, WorkflowRequestStatus, WorkflowRequestType } from "@prisma/client";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { UtcDateTimeFilterInput } from "@/components/UtcDateTimeFilterInput";
import { WorkflowFilterSelect } from "@/components/WorkflowFilterSelect";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
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

  return (
    <AppShell
      session={session}
      activeNav="workflow-requests"
      title="Workflow Improvement Requests"
      subtitle="Track improvement proposals and new workflow demands"
      topRightActions={
        <>
          <Link href="/workflow-requests/new">Create Request</Link>
          {session.role === "ADMIN" ? (
            <a href={`/api/v1/workflow-requests/export.csv?${rawParams.toString()}`}>Export CSV</a>
          ) : null}
        </>
      }
    >
      <section className="kpi-grid workflow-request-kpi-grid">
        <article className="card stack" style={{ gap: 4 }}>
          <h3>PROPOSED</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.PROPOSED}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>TRIAGED</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.TRIAGED}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>PLANNED</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.PLANNED}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>IN_PROGRESS</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.IN_PROGRESS}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>DONE</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.DONE}</p>
        </article>
        <article className="card stack" style={{ gap: 4 }}>
          <h3>REJECTED</h3>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{statusCounts.REJECTED}</p>
        </article>
      </section>

      <section className="card stack">
        <h2>Filters</h2>
        <form method="GET" className="form-row">
          <label className="stack" style={{ gap: 4 }}>
            <span>Type</span>
            <WorkflowFilterSelect
              name="type"
              initialValue={filters.type ?? ""}
              options={typeFilterOptions}
              emptyOptionLabel="All type"
              placeholder="Select type"
              autoSubmitOnSelect
            />
          </label>

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
            <span>Workflow</span>
            <WorkflowFilterSelect
              name="workflow"
              initialValue={filters.workflow ?? ""}
              options={workflowFilterOptions}
              emptyOptionLabel="All workflow"
              placeholder="Filter by workflow"
              autoSubmitOnSelect
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>Assignee</span>
            <WorkflowFilterSelect
              name="assignee"
              initialValue={filters.assignee ?? ""}
              options={assigneeFilterOptions}
              emptyOptionLabel="All assignee"
              placeholder="Filter by assignee"
              autoSubmitOnSelect
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>From (UTC)</span>
            <UtcDateTimeFilterInput name="from" initialValue={asString(searchParams.from) ?? ""} autoSubmitOnChange />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>To (UTC)</span>
            <UtcDateTimeFilterInput name="to" initialValue={asString(searchParams.to) ?? ""} autoSubmitOnChange />
          </label>

          <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
          <Link href="/workflow-requests" className="filter-reset-button" style={{ alignSelf: "end" }}>
            Reset
          </Link>
        </form>
      </section>

      <section className="card stack">
        <h2>Request List</h2>
        <table>
          <thead>
            <tr>
              <th>Created At (UTC)</th>
              <th>Type</th>
              <th>Title</th>
              <th>Workflow</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Proposed By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  No workflow requests found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>{item.createdAt.toISOString()}</td>
                  <td>{item.type}</td>
                  <td title={item.title}>{item.title.slice(0, 120)}</td>
                  <td>{displayWorkflow(item)}</td>
                  <td>
                    <span className={`badge priority-badge priority-${item.priority}`}>{item.priority}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>{item.assigneeUsername ?? "-"}</td>
                  <td>{item.proposedBy}</td>
                  <td>
                    <Link href={`/workflow-requests/${item.id}`}>View</Link>
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
