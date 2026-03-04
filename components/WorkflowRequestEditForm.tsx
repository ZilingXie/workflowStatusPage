"use client";

import { IncidentPriority, WorkflowRequestType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  requestId: string;
  type: WorkflowRequestType;
  canEdit: boolean;
  initialTitle: string;
  initialDescription: string;
  initialWorkflowName: string | null;
  initialWorkflowReference: string | null;
  initialRequestedWorkflowName: string | null;
  initialBusinessGoal: string | null;
  initialExpectedTrigger: string | null;
  initialPriority: IncidentPriority;
};

type FormState = {
  title: string;
  description: string;
  workflowName: string;
  workflowReference: string;
  requestedWorkflowName: string;
  businessGoal: string;
  expectedTrigger: string;
  priority: IncidentPriority;
  updateReason: string;
};

export function WorkflowRequestEditForm({
  requestId,
  type,
  canEdit,
  initialTitle,
  initialDescription,
  initialWorkflowName,
  initialWorkflowReference,
  initialRequestedWorkflowName,
  initialBusinessGoal,
  initialExpectedTrigger,
  initialPriority
}: Props): JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    title: initialTitle,
    description: initialDescription,
    workflowName: initialWorkflowName ?? "",
    workflowReference: initialWorkflowReference ?? "",
    requestedWorkflowName: initialRequestedWorkflowName ?? "",
    businessGoal: initialBusinessGoal ?? "",
    expectedTrigger: initialExpectedTrigger ?? "",
    priority: initialPriority,
    updateReason: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canEdit || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workflow-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: state.title,
          description: state.description,
          workflowName: state.workflowName,
          workflowReference: state.workflowReference,
          requestedWorkflowName: state.requestedWorkflowName,
          businessGoal: state.businessGoal,
          expectedTrigger: state.expectedTrigger,
          priority: state.priority,
          updateReason: state.updateReason
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to update request");
        setLoading(false);
        return;
      }

      setState((prev) => ({ ...prev, updateReason: "" }));
      router.refresh();
    } catch {
      setError("Failed to update request");
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Edit Base Fields</h3>
        <p className="mt-2 text-sm text-muted-foreground">Editable by ADMIN, or by proposer when status is PROPOSED.</p>
      </section>
    );
  }

  const isImprovement = type === WorkflowRequestType.IMPROVEMENT;
  const isNewWorkflow = type === WorkflowRequestType.NEW_WORKFLOW;

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground">Edit Base Fields</h3>
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <FormField label="Title">
          <input
            value={state.title}
            onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
            required
            disabled={loading}
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={state.description}
            onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
            required
            disabled={loading}
            className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        {isImprovement ? (
          <>
            <FormField label="Workflow Name">
              <input
                value={state.workflowName}
                onChange={(event) => setState((prev) => ({ ...prev, workflowName: event.target.value }))}
                required
                disabled={loading}
                className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Workflow Reference">
              <input
                value={state.workflowReference}
                onChange={(event) => setState((prev) => ({ ...prev, workflowReference: event.target.value }))}
                disabled={loading}
                className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
          </>
        ) : null}

        {isNewWorkflow ? (
          <>
            <FormField label="Requested Workflow Name">
              <input
                value={state.requestedWorkflowName}
                onChange={(event) => setState((prev) => ({ ...prev, requestedWorkflowName: event.target.value }))}
                required
                disabled={loading}
                className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Business Goal">
              <textarea
                value={state.businessGoal}
                onChange={(event) => setState((prev) => ({ ...prev, businessGoal: event.target.value }))}
                required
                disabled={loading}
                className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>

            <FormField label="Expected Trigger">
              <textarea
                value={state.expectedTrigger}
                onChange={(event) => setState((prev) => ({ ...prev, expectedTrigger: event.target.value }))}
                required
                disabled={loading}
                className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </FormField>
          </>
        ) : null}

        <FormField label="Priority">
          <select
            value={state.priority}
            onChange={(event) => setState((prev) => ({ ...prev, priority: event.target.value as IncidentPriority }))}
            disabled={loading}
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value={IncidentPriority.L}>L</option>
            <option value={IncidentPriority.M}>M</option>
            <option value={IncidentPriority.H}>H</option>
          </select>
        </FormField>

        <FormField label="Update reason (optional)">
          <textarea
            value={state.updateReason}
            onChange={(event) => setState((prev) => ({ ...prev, updateReason: event.target.value }))}
            placeholder="Why this update is made"
            disabled={loading}
            className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}

function FormField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
