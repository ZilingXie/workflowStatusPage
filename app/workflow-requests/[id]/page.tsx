import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { WorkflowRequestAssigneeForm } from "@/components/WorkflowRequestAssigneeForm";
import { WorkflowRequestComments } from "@/components/WorkflowRequestComments";
import { WorkflowRequestEditForm } from "@/components/WorkflowRequestEditForm";
import { WorkflowRequestStatusForm } from "@/components/WorkflowRequestStatusForm";
import { requireServerSession } from "@/lib/auth/server";
import { getAccountUsernames } from "@/lib/auth/users";
import { prisma } from "@/lib/db";
import { canEditWorkflowRequestBase } from "@/lib/workflowRequests";

type Params = {
  params: {
    id: string;
  };
};

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

  const assigneeOptions = await getAccountUsernames();
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

        <WorkflowRequestEditForm
          requestId={item.id}
          type={item.type}
          status={item.status}
          proposedBy={item.proposedBy}
          assigneeUsername={item.assigneeUsername}
          createdAtIso={item.createdAt.toISOString()}
          sourceIncidentId={item.sourceIncident?.id ?? null}
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

        <WorkflowRequestStatusForm requestId={item.id} status={item.status} role={session.role} />

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
