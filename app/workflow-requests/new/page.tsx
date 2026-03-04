import { UserRole, WorkflowRequestType } from "@prisma/client";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { WorkflowRequestCreateForm } from "@/components/WorkflowRequestCreateForm";
import { getConfiguredUsernames } from "@/lib/auth/users";
import { requireServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db";

type SearchParams = Record<string, string | string[] | undefined>;

function asString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeType(value: string | undefined): WorkflowRequestType {
  if (value === WorkflowRequestType.NEW_WORKFLOW) {
    return WorkflowRequestType.NEW_WORKFLOW;
  }

  return WorkflowRequestType.IMPROVEMENT;
}

export default async function NewWorkflowRequestPage({
  searchParams = {}
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const session = requireServerSession();

  const sourceIncidentId = asString(searchParams.sourceIncidentId);
  const incident = sourceIncidentId
    ? await prisma.incident.findUnique({
        where: {
          id: sourceIncidentId
        },
        select: {
          id: true,
          workflowName: true,
          workflowId: true,
          errorMessage: true
        }
      })
    : null;

  const initialType = normalizeType(asString(searchParams.type));
  const assigneeOptions = getConfiguredUsernames();
  const initialWorkflowName = asString(searchParams.workflowName) ?? incident?.workflowName ?? "";
  const initialWorkflowReference =
    asString(searchParams.workflowReference) ?? incident?.workflowId ?? "";

  const initialTitle =
    asString(searchParams.title) ??
    (initialType === WorkflowRequestType.IMPROVEMENT && initialWorkflowName
      ? `Improve ${initialWorkflowName}`
      : "");

  const initialDescription =
    asString(searchParams.description) ??
    (incident?.errorMessage
      ? `Triggered from incident ${incident.id}. Related failure summary: ${incident.errorMessage}`
      : "");

  return (
    <AppShell
      session={session}
      activeNav="workflow-requests"
      title="New Workflow Request"
      subtitle="Create improvement request or new workflow demand"
      topRightActions={<Link href="/workflow-requests">Back to list</Link>}
    >
      {sourceIncidentId && !incident ? (
        <section className="card stack">
          <h3>Linked Incident</h3>
          <p className="muted">
            <code>sourceIncidentId={sourceIncidentId}</code> was provided but no incident is found.
            You can still create a request without linkage.
          </p>
        </section>
      ) : null}

      <WorkflowRequestCreateForm
        initialType={initialType}
        initialTitle={initialTitle}
        initialDescription={initialDescription}
        initialWorkflowName={initialWorkflowName}
        initialWorkflowReference={initialWorkflowReference}
        initialRequestedWorkflowName={asString(searchParams.requestedWorkflowName)}
        initialBusinessGoal={asString(searchParams.businessGoal)}
        initialExpectedTrigger={asString(searchParams.expectedTrigger)}
        sourceIncidentId={incident?.id}
        isAdmin={session.role === UserRole.ADMIN}
        assigneeOptions={assigneeOptions}
      />
    </AppShell>
  );
}
