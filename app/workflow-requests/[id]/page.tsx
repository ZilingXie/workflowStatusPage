import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { WorkflowRequestAssigneeForm } from "@/components/WorkflowRequestAssigneeForm";
import { WorkflowRequestComments } from "@/components/WorkflowRequestComments";
import { WorkflowRequestEditForm } from "@/components/WorkflowRequestEditForm";
import { WorkflowRequestStatusForm } from "@/components/WorkflowRequestStatusForm";
import { requireServerSession } from "@/lib/auth/server";
import { getConfiguredUsernames } from "@/lib/auth/users";
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

  const assigneeOptions = getConfiguredUsernames();
  const canEditBase = canEditWorkflowRequestBase(session.role, session.username, item);

  return (
    <AppShell
      session={session}
      activeNav="workflow-requests"
      title="Workflow Request Detail"
      subtitle={`Request ID: ${item.id}`}
      topRightActions={<Link href="/workflow-requests">Back to list</Link>}
    >
      <section className="card stack">
        <table>
          <tbody>
            <tr>
              <th>Type</th>
              <td>{item.type}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                <span className={`badge ${item.status}`}>{item.status}</span>
              </td>
            </tr>
            <tr>
              <th>Priority</th>
              <td>
                <span className={`badge priority-badge priority-${item.priority}`}>{item.priority}</span>
              </td>
            </tr>
            <tr>
              <th>Title</th>
              <td>{item.title}</td>
            </tr>
            <tr>
              <th>Description</th>
              <td style={{ whiteSpace: "pre-wrap" }}>{item.description}</td>
            </tr>
            <tr>
              <th>Workflow Name</th>
              <td>{item.workflowName ?? "-"}</td>
            </tr>
            <tr>
              <th>Workflow Reference</th>
              <td>
                {item.workflowReference &&
                (item.workflowReference.startsWith("http://") ||
                  item.workflowReference.startsWith("https://")) ? (
                  <a href={item.workflowReference} target="_blank" rel="noreferrer">
                    {item.workflowReference}
                  </a>
                ) : (
                  item.workflowReference ?? "-"
                )}
              </td>
            </tr>
            <tr>
              <th>Requested Workflow Name</th>
              <td>{item.requestedWorkflowName ?? "-"}</td>
            </tr>
            <tr>
              <th>Business Goal</th>
              <td style={{ whiteSpace: "pre-wrap" }}>{item.businessGoal ?? "-"}</td>
            </tr>
            <tr>
              <th>Expected Trigger</th>
              <td style={{ whiteSpace: "pre-wrap" }}>{item.expectedTrigger ?? "-"}</td>
            </tr>
            <tr>
              <th>Proposed By</th>
              <td>{item.proposedBy}</td>
            </tr>
            <tr>
              <th>Assignee</th>
              <td>{item.assigneeUsername ?? "-"}</td>
            </tr>
            <tr>
              <th>Source Incident</th>
              <td>
                {item.sourceIncident ? (
                  <Link href={`/incidents/${item.sourceIncident.id}`}>{item.sourceIncident.id}</Link>
                ) : (
                  "-"
                )}
              </td>
            </tr>
            <tr>
              <th>Created At (UTC)</th>
              <td>{item.createdAt.toISOString()}</td>
            </tr>
            <tr>
              <th>Updated At (UTC)</th>
              <td>{item.updatedAt.toISOString()}</td>
            </tr>
          </tbody>
        </table>
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

      <section className="card stack">
        <h2>Event Timeline</h2>
        {item.events.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time (UTC)</th>
                <th>Event</th>
                <th>From Status</th>
                <th>To Status</th>
                <th>From Assignee</th>
                <th>To Assignee</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {item.events.map((event) => (
                <tr key={event.id}>
                  <td>{event.createdAt.toISOString()}</td>
                  <td>{event.eventType}</td>
                  <td>{event.fromStatus ?? "-"}</td>
                  <td>{event.toStatus ?? "-"}</td>
                  <td>{event.fromAssignee ?? "-"}</td>
                  <td>{event.toAssignee ?? "-"}</td>
                  <td>{event.actorUsername}</td>
                  <td>{event.actorRole}</td>
                  <td>{event.actionReason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </AppShell>
  );
}
