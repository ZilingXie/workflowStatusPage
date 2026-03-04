"use client";

import { IncidentPriority } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  incidentId: string;
  initialPriority: IncidentPriority;
};

const OPTIONS: IncidentPriority[] = [IncidentPriority.L, IncidentPriority.M, IncidentPriority.H];
const MIN_LOADING_MS = 1000;

export function IncidentPrioritySelect({ incidentId, initialPriority }: Props): JSX.Element {
  const router = useRouter();
  const [priority, setPriority] = useState<IncidentPriority>(initialPriority);
  const [loading, setLoading] = useState(false);
  const [pendingPriority, setPendingPriority] = useState<IncidentPriority | null>(null);
  const changeTargets = OPTIONS.filter((option) => option !== priority);

  async function onChange(nextPriority: IncidentPriority): Promise<void> {
    if (nextPriority === priority || loading) {
      return;
    }

    const startedAt = Date.now();
    setLoading(true);
    setPendingPriority(nextPriority);

    try {
      const response = await fetch(`/api/v1/incidents/${incidentId}/priority`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ priority: nextPriority })
      });

      if (!response.ok) {
        return;
      }

      setPriority(nextPriority);
      router.refresh();
    } catch {
      return;
    } finally {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs < MIN_LOADING_MS) {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), MIN_LOADING_MS - elapsedMs);
        });
      }
      setLoading(false);
      setPendingPriority(null);
    }
  }

  return (
    <div className="priority-control" role="group" aria-label="Priority" aria-busy={loading}>
      <span className="priority-current-label">
        Current:{" "}
        <span className={`priority-current-value badge priority-badge priority-${priority}`}>
          {priority}
        </span>
      </span>
      <span className="priority-divider" aria-hidden>
        |
      </span>
      <span className="priority-change-label">Change to</span>
      <div className="priority-actions">
        {changeTargets.map((option) => (
          <button
            type="button"
            key={option}
            aria-label={`Change priority to ${option}`}
            className={`priority-option priority-${option}`}
            disabled={loading}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {loading && pendingPriority ? (
        <span
          className={`priority-loading priority-loading-float priority-${pendingPriority}`}
          role="status"
          aria-live="polite"
        >
          <span className="priority-loading-spinner" aria-hidden />
          Changing to
          <span className={`badge priority-badge priority-${pendingPriority}`}>{pendingPriority}</span>
        </span>
      ) : null}
    </div>
  );
}
