import { ArrowLeft, GitPullRequest } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { IncidentPrioritySelect } from "@/components/IncidentPrioritySelect";
import { IncidentStatusForm } from "@/components/IncidentStatusForm";
import { StatusBadge } from "@/components/StatusBadge";
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

  const quickCreateParams = new URLSearchParams({
    type: "IMPROVEMENT",
    sourceIncidentId: incident.id,
    workflowName: incident.workflowName,
    workflowReference: incident.workflowId,
    title: `Improve ${incident.workflowName}`,
    description: `Triggered from incident ${incident.id}. Related failure summary: ${incident.errorMessage}`
  });

  const quickCreateHref = `/workflow-requests/new?${quickCreateParams.toString()}`;

  return (
    <AppShell session={session} activeNav="incidents">
      <div className="flex flex-col gap-6">
        <Link
          href="/incidents"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Incidents
        </Link>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">{incident.workflowName}</h1>
                <StatusBadge status={incident.status} />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {incident.id} / {incident.executionId}
              </p>
            </div>
            <IncidentPrioritySelect incidentId={incident.id} initialPriority={incident.priority} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-secondary/20 p-4 sm:grid-cols-4">
            <InfoItem label="Failed At (UTC)" value={incident.failedAt.toISOString()} />
            <InfoItem label="Resolved At (UTC)" value={incident.resolvedAt?.toISOString() ?? "--"} />
            <InfoItem label="Resolved By" value={incident.resolvedBy ?? "--"} />
            <InfoItem label="Resolution Reason" value={incident.resolutionReason ?? "--"} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={quickCreateHref}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <GitPullRequest className="h-4 w-4" />
              Create Improvement Request
            </Link>
            {workflowHref ? (
              <a
                href={workflowHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Open Workflow
              </a>
            ) : null}
            <a
              href={incident.executionUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Open Execution
            </a>
          </div>

          <div className="mt-4 rounded-lg border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs text-muted-foreground">Summary</p>
            <p className="mt-1 text-sm text-foreground">{incident.errorMessage}</p>
            <p className="mt-3 text-xs text-muted-foreground">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">
              {incident.errorStack?.trim() ? incident.errorStack : "-"}
            </p>
          </div>
        </section>

        <IncidentStatusForm incidentId={incident.id} status={incident.status} role={session.role} />

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Status History</h2>
          {incident.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status changes yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Time (UTC)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {incident.events.map((event) => (
                    <tr key={event.id} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.createdAt.toISOString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.fromStatus}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.toStatus}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.actorUsername}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.actorRole}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.actionReason ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card">
          {incident.rawPayloads.length === 0 ? (
            <div className="p-6">
              <h2 className="text-sm font-semibold text-foreground">Latest Raw Payload</h2>
              <p className="mt-2 text-sm text-muted-foreground">No payload found.</p>
            </div>
          ) : (
            <details>
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/30">
                Latest Raw Payload
              </summary>
              <div className="border-t border-border">
                <pre className="max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed text-foreground">
                  {JSON.stringify(incident.rawPayloads[0].payload, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
