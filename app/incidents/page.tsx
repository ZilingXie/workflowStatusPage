import { IncidentStatus } from "@prisma/client";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LogoutButton } from "@/components/LogoutButton";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { buildIncidentWhere, parseIncidentFilters } from "@/lib/incidents";

type SearchParams = Record<string, string | string[] | undefined>;

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

export default async function IncidentsPage({
  searchParams = {}
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const session = requireServerSession();
  const rawParams = toSearchParams(searchParams);
  const filters = parseIncidentFilters(rawParams);
  const where = buildIncidentWhere(filters);

  const [total, items, grouped] = await prisma.$transaction([
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
        workflowName: true,
        executionId: true,
        errorMessage: true,
        status: true,
        resolvedBy: true
      }
    }),
    prisma.incident.groupBy({
      by: ["status"],
      _count: {
        _all: true
      }
    })
  ]);

  const statusCounts: Record<IncidentStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0
  };

  for (const item of grouped) {
    statusCounts[item.status] = item._count._all;
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return (
    <main className="stack">
      <AutoRefresh intervalMs={15000} />

      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1>Incidents</h1>
          <p className="muted">
            Signed in as {session.username} ({session.role})
          </p>
        </div>
        <div className="actions">
          {session.role === "ADMIN" ? (
            <a
              href={`/api/v1/incidents/export.csv?${rawParams.toString()}`}
              style={{ alignSelf: "center" }}
            >
              Export CSV
            </a>
          ) : null}
          <LogoutButton />
        </div>
      </div>

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
          <label className="stack" style={{ gap: 4 }}>
            <span>Status</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">All</option>
              <option value={IncidentStatus.OPEN}>OPEN</option>
              <option value={IncidentStatus.IN_PROGRESS}>IN_PROGRESS</option>
              <option value={IncidentStatus.RESOLVED}>RESOLVED</option>
            </select>
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>Workflow</span>
            <input name="workflow" defaultValue={filters.workflow ?? ""} placeholder="workflow name" />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>From (ISO UTC)</span>
            <input name="from" defaultValue={asString(searchParams.from) ?? ""} placeholder="2026-03-01T00:00:00Z" />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>To (ISO UTC)</span>
            <input name="to" defaultValue={asString(searchParams.to) ?? ""} placeholder="2026-03-02T23:59:59Z" />
          </label>

          <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
          <button type="submit">Apply</button>
          <Link href="/incidents" style={{ alignSelf: "end" }}>
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
              <th>Error Summary</th>
              <th>Status</th>
              <th>Handler</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  No incidents found.
                </td>
              </tr>
            ) : (
              items.map((incident) => (
                <tr key={incident.id}>
                  <td>{incident.failedAt.toISOString()}</td>
                  <td>{incident.workflowName}</td>
                  <td>{incident.executionId}</td>
                  <td title={incident.errorMessage}>{incident.errorMessage.slice(0, 120)}</td>
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
    </main>
  );
}
