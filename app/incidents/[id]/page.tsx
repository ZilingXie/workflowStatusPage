import { notFound } from "next/navigation";
import Link from "next/link";
import { IncidentStatusForm } from "@/components/IncidentStatusForm";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    id: string;
  };
};

export default async function IncidentDetailPage({ params }: Params): Promise<JSX.Element> {
  const session = requireServerSession();

  const incident = await prisma.incident.findUnique({
    where: {
      id: params.id
    },
    include: {
      events: {
        orderBy: {
          createdAt: "asc"
        }
      },
      rawPayloads: {
        orderBy: {
          receivedAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!incident) {
    notFound();
  }

  return (
    <main className="stack">
      <div className="actions">
        <Link href="/incidents">Back to list</Link>
      </div>

      <section className="card stack">
        <h1>Incident Detail</h1>
        <p className="muted">ID: {incident.id}</p>

        <table>
          <tbody>
            <tr>
              <th>Status</th>
              <td>
                <span className={`badge ${incident.status}`}>{incident.status}</span>
              </td>
            </tr>
            <tr>
              <th>Failed At (UTC)</th>
              <td>{incident.failedAt.toISOString()}</td>
            </tr>
            <tr>
              <th>Workflow</th>
              <td>
                {incident.workflowName} ({incident.workflowId})
              </td>
            </tr>
            <tr>
              <th>Execution ID</th>
              <td>{incident.executionId}</td>
            </tr>
            <tr>
              <th>Execution Link</th>
              <td>
                <a href={incident.executionUrl} target="_blank" rel="noreferrer">
                  Open in n8n
                </a>
              </td>
            </tr>
            <tr>
              <th>Error Message</th>
              <td>{incident.errorMessage}</td>
            </tr>
            <tr>
              <th>Error Node</th>
              <td>{incident.errorNodeName ?? "-"}</td>
            </tr>
            <tr>
              <th>Error Type</th>
              <td>{incident.errorType ?? "-"}</td>
            </tr>
            <tr>
              <th>Resolved By</th>
              <td>{incident.resolvedBy ?? "-"}</td>
            </tr>
            <tr>
              <th>Resolution Reason</th>
              <td>{incident.resolutionReason ?? "-"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <IncidentStatusForm incidentId={incident.id} status={incident.status} role={session.role} />

      <section className="card stack">
        <h2>Status Timeline</h2>
        {incident.events.length === 0 ? (
          <p className="muted">No status changes yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time (UTC)</th>
                <th>From</th>
                <th>To</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {incident.events.map((event) => (
                <tr key={event.id}>
                  <td>{event.createdAt.toISOString()}</td>
                  <td>{event.fromStatus}</td>
                  <td>{event.toStatus}</td>
                  <td>{event.actorUsername}</td>
                  <td>{event.actorRole}</td>
                  <td>{event.actionReason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card stack">
        <h2>Latest Raw Payload</h2>
        {incident.rawPayloads.length === 0 ? (
          <p className="muted">No payload found.</p>
        ) : (
          <pre style={{ margin: 0, overflowX: "auto" }}>
            {JSON.stringify(incident.rawPayloads[0].payload, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
