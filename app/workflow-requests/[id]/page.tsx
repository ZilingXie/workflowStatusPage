import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkflowRequestAssigneeForm } from "@/components/WorkflowRequestAssigneeForm";
import { WorkflowRequestComments } from "@/components/WorkflowRequestComments";
import { WorkflowRequestEditForm } from "@/components/WorkflowRequestEditForm";
import { WorkflowRequestStatusForm } from "@/components/WorkflowRequestStatusForm";
import { requireServerSession } from "@/lib/auth/server";
import { getConfiguredUsernames } from "@/lib/auth/users";
import { prisma } from "@/lib/db";
import { TYPE_COLOR_MAP } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { canEditWorkflowRequestBase } from "@/lib/workflowRequests";

type Params = {
  params: {
    id: string;
  };
};

function displayTypeLabel(value: string): string {
  return value === "IMPROVEMENT" ? "Improvement" : "New Workflow";
}

export default async function WorkflowRequestDetailPage({ params }: Params): Promise<JSX.Element> {
  const session = requireServerSession();

  const item = await prisma.workflowRequest.findUnique({
    where: {
      id: params.id
    },
    include: {
      sourceIncident: {
        select: {
          id: true
        }
      },
      events: {
        orderBy: {
          createdAt: "asc"
        }
      },
      comments: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!item) {
    notFound();
  }

  const assigneeOptions = getConfiguredUsernames();
  const canEditBase = canEditWorkflowRequestBase(session.role, session.username, item);

  return (
    <AppShell session={session} activeNav="workflow-requests">
      <div className="flex flex-col gap-6">
        <Link
          href="/workflow-requests"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workflow Requests
        </Link>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">{item.title}</h1>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    TYPE_COLOR_MAP[item.type]
                  )}
                >
                  {displayTypeLabel(item.type)}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <p className="font-mono text-xs text-muted-foreground">{item.id}</p>
            </div>
            <PriorityBadge priority={item.priority} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-secondary/20 p-4 sm:grid-cols-4">
            <InfoItem label="Workflow" value={item.workflowName ?? item.requestedWorkflowName ?? "-"} />
            <InfoItem label="Created By" value={item.proposedBy} />
            <InfoItem label="Assignee" value={item.assigneeUsername ?? "Unassigned"} />
            <InfoItem label="Created At (UTC)" value={item.createdAt.toISOString()} />
          </div>

          <div className="mt-4 rounded-lg border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{item.description}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Workflow Reference</p>
                {item.workflowReference &&
                (item.workflowReference.startsWith("http://") || item.workflowReference.startsWith("https://")) ? (
                  <a
                    href={item.workflowReference}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {item.workflowReference}
                  </a>
                ) : (
                  <p className="text-sm text-foreground">{item.workflowReference ?? "-"}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source Incident</p>
                {item.sourceIncident ? (
                  <Link href={`/incidents/${item.sourceIncident.id}`} className="text-sm text-primary hover:underline">
                    {item.sourceIncident.id}
                  </Link>
                ) : (
                  <p className="text-sm text-foreground">-</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Business Goal</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{item.businessGoal ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Trigger</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{item.expectedTrigger ?? "-"}</p>
              </div>
            </div>
          </div>
        </section>

        <WorkflowRequestStatusForm requestId={item.id} status={item.status} role={session.role} />

        <WorkflowRequestEditForm
          requestId={item.id}
          type={item.type}
          canEdit={canEditBase}
          initialTitle={item.title}
          initialDescription={item.description}
          initialWorkflowName={item.workflowName}
          initialWorkflowReference={item.workflowReference}
          initialRequestedWorkflowName={item.requestedWorkflowName}
          initialBusinessGoal={item.businessGoal}
          initialExpectedTrigger={item.expectedTrigger}
          initialPriority={item.priority}
        />

        <WorkflowRequestAssigneeForm
          requestId={item.id}
          assigneeUsername={item.assigneeUsername}
          role={session.role}
          assigneeOptions={assigneeOptions}
        />

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Event History</h2>
          {item.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Time (UTC)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">From Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">To Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">From Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">To Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {item.events.map((event) => (
                    <tr key={event.id} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.createdAt.toISOString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.eventType}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.fromStatus ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.toStatus ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.fromAssignee ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.toAssignee ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.actorUsername}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.actorRole}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{event.actionReason ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <WorkflowRequestComments
          requestId={item.id}
          comments={item.comments.map((comment) => ({
            ...comment,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString()
          }))}
          sessionUsername={session.username}
          sessionRole={session.role}
        />
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
