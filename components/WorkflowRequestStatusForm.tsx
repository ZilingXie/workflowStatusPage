"use client";

import { UserRole, WorkflowRequestStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  requestId: string;
  status: WorkflowRequestStatus;
  role: UserRole;
};

const NEXT_STATUSES: Record<WorkflowRequestStatus, WorkflowRequestStatus[]> = {
  PROPOSED: [WorkflowRequestStatus.TRIAGED],
  TRIAGED: [WorkflowRequestStatus.PLANNED, WorkflowRequestStatus.REJECTED],
  PLANNED: [WorkflowRequestStatus.IN_PROGRESS, WorkflowRequestStatus.REJECTED],
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
      const response = await fetch(`/api/v1/workflow-requests/${requestId}/status`, {
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
      <section className="card stack">
        <h3>Status Actions</h3>
        <p className="muted">Only ADMIN users can change workflow request status.</p>
      </section>
    );
  }

  if (transitions.length === 0) {
    return (
      <section className="card stack">
        <h3>Status Actions</h3>
        <p className="muted">No available transition for current terminal status.</p>
      </section>
    );
  }

  const needsReason = toStatus === WorkflowRequestStatus.DONE || toStatus === WorkflowRequestStatus.REJECTED;

  return (
    <section className="card stack">
      <h3>Status Actions</h3>
      <form className="stack" onSubmit={onSubmit}>
        <label className="stack" style={{ gap: 4 }}>
          <span>Move to</span>
          <select
            value={toStatus}
            onChange={(event) => setToStatus(event.target.value as WorkflowRequestStatus)}
            disabled={loading}
          >
            {transitions.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>

        <label className="stack" style={{ gap: 4 }}>
          <span>Action reason {needsReason ? "(required)" : "(optional)"}</span>
          <textarea
            value={actionReason}
            onChange={(event) => setActionReason(event.target.value)}
            placeholder="Why this transition is made"
            required={needsReason}
            disabled={loading}
          />
        </label>

        {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

        <button
          type="submit"
          disabled={loading || !toStatus || (needsReason && actionReason.trim().length === 0)}
        >
          {loading ? "Updating..." : "Update Status"}
        </button>
      </form>
    </section>
  );
}
