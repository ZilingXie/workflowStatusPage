import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { IncidentPrioritySelect } from "@/components/IncidentPrioritySelect";
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

  const workflowHref =
    incident.workflowId.startsWith("http://") || incident.workflowId.startsWith("https://")
      ? incident.workflowId
      : null;

  return (
    <AppShell
      session={session}
      title="Incident Detail"
      subtitle={`Incident ID: ${incident.id}`}
      topRightActions={<Link href="/incidents">Back to list</Link>}
    >
      <section className="card stack">
        <table>
          <tbody>
            <tr>
              <th>Status</th>
              <td>
                <span className={`badge ${incident.status}`}>{incident.status}</span>
              </td>
            </tr>
            <tr>
              <th>Priority</th>
              <td>
                <IncidentPrioritySelect incidentId={incident.id} initialPriority={incident.priority} />
              </td>
            </tr>
            <tr>
              <th>Failed At (UTC)</th>
              <td>{incident.failedAt.toISOString()}</td>
            </tr>
            <tr>
              <th>Workflow</th>
              <td>
                {workflowHref ? (
                  <a href={workflowHref} target="_blank" rel="noreferrer">
                    {incident.workflowName}
                  </a>
                ) : (
                  incident.workflowName
                )}
              </td>
            </tr>
            <tr>
              <th>Execution ID</th>
              <td>
                <a href={incident.executionUrl} target="_blank" rel="noreferrer">
                  {incident.executionId}
                </a>
              </td>
            </tr>
            <tr>
              <th>Summary</th>
              <td>{incident.errorMessage}</td>
            </tr>
            <tr>
              <th>Description</th>
              <td>{incident.errorStack?.trim() ? incident.errorStack : "-"}</td>
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
        {incident.rawPayloads.length === 0 ? (
          <>
            <h2>Latest Raw Payload</h2>
            <p className="muted">No payload found.</p>
          </>
        ) : (
          <details className="payload-fold">
            <summary className="payload-fold-summary">
              <span className="payload-fold-triangle" aria-hidden>
                ▸
              </span>
              <h2>Latest Raw Payload</h2>
            </summary>
            <pre className="payload-fold-content">
              {JSON.stringify(incident.rawPayloads[0].payload, null, 2)}
            </pre>
          </details>
        )}
      </section>
    </AppShell>
  );
}
