"use client";

import { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  requestId: string;
  assigneeUsername: string | null;
  role: UserRole;
  assigneeOptions: string[];
};

export function WorkflowRequestAssigneeForm({
  requestId,
  assigneeUsername,
  role,
  assigneeOptions
}: Props): JSX.Element {
  const router = useRouter();
  const [nextAssignee, setNextAssignee] = useState(assigneeUsername ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workflow-requests/${requestId}/assignee`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          assigneeUsername: nextAssignee.length > 0 ? nextAssignee : null
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to update assignee");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to update assignee");
    } finally {
      setLoading(false);
    }
  }

  if (role !== UserRole.ADMIN) {
    return (
      <section className="card stack">
        <h3>Assignee</h3>
        <p>Current: {assigneeUsername ?? "-"}</p>
        <p className="muted">Only ADMIN users can change assignee.</p>
      </section>
    );
  }

  return (
    <section className="card stack">
      <h3>Assignee</h3>
      <form className="stack" onSubmit={onSubmit}>
        <label className="stack" style={{ gap: 4 }}>
          <span>Assigned To</span>
          <select
            value={nextAssignee}
            onChange={(event) => setNextAssignee(event.target.value)}
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

        {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Update Assignee"}
        </button>
      </form>
    </section>
  );
}
