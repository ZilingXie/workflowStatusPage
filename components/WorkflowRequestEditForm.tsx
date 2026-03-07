"use client";

import { IncidentPriority, WorkflowRequestStatus, WorkflowRequestType } from "@prisma/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { withBasePath } from "@/lib/basePath";
import { TYPE_COLOR_MAP } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Props = {
  requestId: string;
  type: WorkflowRequestType;
  status: WorkflowRequestStatus;
  proposedBy: string;
  assigneeUsername: string | null;
  createdAtIso: string;
  sourceIncidentId: string | null;
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

function displayTypeLabel(value: WorkflowRequestType): string {
  return value === WorkflowRequestType.IMPROVEMENT ? "Improvement" : "New Workflow";
}

export function WorkflowRequestEditForm({
  requestId,
  type,
  status,
  proposedBy,
  assigneeUsername,
  createdAtIso,
  sourceIncidentId,
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

  const initialState = useMemo<FormState>(
    () => ({
      title: initialTitle,
      description: initialDescription,
      workflowName: initialWorkflowName ?? "",
      workflowReference: initialWorkflowReference ?? "",
      requestedWorkflowName: initialRequestedWorkflowName ?? "",
      businessGoal: initialBusinessGoal ?? "",
      expectedTrigger: initialExpectedTrigger ?? "",
      priority: initialPriority,
      updateReason: ""
    }),
    [
      initialTitle,
      initialDescription,
      initialWorkflowName,
      initialWorkflowReference,
      initialRequestedWorkflowName,
      initialBusinessGoal,
      initialExpectedTrigger,
      initialPriority
    ]
  );

  const [state, setState] = useState<FormState>(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(initialState);
    setIsEditing(false);
    setError(null);
  }, [initialState]);

  const isImprovement = type === WorkflowRequestType.IMPROVEMENT;
  const isNewWorkflow = type === WorkflowRequestType.NEW_WORKFLOW;

  function onStartEdit(): void {
    setState(initialState);
    setIsEditing(true);
    setError(null);
  }

  function onCancelEdit(): void {
    setState(initialState);
    setIsEditing(false);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canEdit || !isEditing || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath(`/api/v1/workflow-requests/${requestId}`), {
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

      setIsEditing(false);
      setState((prev) => ({ ...prev, updateReason: "" }));
      router.refresh();
    } catch {
      setError("Failed to update request");
    } finally {
      setLoading(false);
    }
  }

  const workflowDisplayValue = state.workflowName || state.requestedWorkflowName || "-";

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">{state.title}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                TYPE_COLOR_MAP[type]
              )}
            >
              {displayTypeLabel(type)}
            </span>
            <StatusBadge status={status} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{requestId}</p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="relative">
              <select
                value={state.priority}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, priority: event.target.value as IncidentPriority }))
                }
                disabled={loading}
                className="h-9 w-[74px] appearance-none rounded-md border border-input bg-input/50 px-2 pr-6 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value={IncidentPriority.L}>L</option>
                <option value={IncidentPriority.M}>M</option>
                <option value={IncidentPriority.H}>H</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                ▾
              </span>
            </div>
          ) : (
            <PriorityBadge priority={state.priority} />
          )}

          {canEdit && !isEditing ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="rounded-md border border-input bg-secondary/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-border/50 bg-secondary/20 p-4 sm:grid-cols-4">
        <InfoItem label="Workflow" value={workflowDisplayValue} />
        <InfoItem label="Created By" value={proposedBy} />
        <InfoItem label="Assignee" value={assigneeUsername ?? "Unassigned"} />
        <InfoItem label="Created At (UTC)" value={createdAtIso} />
      </div>

      {isEditing ? (
        <form className="mt-4 flex flex-col gap-3 rounded-lg border border-border/50 bg-secondary/20 p-4" onSubmit={onSubmit}>
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
                  onChange={(event) =>
                    setState((prev) => ({ ...prev, workflowReference: event.target.value }))
                  }
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
                  onChange={(event) =>
                    setState((prev) => ({ ...prev, requestedWorkflowName: event.target.value }))
                  }
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={loading}
              className="rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-lg border border-border/50 bg-secondary/20 p-4">
          <p className="text-xs text-muted-foreground">Description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{state.description}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Workflow Reference</p>
              {state.workflowReference &&
              (state.workflowReference.startsWith("http://") || state.workflowReference.startsWith("https://")) ? (
                <a
                  href={state.workflowReference}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {state.workflowReference}
                </a>
              ) : (
                <p className="text-sm text-foreground">{state.workflowReference || "-"}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Source Incident</p>
              {sourceIncidentId ? (
                <Link href={withBasePath(`/incidents/${sourceIncidentId}`)} className="text-sm text-primary hover:underline">
                  {sourceIncidentId}
                </Link>
              ) : (
                <p className="text-sm text-foreground">-</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Business Goal</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{state.businessGoal || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected Trigger</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{state.expectedTrigger || "-"}</p>
            </div>
          </div>
        </div>
      )}

      {!canEdit ? (
        <p className="mt-3 text-sm text-muted-foreground">Editable by ADMIN, or by proposer when status is PROPOSED.</p>
      ) : null}
    </section>
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
