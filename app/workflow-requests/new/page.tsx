import { ArrowLeft } from "lucide-react";
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
  const initialWorkflowReference = asString(searchParams.workflowReference) ?? incident?.workflowId ?? "";

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
    <AppShell session={session} activeNav="workflow-requests">
      <div className="flex flex-col gap-6">
        <Link
          href="/workflow-requests"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workflow Requests
        </Link>

        <div>
          <h1 className="text-xl font-semibold text-foreground">New Workflow Request</h1>
          <p className="text-sm text-muted-foreground">Submit a new improvement request or workflow proposal</p>
        </div>

        {sourceIncidentId && !incident ? (
          <section className="max-w-2xl rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Linked Incident</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <code>sourceIncidentId={sourceIncidentId}</code> was provided but no incident is found.
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
      </div>
    </AppShell>
  );
}
