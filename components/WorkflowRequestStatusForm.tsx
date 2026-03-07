"use client";

import { UserRole, WorkflowRequestStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { withBasePath } from "@/lib/basePath";

type Props = {
  requestId: string;
  status: WorkflowRequestStatus;
  role: UserRole;
};

const NEXT_STATUSES: Record<WorkflowRequestStatus, WorkflowRequestStatus[]> = {
  PROPOSED: [WorkflowRequestStatus.CLARIFIED],
  CLARIFIED: [WorkflowRequestStatus.IN_PROGRESS, WorkflowRequestStatus.REJECTED],
  IN_PROGRESS: [WorkflowRequestStatus.DONE, WorkflowRequestStatus.REJECTED],
  DONE: [],
  REJECTED: []
};

export function WorkflowRequestStatusForm({ requestId, status, role }: Props): JSX.Element {
  const router = useRouter();
  const transitions = useMemo(() => NEXT_STATUSES[status], [status]);
  const [toStatus, setToStatus] = useState<WorkflowRequestStatus | "">(transitions[0] ?? "");
  const [actionReason, setActionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!toStatus) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath(`/api/v1/workflow-requests/${requestId}/status`), {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          toStatus,
          actionReason
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to update status");
        setLoading(false);
        return;
      }

      setActionReason("");
      router.refresh();
    } catch {
      setError("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  if (role !== UserRole.ADMIN) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Status Actions</h3>
        <p className="mt-2 text-sm text-muted-foreground">Only ADMIN users can change workflow request status.</p>
      </section>
    );
  }

  if (transitions.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Status Actions</h3>
        <p className="mt-2 text-sm text-muted-foreground">No available transition for current terminal status.</p>
      </section>
    );
  }

  const needsReason = toStatus === WorkflowRequestStatus.DONE || toStatus === WorkflowRequestStatus.REJECTED;

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground">Status Actions</h3>
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Move to</label>
          <select
            value={toStatus}
            onChange={(event) => setToStatus(event.target.value as WorkflowRequestStatus)}
            disabled={loading}
            className="h-9 rounded-md border border-input bg-input/50 px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {transitions.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Action reason {needsReason ? "(required)" : "(optional)"}</label>
          <textarea
            value={actionReason}
            onChange={(event) => setActionReason(event.target.value)}
            placeholder="Why this transition is made"
            required={needsReason}
            disabled={loading}
            className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || !toStatus || (needsReason && actionReason.trim().length === 0)}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update Status"}
        </button>
      </form>
    </section>
  );
}
