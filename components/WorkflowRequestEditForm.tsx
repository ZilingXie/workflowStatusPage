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
      <section className="card stack">
        <h3>Edit Base Fields</h3>
        <p className="muted">
          Editable by ADMIN, or by proposer when status is PROPOSED.
        </p>
      </section>
    );
  }

  const isImprovement = type === WorkflowRequestType.IMPROVEMENT;
  const isNewWorkflow = type === WorkflowRequestType.NEW_WORKFLOW;

  return (
    <section className="card stack">
      <h3>Edit Base Fields</h3>
      <form className="stack" onSubmit={onSubmit}>
        <label className="stack" style={{ gap: 4 }}>
          <span>Title</span>
          <input
            value={state.title}
            onChange={(event) => setState((prev) => ({ ...prev, title: event.target.value }))}
            required
            disabled={loading}
          />
        </label>

        <label className="stack" style={{ gap: 4 }}>
          <span>Description</span>
          <textarea
            value={state.description}
            onChange={(event) =>
              setState((prev) => ({ ...prev, description: event.target.value }))
            }
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
                required
                disabled={loading}
              />
            </label>

            <label className="stack" style={{ gap: 4 }}>
              <span>Workflow Reference</span>
              <input
                value={state.workflowReference}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, workflowReference: event.target.value }))
                }
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

        <label className="stack" style={{ gap: 4 }}>
          <span>Update reason (optional)</span>
          <textarea
            value={state.updateReason}
            onChange={(event) =>
              setState((prev) => ({ ...prev, updateReason: event.target.value }))
            }
            placeholder="Why this update is made"
            disabled={loading}
          />
        </label>

        {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}
