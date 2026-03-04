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
    <section className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground">Status Actions</h3>

      <div className="mt-4 flex flex-col gap-4">
        {status === IncidentStatus.OPEN ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">Action reason (optional)</label>
            <textarea
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              placeholder="Investigation context"
              className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => {
                void updateStatus({ toStatus: IncidentStatus.IN_PROGRESS, actionReason });
              }}
              disabled={loading}
              className="w-fit rounded-md bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
            >
              Move to IN_PROGRESS
            </button>
          </div>
        ) : null}

        {status === IncidentStatus.IN_PROGRESS ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">Resolution reason (required)</label>
            <textarea
              value={resolutionReason}
              onChange={(event) => setResolutionReason(event.target.value)}
              placeholder="Describe the fix"
              className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <button
              type="button"
              onClick={() => {
                void updateStatus({ toStatus: IncidentStatus.RESOLVED, resolutionReason });
              }}
              disabled={loading || resolutionReason.trim().length === 0}
              className="w-fit rounded-md bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
            >
              Resolve Incident
            </button>
          </div>
        ) : null}

        {status === IncidentStatus.RESOLVED && role === UserRole.ADMIN ? (
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">Reopen reason (required)</label>
            <textarea
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              placeholder="Why this incident is reopened"
              className="rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <button
              type="button"
              onClick={() => {
                void updateStatus({ toStatus: IncidentStatus.OPEN, reopenReason });
              }}
              disabled={loading || reopenReason.trim().length === 0}
              className="w-fit rounded-md bg-red-500/15 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
            >
              Reopen Incident
            </button>
          </div>
        ) : null}

        {status === IncidentStatus.RESOLVED && role !== UserRole.ADMIN ? (
          <p className="text-sm text-muted-foreground">Only ADMIN users can reopen a resolved incident.</p>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
