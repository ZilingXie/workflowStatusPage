"use client";

import { IncidentStatus, UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  incidentId: string;
  status: IncidentStatus;
  role: UserRole;
};

export function IncidentStatusForm({ incidentId, status, role }: Props): JSX.Element {
  const router = useRouter();
  const [resolutionReason, setResolutionReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(body: Record<string, unknown>): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const message = await response.json().catch(() => null);
        setError(message?.error ?? "Status update failed");
        return;
      }

      setResolutionReason("");
      setReopenReason("");
      setActionReason("");
      router.refresh();
    } catch {
      setError("Status update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      <h3>Status Actions</h3>
      {status === IncidentStatus.OPEN ? (
        <div className="stack">
          <label className="stack">
            <span>Action reason (optional, default: start working)</span>
            <textarea
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              placeholder="Investigation context"
            />
          </label>
          <button
            type="button"
            onClick={() => updateStatus({ toStatus: IncidentStatus.IN_PROGRESS, actionReason })}
            disabled={loading}
          >
            Move to IN_PROGRESS
          </button>
        </div>
      ) : null}

      {status === IncidentStatus.IN_PROGRESS ? (
        <div className="stack">
          <label className="stack">
            <span>Resolution reason (required)</span>
            <textarea
              value={resolutionReason}
              onChange={(event) => setResolutionReason(event.target.value)}
              placeholder="Describe the fix"
              required
            />
          </label>
          <button
            type="button"
            onClick={() => updateStatus({ toStatus: IncidentStatus.RESOLVED, resolutionReason })}
            disabled={loading || resolutionReason.trim().length === 0}
          >
            Resolve Incident
          </button>
        </div>
      ) : null}

      {status === IncidentStatus.RESOLVED && role === UserRole.ADMIN ? (
        <div className="stack">
          <label className="stack">
            <span>Reopen reason (required)</span>
            <textarea
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              placeholder="Why this incident is reopened"
              required
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => updateStatus({ toStatus: IncidentStatus.OPEN, reopenReason })}
            disabled={loading || reopenReason.trim().length === 0}
          >
            Reopen Incident
          </button>
        </div>
      ) : null}

      {status === IncidentStatus.RESOLVED && role !== UserRole.ADMIN ? (
        <p className="muted">Only ADMIN users can reopen a resolved incident.</p>
      ) : null}

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
    </div>
  );
}
