"use client";

import { IncidentPriority, WorkflowRequestType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/basePath";

type Props = {
  initialType: WorkflowRequestType;
  initialTitle?: string;
  initialDescription?: string;
  initialWorkflowName?: string;
  initialWorkflowReference?: string;
  initialRequestedWorkflowName?: string;
  initialBusinessGoal?: string;
  initialExpectedTrigger?: string;
  sourceIncidentId?: string;
  isAdmin: boolean;
  assigneeOptions: string[];
};

type FormState = {
  type: WorkflowRequestType;
  title: string;
  description: string;
  workflowName: string;
  workflowReference: string;
  requestedWorkflowName: string;
  businessGoal: string;
  expectedTrigger: string;
  priority: IncidentPriority;
  assigneeUsername: string;
};

export function WorkflowRequestCreateForm({
  initialType,
  initialTitle,
  initialDescription,
  initialWorkflowName,
  initialWorkflowReference,
  initialRequestedWorkflowName,
  initialBusinessGoal,
  initialExpectedTrigger,
  sourceIncidentId,
  isAdmin,
  assigneeOptions
}: Props): JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    type: initialType,
    title: initialTitle ?? "",
    description: initialDescription ?? "",
    workflowName: initialWorkflowName ?? "",
    workflowReference: initialWorkflowReference ?? "",
    requestedWorkflowName: initialRequestedWorkflowName ?? "",
    businessGoal: initialBusinessGoal ?? "",
    expectedTrigger: initialExpectedTrigger ?? "",
    priority: IncidentPriority.L,
    assigneeUsername: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        type: state.type,
        title: state.title,
        description: state.description,
        priority: state.priority,
        workflowName: state.workflowName,
        workflowReference: state.workflowReference,
        requestedWorkflowName: state.requestedWorkflowName,
        businessGoal: state.businessGoal,
        expectedTrigger: state.expectedTrigger,
        ...(sourceIncidentId ? { sourceIncidentId } : {}),
        ...(isAdmin && state.assigneeUsername ? { assigneeUsername: state.assigneeUsername } : {})
      };

      const response = await fetch(withBasePath("/api/v1/workflow-requests"), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Failed to create request");
        setLoading(false);
        return;
      }

      const id = data?.item?.id;
      if (!id || typeof id !== "string") {
        setError("Create succeeded but response is invalid");
        setLoading(false);
        return;
      }

      router.push(`/workflow-requests/${id}`);
      router.refresh();
    } catch {
      setError("Failed to create request");
    } finally {
      setLoading(false);
    }
  }

  const isImprovement = state.type === WorkflowRequestType.IMPROVEMENT;
  const isNewWorkflow = state.type === WorkflowRequestType.NEW_WORKFLOW;

  return (
    <form
      className="flex max-w-2xl flex-col gap-5 rounded-lg border border-border bg-card p-6"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Title</label>
        <input
          value={state.title}
          onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Short request title"
          required
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Type</label>
        <select
          value={state.type}
          onChange={(event) =>
            setState((prev) => ({
              ...prev,
              type: event.target.value as WorkflowRequestType
            }))
          }
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={WorkflowRequestType.IMPROVEMENT}>Improvement</option>
          <option value={WorkflowRequestType.NEW_WORKFLOW}>New Workflow</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          value={state.description}
          onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Describe problem, goal and expected outcome"
          required
          disabled={loading}
          rows={6}
          className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isImprovement ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Workflow Name</label>
            <input
              value={state.workflowName}
              onChange={(event) =>
                setState((prev) => ({ ...prev, workflowName: event.target.value }))
              }
              placeholder="Existing workflow name"
              required
              disabled={loading}
              className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Workflow Reference (optional)</label>
            <input
              value={state.workflowReference}
              onChange={(event) =>
                setState((prev) => ({ ...prev, workflowReference: event.target.value }))
              }
              placeholder="Workflow URL or ID"
              disabled={loading}
              className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </>
      ) : null}

      {isNewWorkflow ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Requested Workflow Name</label>
            <input
              value={state.requestedWorkflowName}
              onChange={(event) =>
                setState((prev) => ({ ...prev, requestedWorkflowName: event.target.value }))
              }
              placeholder="Name of new workflow"
              required
              disabled={loading}
              className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Business Goal</label>
            <textarea
              value={state.businessGoal}
              onChange={(event) =>
                setState((prev) => ({ ...prev, businessGoal: event.target.value }))
              }
              placeholder="What business outcome this workflow should deliver"
              required
              disabled={loading}
              rows={4}
              className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Expected Trigger</label>
            <textarea
              value={state.expectedTrigger}
              onChange={(event) =>
                setState((prev) => ({ ...prev, expectedTrigger: event.target.value }))
              }
              placeholder="When/how this workflow should be triggered"
              required
              disabled={loading}
              rows={4}
              className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Priority</label>
        <select
          value={state.priority}
          onChange={(event) =>
            setState((prev) => ({ ...prev, priority: event.target.value as IncidentPriority }))
          }
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={IncidentPriority.L}>L</option>
          <option value={IncidentPriority.M}>M</option>
          <option value={IncidentPriority.H}>H</option>
        </select>
      </div>

      {sourceIncidentId ? (
        <div className="rounded-md border border-border/50 bg-secondary/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Linked to incident: <span className="font-mono font-medium text-foreground">{sourceIncidentId}</span>
          </p>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Assignee (optional)</label>
          <select
            value={state.assigneeUsername}
            onChange={(event) =>
              setState((prev) => ({ ...prev, assigneeUsername: event.target.value }))
            }
            disabled={loading}
            className="h-10 rounded-md border border-input bg-input/50 px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Request"}
      </button>
    </form>
  );
}
