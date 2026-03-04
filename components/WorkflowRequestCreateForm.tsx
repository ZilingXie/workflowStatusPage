"use client";

import { IncidentPriority, WorkflowRequestType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

      const response = await fetch("/api/v1/workflow-requests", {
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
    <form className="card stack" onSubmit={onSubmit}>
      <h2>Create Workflow Request</h2>

      <label className="stack" style={{ gap: 4 }}>
        <span>Type</span>
        <select
          value={state.type}
          onChange={(event) =>
            setState((prev) => ({
              ...prev,
              type: event.target.value as WorkflowRequestType
            }))
          }
          disabled={loading}
        >
          <option value={WorkflowRequestType.IMPROVEMENT}>IMPROVEMENT</option>
          <option value={WorkflowRequestType.NEW_WORKFLOW}>NEW_WORKFLOW</option>
        </select>
      </label>

      <label className="stack" style={{ gap: 4 }}>
        <span>Title</span>
        <input
          value={state.title}
          onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Short request title"
          required
          disabled={loading}
        />
      </label>

      <label className="stack" style={{ gap: 4 }}>
        <span>Description</span>
        <textarea
          value={state.description}
          onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Describe problem, goal and expected outcome"
          required
          disabled={loading}
        />
      </label>

      {isImprovement ? (
        <>
          <label className="stack" style={{ gap: 4 }}>
            <span>Workflow Name</span>
            <input
              value={state.workflowName}
              onChange={(event) =>
                setState((prev) => ({ ...prev, workflowName: event.target.value }))
              }
              placeholder="Existing workflow name"
              required
              disabled={loading}
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>Workflow Reference (optional)</span>
            <input
              value={state.workflowReference}
              onChange={(event) =>
                setState((prev) => ({ ...prev, workflowReference: event.target.value }))
              }
              placeholder="Workflow URL or ID"
              disabled={loading}
            />
          </label>
        </>
      ) : null}

      {isNewWorkflow ? (
        <>
          <label className="stack" style={{ gap: 4 }}>
            <span>Requested Workflow Name</span>
            <input
              value={state.requestedWorkflowName}
              onChange={(event) =>
                setState((prev) => ({ ...prev, requestedWorkflowName: event.target.value }))
              }
              placeholder="Name of new workflow"
              required
              disabled={loading}
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>Business Goal</span>
            <textarea
              value={state.businessGoal}
              onChange={(event) =>
                setState((prev) => ({ ...prev, businessGoal: event.target.value }))
              }
              placeholder="What business outcome this workflow should deliver"
              required
              disabled={loading}
            />
          </label>

          <label className="stack" style={{ gap: 4 }}>
            <span>Expected Trigger</span>
            <textarea
              value={state.expectedTrigger}
              onChange={(event) =>
                setState((prev) => ({ ...prev, expectedTrigger: event.target.value }))
              }
              placeholder="When/how this workflow should be triggered"
              required
              disabled={loading}
            />
          </label>
        </>
      ) : null}

      <label className="stack" style={{ gap: 4 }}>
        <span>Priority</span>
        <select
          value={state.priority}
          onChange={(event) =>
            setState((prev) => ({ ...prev, priority: event.target.value as IncidentPriority }))
          }
          disabled={loading}
        >
          <option value={IncidentPriority.L}>L</option>
          <option value={IncidentPriority.M}>M</option>
          <option value={IncidentPriority.H}>H</option>
        </select>
      </label>

      {sourceIncidentId ? (
        <label className="stack" style={{ gap: 4 }}>
          <span>Source Incident ID</span>
          <input value={sourceIncidentId} readOnly />
        </label>
      ) : null}

      {isAdmin ? (
        <label className="stack" style={{ gap: 4 }}>
          <span>Assignee (optional)</span>
          <select
            value={state.assigneeUsername}
            onChange={(event) =>
              setState((prev) => ({ ...prev, assigneeUsername: event.target.value }))
            }
            disabled={loading}
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Request"}
      </button>
    </form>
  );
}
